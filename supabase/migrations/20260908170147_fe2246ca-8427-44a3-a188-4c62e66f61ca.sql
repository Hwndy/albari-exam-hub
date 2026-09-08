
-- one current placement per student
DELETE FROM public.student_enrollments a
USING public.student_enrollments b
WHERE a.is_current AND b.is_current AND a.student_id = b.student_id
  AND (a.created_at, a.id) < (b.created_at, b.id);

CREATE UNIQUE INDEX IF NOT EXISTS student_enrollments_one_current
  ON public.student_enrollments (student_id) WHERE is_current;

CREATE OR REPLACE FUNCTION public.current_academic_year()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(
    (SELECT academic_year FROM public.admission_sessions
      ORDER BY is_current DESC NULLS LAST, created_at DESC LIMIT 1),
    to_char(CURRENT_DATE, 'YYYY') || '/' || to_char(CURRENT_DATE + interval '1 year', 'YYYY')
  );
$$;

-- resolve a legacy class id into campus / level / arm
CREATE OR REPLACE FUNCTION public.resolve_legacy_class(_class_id uuid)
RETURNS TABLE(campus_id uuid, class_level_id uuid, arm_id uuid)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT c.id, cl.id, a.id
  FROM public.class_structure_map m
  LEFT JOIN public.campuses c ON c.code = m.campus_code
  LEFT JOIN public.class_levels cl ON cl.name = m.level_name
  LEFT JOIN public.campus_class_offerings o ON o.campus_id = c.id AND o.class_level_id = cl.id
  LEFT JOIN public.arms a ON a.offering_id = o.id AND a.code = m.arm_code
  WHERE m.legacy_class_id = _class_id
  LIMIT 1;
$$;

-- class_assignments -> student_enrollments
CREATE OR REPLACE FUNCTION public.sync_enrollment_from_assignment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_student uuid; r record; cur record; v_year text;
BEGIN
  IF current_setting('app.sync_class', true) = 'on' THEN RETURN NEW; END IF;

  SELECT id INTO v_student FROM public.students
   WHERE user_id = NEW.student_id OR id = NEW.student_id LIMIT 1;
  IF v_student IS NULL THEN RETURN NEW; END IF;

  SELECT * INTO r FROM public.resolve_legacy_class(NEW.class_id);
  v_year := public.current_academic_year();

  SELECT * INTO cur FROM public.student_enrollments
   WHERE student_id = v_student AND is_current LIMIT 1;

  IF cur.id IS NOT NULL
     AND COALESCE(cur.legacy_class_id::text,'') = COALESCE(NEW.class_id::text,'')
  THEN
    RETURN NEW;
  END IF;

  PERFORM set_config('app.sync_class', 'on', true);

  IF cur.id IS NOT NULL THEN
    UPDATE public.student_enrollments
       SET is_current = false, status = 'transferred', updated_at = now()
     WHERE id = cur.id;
  END IF;

  INSERT INTO public.student_enrollments
    (student_id, academic_year, campus_id, class_level_id, arm_id, legacy_class_id,
     student_type, boarding, status, is_current)
  VALUES (v_student, v_year, r.campus_id, r.class_level_id, r.arm_id, NEW.class_id,
     COALESCE(cur.student_type, 'returning'),
     COALESCE(cur.boarding, CASE WHEN (SELECT COALESCE(is_boarder,false) FROM public.students WHERE id = v_student)
                                 THEN 'boarding' ELSE 'day' END),
     'active', true);

  INSERT INTO public.student_movement_log (student_id, event_type, details)
  VALUES (v_student, CASE WHEN cur.id IS NULL THEN 'placed' ELSE 'class_change' END,
          jsonb_build_object('legacy_class_id', NEW.class_id, 'source', 'class_assignment'));

  PERFORM set_config('app.sync_class', 'off', true);
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_sync_enrollment_from_assignment ON public.class_assignments;
CREATE TRIGGER trg_sync_enrollment_from_assignment
AFTER INSERT OR UPDATE OF class_id ON public.class_assignments
FOR EACH ROW EXECUTE FUNCTION public.sync_enrollment_from_assignment();

-- student_enrollments -> class_assignments
CREATE OR REPLACE FUNCTION public.sync_assignment_from_enrollment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_ref uuid; v_legacy uuid; v_existing uuid;
BEGIN
  IF current_setting('app.sync_class', true) = 'on' THEN RETURN NEW; END IF;
  IF NOT NEW.is_current THEN RETURN NEW; END IF;

  IF NEW.academic_year IS NULL THEN
    NEW.academic_year := public.current_academic_year();
  END IF;

  v_legacy := COALESCE(
    NEW.legacy_class_id,
    (SELECT a.legacy_class_id FROM public.arms a WHERE a.id = NEW.arm_id),
    (SELECT m.legacy_class_id FROM public.class_structure_map m
      JOIN public.campuses c ON c.code = m.campus_code AND c.id = NEW.campus_id
      JOIN public.class_levels cl ON cl.name = m.level_name AND cl.id = NEW.class_level_id
      LIMIT 1)
  );
  IF v_legacy IS NULL THEN RETURN NEW; END IF;

  SELECT COALESCE(user_id, id) INTO v_ref FROM public.students WHERE id = NEW.student_id;
  IF v_ref IS NULL THEN RETURN NEW; END IF;

  PERFORM set_config('app.sync_class', 'on', true);
  SELECT id INTO v_existing FROM public.class_assignments WHERE student_id = v_ref LIMIT 1;
  IF v_existing IS NULL THEN
    INSERT INTO public.class_assignments (student_id, class_id) VALUES (v_ref, v_legacy);
  ELSE
    UPDATE public.class_assignments SET class_id = v_legacy WHERE id = v_existing;
  END IF;
  PERFORM set_config('app.sync_class', 'off', true);
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_sync_assignment_from_enrollment ON public.student_enrollments;
CREATE TRIGGER trg_sync_assignment_from_enrollment
AFTER INSERT OR UPDATE OF class_level_id, arm_id, campus_id, legacy_class_id, is_current
ON public.student_enrollments
FOR EACH ROW EXECUTE FUNCTION public.sync_assignment_from_enrollment();

-- stamp academic year before write
CREATE OR REPLACE FUNCTION public.stamp_enrollment_year()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.academic_year IS NULL THEN NEW.academic_year := public.current_academic_year(); END IF;
  NEW.updated_at := now();
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_stamp_enrollment_year ON public.student_enrollments;
CREATE TRIGGER trg_stamp_enrollment_year
BEFORE INSERT OR UPDATE ON public.student_enrollments
FOR EACH ROW EXECUTE FUNCTION public.stamp_enrollment_year();

-- archive closes placement
CREATE OR REPLACE FUNCTION public.close_enrollment_on_archive()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.archived_at IS NOT NULL AND OLD.archived_at IS NULL THEN
    PERFORM set_config('app.sync_class', 'on', true);
    UPDATE public.student_enrollments
       SET is_current = false, status = 'archived', updated_at = now()
     WHERE student_id = NEW.id AND is_current;
    PERFORM set_config('app.sync_class', 'off', true);
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_close_enrollment_on_archive ON public.students;
CREATE TRIGGER trg_close_enrollment_on_archive
AFTER UPDATE OF archived_at ON public.students
FOR EACH ROW EXECUTE FUNCTION public.close_enrollment_on_archive();
