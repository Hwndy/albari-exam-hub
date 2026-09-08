
CREATE OR REPLACE FUNCTION public.sync_assignment_from_enrollment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_ref uuid; v_legacy uuid; v_existing uuid;
BEGIN
  IF current_setting('app.sync_class', true) = 'on' THEN RETURN NEW; END IF;
  IF NOT NEW.is_current THEN RETURN NEW; END IF;

  v_legacy := COALESCE(
    NEW.legacy_class_id,
    (SELECT a.legacy_class_id FROM public.arms a WHERE a.id = NEW.arm_id),
    (SELECT m.legacy_class_id FROM public.class_structure_map m
      JOIN public.campuses c ON c.code = m.campus_code AND c.id = NEW.campus_id
      JOIN public.class_levels cl ON cl.name = m.level_name AND cl.id = NEW.class_level_id
      LIMIT 1)
  );
  IF v_legacy IS NULL THEN RETURN NEW; END IF;

  SELECT st.user_id INTO v_ref FROM public.students st WHERE st.id = NEW.student_id;
  IF v_ref IS NULL OR NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = v_ref) THEN
    RETURN NEW;
  END IF;

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

REVOKE ALL ON FUNCTION public.resolve_legacy_class(uuid) FROM anon, authenticated, public;
REVOKE ALL ON FUNCTION public.current_academic_year() FROM anon, public;
REVOKE ALL ON FUNCTION public.sync_enrollment_from_assignment() FROM anon, authenticated, public;
REVOKE ALL ON FUNCTION public.sync_assignment_from_enrollment() FROM anon, authenticated, public;
REVOKE ALL ON FUNCTION public.stamp_enrollment_year() FROM anon, authenticated, public;
REVOKE ALL ON FUNCTION public.close_enrollment_on_archive() FROM anon, authenticated, public;
GRANT EXECUTE ON FUNCTION public.current_academic_year() TO authenticated;
