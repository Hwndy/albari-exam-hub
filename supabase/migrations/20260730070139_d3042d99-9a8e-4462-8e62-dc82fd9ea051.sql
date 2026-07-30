ALTER TABLE public.admission_exam_assignments
  ADD COLUMN IF NOT EXISTS score numeric,
  ADD COLUMN IF NOT EXISTS max_score numeric,
  ADD COLUMN IF NOT EXISTS percentage numeric,
  ADD COLUMN IF NOT EXISTS result_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS comment text,
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS result_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS resit_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS recorded_by uuid,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

GRANT SELECT, INSERT, UPDATE, DELETE ON public.admission_exam_assignments TO authenticated;
GRANT ALL ON public.admission_exam_assignments TO service_role;

DROP TRIGGER IF EXISTS trg_admission_exam_assignments_updated_at ON public.admission_exam_assignments;
CREATE TRIGGER trg_admission_exam_assignments_updated_at
BEFORE UPDATE ON public.admission_exam_assignments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.get_entrance_exam_results(p_exam_id uuid)
RETURNS TABLE(
  assignment_id uuid,
  application_id uuid,
  application_number text,
  full_name text,
  email text,
  status text,
  score numeric,
  max_score numeric,
  percentage numeric,
  result_status text,
  comment text,
  source text,
  result_sent_at timestamptz,
  resit_sent_at timestamptz,
  online_score numeric,
  online_max_score numeric,
  online_percentage numeric
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    a.id,
    ap.id,
    ap.application_number,
    btrim(concat_ws(' ', ap.first_name, ap.middle_name, ap.last_name)),
    ap.email,
    ap.status::text,
    a.score,
    a.max_score,
    a.percentage,
    a.result_status,
    a.comment,
    a.source,
    a.result_sent_at,
    a.resit_sent_at,
    es.total_score::numeric,
    es.max_score::numeric,
    es.percentage
  FROM public.admission_exam_assignments a
  JOIN public.admission_applications ap ON ap.id = a.application_id
  LEFT JOIN public.students st ON st.id = ap.student_id
  LEFT JOIN LATERAL (
    SELECT s.total_score, s.max_score, s.percentage
    FROM public.exam_sessions s
    WHERE s.exam_id = a.exam_id
      AND st.user_id IS NOT NULL
      AND s.student_id = st.user_id
    ORDER BY s.updated_at DESC NULLS LAST
    LIMIT 1
  ) es ON true
  WHERE a.exam_id = p_exam_id
    AND public.is_teacher()
  ORDER BY ap.application_number;
$$;

REVOKE EXECUTE ON FUNCTION public.get_entrance_exam_results(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_entrance_exam_results(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.save_entrance_exam_result(
  p_assignment_id uuid,
  p_score numeric,
  p_max_score numeric,
  p_result_status text,
  p_comment text,
  p_source text DEFAULT 'manual'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.is_teacher() THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;
  IF COALESCE(p_result_status, 'pending') NOT IN ('pending','pass','fail','resit') THEN
    RAISE EXCEPTION 'Invalid result status';
  END IF;

  UPDATE public.admission_exam_assignments
  SET score = p_score,
      max_score = p_max_score,
      percentage = CASE WHEN COALESCE(p_max_score,0) > 0
                        THEN ROUND((p_score / p_max_score) * 100, 2) ELSE NULL END,
      result_status = COALESCE(p_result_status, 'pending'),
      comment = p_comment,
      source = COALESCE(p_source, 'manual'),
      recorded_by = auth.uid()
  WHERE id = p_assignment_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.save_entrance_exam_result(uuid, numeric, numeric, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_entrance_exam_result(uuid, numeric, numeric, text, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.mark_entrance_result_sent(p_assignment_id uuid, p_kind text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.is_teacher() THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;
  IF p_kind = 'result' THEN
    UPDATE public.admission_exam_assignments SET result_sent_at = now() WHERE id = p_assignment_id;
  ELSIF p_kind = 'resit' THEN
    UPDATE public.admission_exam_assignments SET resit_sent_at = now() WHERE id = p_assignment_id;
  ELSE
    RAISE EXCEPTION 'Invalid kind';
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.mark_entrance_result_sent(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_entrance_result_sent(uuid, text) TO authenticated;