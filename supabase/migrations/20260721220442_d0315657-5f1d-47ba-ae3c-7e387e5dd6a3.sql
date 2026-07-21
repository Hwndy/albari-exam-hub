-- Permit the dedicated scan-session status while preserving all existing statuses.
ALTER TABLE public.attendance_sessions
  DROP CONSTRAINT IF EXISTS attendance_sessions_status_check;
ALTER TABLE public.attendance_sessions
  ADD CONSTRAINT attendance_sessions_status_check
  CHECK (status = ANY (ARRAY['scheduled'::text, 'in_progress'::text, 'completed'::text, 'cancelled'::text, 'scan'::text]));

-- Guarantee one global ID-scan bucket per date and one attendance row per student/session.
CREATE UNIQUE INDEX IF NOT EXISTS attendance_sessions_daily_scan_uniq
  ON public.attendance_sessions (date)
  WHERE status = 'scan' AND class_id IS NULL AND subject_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS student_attendance_session_student_uniq
  ON public.student_attendance (attendance_session_id, student_id)
  WHERE attendance_session_id IS NOT NULL AND student_id IS NOT NULL;

-- Reinstate RLS on private attendance/identity tables.
ALTER TABLE public.attendance_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visitor_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_qr_tokens ENABLE ROW LEVEL SECURITY;

-- Remove broad anonymous Data API access left by the earlier permissions repair.
REVOKE ALL ON TABLE public.attendance_sessions FROM anon;
REVOKE ALL ON TABLE public.student_attendance FROM anon;
REVOKE ALL ON TABLE public.staff_attendance FROM anon;
REVOKE ALL ON TABLE public.visitor_logs FROM anon;
REVOKE ALL ON TABLE public.student_qr_tokens FROM anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.attendance_sessions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.student_attendance TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.staff_attendance TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.visitor_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.student_qr_tokens TO authenticated;
GRANT ALL ON TABLE public.attendance_sessions TO service_role;
GRANT ALL ON TABLE public.student_attendance TO service_role;
GRANT ALL ON TABLE public.staff_attendance TO service_role;
GRANT ALL ON TABLE public.visitor_logs TO service_role;
GRANT ALL ON TABLE public.student_qr_tokens TO service_role;

-- Keep the student attendance-session policy authenticated-only.
DROP POLICY IF EXISTS "Students can view their attendance sessions" ON public.attendance_sessions;
CREATE POLICY "Students can view their attendance sessions"
  ON public.attendance_sessions
  FOR SELECT
  TO authenticated
  USING (
    class_id IN (
      SELECT ca.class_id
      FROM public.class_assignments ca
      JOIN public.students s ON s.id = ca.student_id
      WHERE s.user_id = auth.uid()
    )
  );

-- Concurrency-safe daily scan-session helper.
CREATE OR REPLACE FUNCTION public.get_or_create_scan_session(p_date date)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_teacher() THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;

  SELECT id INTO v_id
  FROM public.attendance_sessions
  WHERE date = p_date
    AND status = 'scan'
    AND class_id IS NULL
    AND subject_id IS NULL
  LIMIT 1;

  IF v_id IS NULL THEN
    INSERT INTO public.attendance_sessions (date, status, teacher_id, period_number)
    VALUES (p_date, 'scan', auth.uid(), 0)
    ON CONFLICT (date)
      WHERE status = 'scan' AND class_id IS NULL AND subject_id IS NULL
      DO NOTHING
    RETURNING id INTO v_id;

    IF v_id IS NULL THEN
      SELECT id INTO v_id
      FROM public.attendance_sessions
      WHERE date = p_date
        AND status = 'scan'
        AND class_id IS NULL
        AND subject_id IS NULL
      LIMIT 1;
    END IF;
  END IF;

  RETURN v_id;
END;
$$;

-- Resolve live scan URLs, raw UUID tokens, and admission/registration numbers.
CREATE OR REPLACE FUNCTION public.record_scan_by_ref(p_ref text, p_direction text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student uuid;
  v_uuid uuid;
  v_match text;
  v_info jsonb;
  v_session uuid;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_teacher() THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;
  IF p_direction NOT IN ('in', 'out') THEN
    RAISE EXCEPTION 'invalid_direction';
  END IF;
  IF p_ref IS NULL OR btrim(p_ref) = '' THEN
    RAISE EXCEPTION 'unknown_reference';
  END IF;

  v_match := (regexp_match(p_ref, '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}'))[1];
  IF v_match IS NOT NULL THEN
    v_uuid := v_match::uuid;
    SELECT student_id INTO v_student
    FROM public.student_qr_tokens
    WHERE token = v_uuid AND revoked_at IS NULL;

    IF v_student IS NULL
       AND EXISTS (SELECT 1 FROM public.student_qr_tokens WHERE token = v_uuid) THEN
      RAISE EXCEPTION 'token_revoked';
    END IF;
  END IF;

  IF v_student IS NULL THEN
    SELECT id INTO v_student
    FROM public.students
    WHERE lower(admission_number) = lower(btrim(p_ref));
  END IF;

  IF v_student IS NULL THEN
    RAISE EXCEPTION 'student_not_found' USING ERRCODE = 'P0002';
  END IF;

  v_session := public.get_or_create_scan_session(CURRENT_DATE);

  INSERT INTO public.student_attendance (
    attendance_session_id, student_id, status, marked_at, marked_by,
    scanned_at, scan_direction, scanned_by
  )
  VALUES (
    v_session, v_student, 'present', now(), auth.uid(),
    now(), p_direction, auth.uid()
  )
  ON CONFLICT (attendance_session_id, student_id)
    WHERE attendance_session_id IS NOT NULL AND student_id IS NOT NULL
  DO UPDATE SET
    status = 'present',
    scan_direction = EXCLUDED.scan_direction,
    scanned_at = EXCLUDED.scanned_at,
    scanned_by = EXCLUDED.scanned_by;

  SELECT jsonb_build_object(
    'student_id', s.id,
    'user_id', s.user_id,
    'full_name', p.full_name,
    'admission_number', s.admission_number,
    'photo_url', s.photo_url,
    'class_id', c.id,
    'class_name', c.name,
    'status', s.status,
    'direction', p_direction,
    'scanned_at', now()
  ) INTO v_info
  FROM public.students s
  LEFT JOIN public.profiles p ON p.user_id = s.user_id
  LEFT JOIN public.class_assignments ca ON ca.student_id = s.id
  LEFT JOIN public.classes c ON c.id = ca.class_id
  WHERE s.id = v_student
  ORDER BY c.name NULLS LAST
  LIMIT 1;

  RETURN v_info;
END;
$$;

CREATE OR REPLACE FUNCTION public.record_student_scan(p_token uuid, p_direction text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN public.record_scan_by_ref(p_token::text, p_direction);
END;
$$;

-- Resolve and record the scanned staff member, not the signed-in operator.
CREATE OR REPLACE FUNCTION public.record_staff_scan(p_ref text, p_direction text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_staff record;
  v_now timestamptz := now();
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_teacher() THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;
  IF p_direction NOT IN ('in', 'out') THEN
    RAISE EXCEPTION 'invalid_direction';
  END IF;
  IF p_ref IS NULL OR btrim(p_ref) = '' THEN
    RAISE EXCEPTION 'unknown_reference';
  END IF;

  SELECT sd.user_id, sd.employee_id, p.full_name, sd.designation, sd.department
  INTO v_staff
  FROM public.staff_details sd
  LEFT JOIN public.profiles p ON p.user_id = sd.user_id
  WHERE lower(sd.employee_id) = lower(btrim(p_ref))
     OR sd.user_id::text = btrim(p_ref)
  LIMIT 1;

  IF v_staff.user_id IS NULL THEN
    RAISE EXCEPTION 'staff_not_found' USING ERRCODE = 'P0002';
  END IF;

  INSERT INTO public.staff_attendance (
    staff_id, date, check_in, check_out, status, marked_by,
    scanned_at, scan_direction, scanned_by
  )
  VALUES (
    v_staff.user_id, CURRENT_DATE,
    CASE WHEN p_direction = 'in' THEN v_now::time ELSE NULL END,
    CASE WHEN p_direction = 'out' THEN v_now::time ELSE NULL END,
    'present', auth.uid(), v_now, p_direction, auth.uid()
  )
  ON CONFLICT (staff_id, date)
  DO UPDATE SET
    check_in = CASE
      WHEN p_direction = 'in' THEN COALESCE(public.staff_attendance.check_in, v_now::time)
      ELSE public.staff_attendance.check_in
    END,
    check_out = CASE
      WHEN p_direction = 'out' THEN v_now::time
      ELSE public.staff_attendance.check_out
    END,
    status = 'present',
    scanned_at = v_now,
    scan_direction = p_direction,
    scanned_by = auth.uid();

  RETURN jsonb_build_object(
    'user_id', v_staff.user_id,
    'employee_id', v_staff.employee_id,
    'full_name', v_staff.full_name,
    'designation', v_staff.designation,
    'department', v_staff.department,
    'direction', p_direction,
    'scanned_at', v_now
  );
END;
$$;

-- Private RPC surface: explicit authenticated/service-role execution only.
REVOKE ALL ON FUNCTION public.get_or_create_scan_session(date) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.record_scan_by_ref(text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.record_student_scan(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.record_staff_scan(text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.issue_student_qr(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.resolve_scan_token(uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.get_or_create_scan_session(date) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.record_scan_by_ref(text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.record_student_scan(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.record_staff_scan(text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.issue_student_qr(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.resolve_scan_token(uuid) TO authenticated, service_role;