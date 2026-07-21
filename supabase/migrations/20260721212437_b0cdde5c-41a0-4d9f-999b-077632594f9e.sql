
-- 1. student_qr_tokens
CREATE TABLE public.student_qr_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  token uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  issued_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz
);
CREATE UNIQUE INDEX student_qr_tokens_active_uniq ON public.student_qr_tokens(student_id) WHERE revoked_at IS NULL;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_qr_tokens TO authenticated;
GRANT ALL ON public.student_qr_tokens TO service_role;
ALTER TABLE public.student_qr_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read qr tokens" ON public.student_qr_tokens FOR SELECT TO authenticated USING (public.is_teacher());
CREATE POLICY "staff manage qr tokens" ON public.student_qr_tokens FOR ALL TO authenticated USING (public.is_teacher()) WITH CHECK (public.is_teacher());

-- 2. visitor_logs
CREATE TABLE public.visitor_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  phone text,
  purpose text,
  host_name text,
  badge_no text,
  signed_in_at timestamptz NOT NULL DEFAULT now(),
  signed_out_at timestamptz,
  signed_in_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.visitor_logs TO authenticated;
GRANT ALL ON public.visitor_logs TO service_role;
ALTER TABLE public.visitor_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff manage visitors" ON public.visitor_logs FOR ALL TO authenticated USING (public.is_teacher()) WITH CHECK (public.is_teacher());

-- 3. extend student_attendance
ALTER TABLE public.student_attendance
  ADD COLUMN IF NOT EXISTS scanned_at timestamptz,
  ADD COLUMN IF NOT EXISTS scan_direction text,
  ADD COLUMN IF NOT EXISTS scanned_by uuid REFERENCES auth.users(id);

-- 4. extend staff_attendance
ALTER TABLE public.staff_attendance
  ADD COLUMN IF NOT EXISTS scanned_at timestamptz,
  ADD COLUMN IF NOT EXISTS scan_direction text,
  ADD COLUMN IF NOT EXISTS scanned_by uuid REFERENCES auth.users(id);

-- 5. Issue token RPC
CREATE OR REPLACE FUNCTION public.issue_student_qr(p_student_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_token uuid;
BEGIN
  IF NOT public.is_teacher() THEN RAISE EXCEPTION 'Not authorized'; END IF;
  UPDATE public.student_qr_tokens SET revoked_at = now()
    WHERE student_id = p_student_id AND revoked_at IS NULL;
  INSERT INTO public.student_qr_tokens (student_id) VALUES (p_student_id)
    RETURNING token INTO v_token;
  RETURN v_token;
END;
$$;

-- 6. Resolve token RPC
CREATE OR REPLACE FUNCTION public.resolve_scan_token(p_token uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_row jsonb;
BEGIN
  IF NOT public.is_teacher() THEN RAISE EXCEPTION 'Not authorized'; END IF;
  SELECT jsonb_build_object(
    'student_id', s.id,
    'user_id', s.user_id,
    'full_name', p.full_name,
    'admission_number', s.admission_number,
    'photo_url', s.photo_url,
    'class_id', c.id,
    'class_name', c.name,
    'status', s.status
  ) INTO v_row
  FROM public.student_qr_tokens t
  JOIN public.students s ON s.id = t.student_id
  LEFT JOIN public.profiles p ON p.user_id = s.user_id
  LEFT JOIN public.class_assignments ca ON ca.student_id = s.id
  LEFT JOIN public.classes c ON c.id = ca.class_id
  WHERE t.token = p_token AND t.revoked_at IS NULL;
  IF v_row IS NULL THEN RAISE EXCEPTION 'Invalid or revoked token'; END IF;
  RETURN v_row;
END;
$$;

-- 7. Scan-attendance RPC (student)
CREATE OR REPLACE FUNCTION public.record_student_scan(p_token uuid, p_direction text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_student uuid; v_info jsonb;
BEGIN
  IF NOT public.is_teacher() THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF p_direction NOT IN ('in','out') THEN RAISE EXCEPTION 'direction must be in/out'; END IF;
  SELECT student_id INTO v_student FROM public.student_qr_tokens
    WHERE token = p_token AND revoked_at IS NULL;
  IF v_student IS NULL THEN RAISE EXCEPTION 'Invalid token'; END IF;
  INSERT INTO public.student_attendance (student_id, date, status, scanned_at, scan_direction, scanned_by, marked_by)
  VALUES (v_student, CURRENT_DATE, 'present', now(), p_direction, auth.uid(), auth.uid());
  v_info := public.resolve_scan_token(p_token);
  RETURN v_info;
END;
$$;

-- 8. Backfill tokens for existing students
INSERT INTO public.student_qr_tokens (student_id)
SELECT s.id FROM public.students s
LEFT JOIN public.student_qr_tokens t ON t.student_id = s.id AND t.revoked_at IS NULL
WHERE t.id IS NULL;
