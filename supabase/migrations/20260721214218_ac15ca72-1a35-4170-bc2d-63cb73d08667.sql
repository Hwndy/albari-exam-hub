
CREATE OR REPLACE FUNCTION public.record_scan_by_ref(p_ref text, p_direction text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_student uuid;
  v_uuid uuid;
  v_match text;
  v_info jsonb;
BEGIN
  IF NOT public.is_teacher() THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF p_direction NOT IN ('in','out') THEN RAISE EXCEPTION 'direction must be in/out'; END IF;
  IF p_ref IS NULL OR btrim(p_ref) = '' THEN RAISE EXCEPTION 'unknown_reference'; END IF;

  -- Try to extract a UUID from the ref (raw token or /scan/<token> URL)
  v_match := (regexp_match(p_ref, '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}'))[1];

  IF v_match IS NOT NULL THEN
    v_uuid := v_match::uuid;
    SELECT student_id INTO v_student FROM public.student_qr_tokens
      WHERE token = v_uuid AND revoked_at IS NULL;
    IF v_student IS NULL THEN
      -- Token exists but revoked?
      IF EXISTS (SELECT 1 FROM public.student_qr_tokens WHERE token = v_uuid) THEN
        RAISE EXCEPTION 'token_revoked';
      END IF;
    END IF;
  END IF;

  -- Fallback: treat ref as admission number
  IF v_student IS NULL THEN
    SELECT id INTO v_student FROM public.students
      WHERE lower(admission_number) = lower(btrim(p_ref));
    IF v_student IS NULL THEN
      RAISE EXCEPTION 'student_not_found';
    END IF;
  END IF;

  INSERT INTO public.student_attendance (student_id, date, status, scanned_at, scan_direction, scanned_by, marked_by)
  VALUES (v_student, CURRENT_DATE, 'present', now(), p_direction, auth.uid(), auth.uid());

  SELECT jsonb_build_object(
    'student_id', s.id,
    'user_id', s.user_id,
    'full_name', p.full_name,
    'admission_number', s.admission_number,
    'photo_url', s.photo_url,
    'class_id', c.id,
    'class_name', c.name,
    'status', s.status
  ) INTO v_info
  FROM public.students s
  LEFT JOIN public.profiles p ON p.user_id = s.user_id
  LEFT JOIN public.class_assignments ca ON ca.student_id = s.id
  LEFT JOIN public.classes c ON c.id = ca.class_id
  WHERE s.id = v_student;

  RETURN v_info;
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_scan_by_ref(text, text) TO authenticated;
