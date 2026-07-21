
CREATE OR REPLACE FUNCTION public.get_or_create_scan_session(p_date date)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_id uuid;
BEGIN
  SELECT id INTO v_id FROM public.attendance_sessions
   WHERE date = p_date AND status = 'scan' AND class_id IS NULL AND subject_id IS NULL
   LIMIT 1;
  IF v_id IS NULL THEN
    INSERT INTO public.attendance_sessions (date, status, teacher_id, period_number)
    VALUES (p_date, 'scan', auth.uid(), 0)
    RETURNING id INTO v_id;
  END IF;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.record_scan_by_ref(p_ref text, p_direction text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_student uuid; v_uuid uuid; v_match text; v_info jsonb;
  v_session uuid; v_existing uuid;
BEGIN
  IF NOT public.is_teacher() THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF p_direction NOT IN ('in','out') THEN RAISE EXCEPTION 'direction must be in/out'; END IF;
  IF p_ref IS NULL OR btrim(p_ref) = '' THEN RAISE EXCEPTION 'unknown_reference'; END IF;

  v_match := (regexp_match(p_ref, '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}'))[1];
  IF v_match IS NOT NULL THEN
    v_uuid := v_match::uuid;
    SELECT student_id INTO v_student FROM public.student_qr_tokens
      WHERE token = v_uuid AND revoked_at IS NULL;
    IF v_student IS NULL AND EXISTS (SELECT 1 FROM public.student_qr_tokens WHERE token = v_uuid) THEN
      RAISE EXCEPTION 'token_revoked';
    END IF;
  END IF;

  IF v_student IS NULL THEN
    SELECT id INTO v_student FROM public.students
      WHERE lower(admission_number) = lower(btrim(p_ref));
    IF v_student IS NULL THEN RAISE EXCEPTION 'student_not_found'; END IF;
  END IF;

  v_session := public.get_or_create_scan_session(CURRENT_DATE);

  SELECT id INTO v_existing FROM public.student_attendance
   WHERE attendance_session_id = v_session AND student_id = v_student
   LIMIT 1;

  IF v_existing IS NULL THEN
    INSERT INTO public.student_attendance
      (attendance_session_id, student_id, status, marked_at, marked_by,
       scanned_at, scan_direction, scanned_by)
    VALUES (v_session, v_student, 'present', now(), auth.uid(),
            now(), p_direction, auth.uid());
  ELSE
    UPDATE public.student_attendance
       SET scan_direction = p_direction, scanned_at = now(), scanned_by = auth.uid()
     WHERE id = v_existing;
  END IF;

  SELECT jsonb_build_object(
    'student_id', s.id, 'user_id', s.user_id, 'full_name', p.full_name,
    'admission_number', s.admission_number, 'photo_url', s.photo_url,
    'class_id', c.id, 'class_name', c.name, 'status', s.status
  ) INTO v_info
  FROM public.students s
  LEFT JOIN public.profiles p ON p.user_id = s.user_id
  LEFT JOIN public.class_assignments ca ON ca.student_id = s.id
  LEFT JOIN public.classes c ON c.id = ca.class_id
  WHERE s.id = v_student;
  RETURN v_info;
END;
$$;

CREATE OR REPLACE FUNCTION public.record_student_scan(p_token uuid, p_direction text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN public.record_scan_by_ref(p_token::text, p_direction);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_or_create_scan_session(date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_scan_by_ref(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_student_scan(uuid, text) TO authenticated;
