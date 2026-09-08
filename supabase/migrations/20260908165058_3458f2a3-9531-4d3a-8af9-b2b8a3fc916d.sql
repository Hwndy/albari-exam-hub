CREATE OR REPLACE FUNCTION public.list_students_filtered(p_class_level_id uuid DEFAULT NULL::uuid, p_campus_id uuid DEFAULT NULL::uuid, p_arm_id uuid DEFAULT NULL::uuid, p_gender text DEFAULT NULL::text, p_boarding text DEFAULT NULL::text, p_student_type text DEFAULT NULL::text, p_status text DEFAULT 'active'::text, p_search text DEFAULT NULL::text, p_admission_year integer DEFAULT NULL::integer, p_limit integer DEFAULT 50, p_offset integer DEFAULT 0)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_rows jsonb; v_total int;
BEGIN
  IF NOT (public.is_admin() OR public.is_teacher()) THEN RAISE EXCEPTION 'Not allowed'; END IF;

  WITH base AS (
    SELECT st.id, st.user_id, st.admission_number, st.gender, st.date_of_birth, st.status,
           st.photo_url, st.is_boarder, st.admission_date, st.archived_at,
           p.full_name, e.campus_id, e.class_level_id, e.arm_id, e.student_type, e.legacy_class_id,
           c.name AS campus_name, cl.name AS class_name, a.code AS arm_code
    FROM public.students st
    LEFT JOIN public.profiles p ON p.user_id = st.user_id
    LEFT JOIN public.student_enrollments e ON e.student_id = st.id AND e.is_current
    LEFT JOIN public.campuses c ON c.id = e.campus_id
    LEFT JOIN public.class_levels cl ON cl.id = e.class_level_id
    LEFT JOIN public.arms a ON a.id = e.arm_id
    WHERE st.archived_at IS NULL
      AND (p_class_level_id IS NULL OR e.class_level_id = p_class_level_id)
      AND (p_campus_id IS NULL OR e.campus_id = p_campus_id)
      AND (p_arm_id IS NULL OR e.arm_id = p_arm_id)
      AND (p_gender IS NULL OR lower(st.gender) = lower(p_gender))
      AND (p_boarding IS NULL OR (p_boarding = 'boarding') = COALESCE(st.is_boarder,false))
      AND (p_student_type IS NULL OR COALESCE(e.student_type,'returning') = p_student_type)
      AND (p_status IS NULL OR COALESCE(st.status,'active') = p_status)
      AND (p_admission_year IS NULL OR EXTRACT(YEAR FROM st.admission_date) = p_admission_year)
      AND (p_search IS NULL OR btrim(p_search) = '' OR
           st.admission_number ILIKE '%'||p_search||'%' OR p.full_name ILIKE '%'||p_search||'%')
  )
  SELECT count(*)::int,
         COALESCE((SELECT jsonb_agg(to_jsonb(b) ORDER BY b.full_name NULLS LAST, b.admission_number)
                   FROM (SELECT * FROM base ORDER BY full_name NULLS LAST, admission_number
                         LIMIT COALESCE(p_limit, 50) OFFSET COALESCE(p_offset,0)) b), '[]'::jsonb)
  INTO v_total, v_rows FROM base;

  RETURN jsonb_build_object('total', v_total, 'rows', v_rows);
END; $function$;