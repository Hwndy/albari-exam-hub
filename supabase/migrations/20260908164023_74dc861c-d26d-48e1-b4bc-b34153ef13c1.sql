CREATE OR REPLACE FUNCTION public.apply_class_structure_map()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE m record; v_campus uuid; v_level uuid; v_offering uuid; v_arm uuid;
        v_enrolled int := 0; v_levels int := 0; s record; v_new boolean; sess record;
        v_year text;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Admins only'; END IF;

  SELECT * INTO sess FROM public.admission_sessions
  ORDER BY is_current DESC NULLS LAST, created_at DESC LIMIT 1;

  v_year := COALESCE(sess.academic_year,
    to_char(now(), 'YYYY') || '/' || to_char(now() + interval '1 year', 'YYYY'));

  FOR m IN SELECT * FROM public.class_structure_map LOOP
    SELECT id INTO v_campus FROM public.campuses WHERE code = m.campus_code;
    IF v_campus IS NULL THEN CONTINUE; END IF;

    INSERT INTO public.class_levels (name, level_order) VALUES (m.level_name, m.level_order)
    ON CONFLICT (name) DO UPDATE SET level_order = EXCLUDED.level_order
    RETURNING id INTO v_level;
    IF v_level IS NULL THEN SELECT id INTO v_level FROM public.class_levels WHERE name = m.level_name; END IF;
    v_levels := v_levels + 1;

    INSERT INTO public.campus_class_offerings (campus_id, class_level_id) VALUES (v_campus, v_level)
    ON CONFLICT (campus_id, class_level_id) DO UPDATE SET is_active = true
    RETURNING id INTO v_offering;

    v_arm := NULL;
    IF m.arm_code IS NOT NULL THEN
      INSERT INTO public.arms (offering_id, code, legacy_class_id) VALUES (v_offering, m.arm_code, m.legacy_class_id)
      ON CONFLICT (offering_id, code) DO UPDATE SET legacy_class_id = EXCLUDED.legacy_class_id, is_active = true
      RETURNING id INTO v_arm;
    END IF;

    FOR s IN
      SELECT st.* FROM public.students st
      WHERE EXISTS (
        SELECT 1 FROM public.class_assignments ca
        WHERE ca.class_id = m.legacy_class_id AND (ca.student_id = st.id OR ca.student_id = st.user_id)
      )
    LOOP
      v_new := false;
      IF sess.id IS NOT NULL AND s.admission_date IS NOT NULL THEN
        v_new := s.admission_date >= sess.start_date AND (sess.end_date IS NULL OR s.admission_date <= sess.end_date);
      END IF;

      IF EXISTS (SELECT 1 FROM public.student_enrollments e WHERE e.student_id = s.id AND e.is_current) THEN
        UPDATE public.student_enrollments SET
          campus_id = v_campus, class_level_id = v_level, arm_id = v_arm,
          legacy_class_id = m.legacy_class_id,
          student_type = CASE WHEN v_new THEN 'new' ELSE 'returning' END,
          boarding = CASE WHEN COALESCE(s.is_boarder,false) THEN 'boarding' ELSE 'day' END,
          status = COALESCE(s.status,'active')
        WHERE student_id = s.id AND is_current;
      ELSE
        INSERT INTO public.student_enrollments
          (student_id, academic_year, campus_id, class_level_id, arm_id, legacy_class_id, student_type, boarding, status)
        VALUES (s.id, v_year, v_campus, v_level, v_arm, m.legacy_class_id,
          CASE WHEN v_new THEN 'new' ELSE 'returning' END,
          CASE WHEN COALESCE(s.is_boarder,false) THEN 'boarding' ELSE 'day' END,
          COALESCE(s.status,'active'));
      END IF;
      v_enrolled := v_enrolled + 1;
    END LOOP;

    UPDATE public.class_structure_map SET applied_at = now() WHERE id = m.id;
  END LOOP;

  RETURN jsonb_build_object('levels', v_levels, 'students_enrolled', v_enrolled,
    'students_total', (SELECT count(*) FROM public.students WHERE archived_at IS NULL),
    'without_enrollment', (SELECT count(*) FROM public.students st WHERE st.archived_at IS NULL
      AND NOT EXISTS (SELECT 1 FROM public.student_enrollments e WHERE e.student_id = st.id AND e.is_current)));
END; $function$;