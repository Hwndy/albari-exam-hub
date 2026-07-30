ALTER TABLE public.exams
  ADD COLUMN IF NOT EXISTS exam_mode text NOT NULL DEFAULT 'cbt',
  ADD COLUMN IF NOT EXISTS paper_subjects jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.admission_exam_assignments
  ADD COLUMN IF NOT EXISTS subject_scores jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS resit_date timestamptz,
  ADD COLUMN IF NOT EXISTS resit_venue text;

CREATE OR REPLACE FUNCTION public.save_entrance_exam_result(
  p_assignment_id uuid,
  p_score numeric,
  p_max_score numeric,
  p_result_status text,
  p_comment text,
  p_source text DEFAULT 'manual'::text,
  p_subject_scores jsonb DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_score numeric := p_score;
  v_max numeric := p_max_score;
  v_subjects jsonb := COALESCE(p_subject_scores, '[]'::jsonb);
BEGIN
  IF NOT public.is_teacher() THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;
  IF COALESCE(p_result_status, 'pending') NOT IN ('pending','pass','fail','resit') THEN
    RAISE EXCEPTION 'Invalid result status';
  END IF;

  IF jsonb_array_length(v_subjects) > 0 THEN
    SELECT SUM(NULLIF(e->>'score','')::numeric), SUM(NULLIF(e->>'max','')::numeric)
      INTO v_score, v_max
    FROM jsonb_array_elements(v_subjects) e;
  END IF;

  UPDATE public.admission_exam_assignments
  SET score = v_score,
      max_score = v_max,
      percentage = CASE WHEN COALESCE(v_max,0) > 0
                        THEN ROUND((v_score / v_max) * 100, 2) ELSE NULL END,
      result_status = COALESCE(p_result_status, 'pending'),
      comment = p_comment,
      source = COALESCE(p_source, 'manual'),
      subject_scores = v_subjects,
      recorded_by = auth.uid(),
      updated_at = now()
  WHERE id = p_assignment_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.set_entrance_resit_details(
  p_assignment_id uuid,
  p_resit_date timestamptz,
  p_resit_venue text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.is_teacher() THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;
  UPDATE public.admission_exam_assignments
  SET resit_date = p_resit_date, resit_venue = p_resit_venue, updated_at = now()
  WHERE id = p_assignment_id;
END;
$function$;

DROP FUNCTION IF EXISTS public.get_entrance_exam_results(uuid);
CREATE OR REPLACE FUNCTION public.get_entrance_exam_results(p_exam_id uuid)
RETURNS TABLE(
  assignment_id uuid, application_id uuid, application_number text, full_name text, email text,
  status text, score numeric, max_score numeric, percentage numeric, result_status text,
  comment text, source text, subject_scores jsonb, resit_date timestamptz, resit_venue text,
  result_sent_at timestamptz, resit_sent_at timestamptz,
  online_score numeric, online_max_score numeric, online_percentage numeric
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT
    a.id, ap.id, ap.application_number,
    btrim(concat_ws(' ', ap.first_name, ap.middle_name, ap.last_name)),
    ap.email, ap.status::text,
    a.score, a.max_score, a.percentage, a.result_status, a.comment, a.source,
    a.subject_scores, a.resit_date, a.resit_venue,
    a.result_sent_at, a.resit_sent_at,
    es.total_score::numeric, es.max_score::numeric, es.percentage
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
$function$;

CREATE OR REPLACE FUNCTION public.get_application_exam_results(p_application_id uuid)
RETURNS TABLE(
  assignment_id uuid, exam_id uuid, exam_title text, exam_mode text, paper_subjects jsonb,
  score numeric, max_score numeric, percentage numeric, result_status text, comment text,
  subject_scores jsonb, resit_date timestamptz, resit_venue text,
  result_sent_at timestamptz, resit_sent_at timestamptz
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT a.id, e.id, e.title, e.exam_mode, e.paper_subjects,
         a.score, a.max_score, a.percentage, a.result_status, a.comment,
         a.subject_scores, a.resit_date, a.resit_venue,
         a.result_sent_at, a.resit_sent_at
  FROM public.admission_exam_assignments a
  JOIN public.exams e ON e.id = a.exam_id
  WHERE a.application_id = p_application_id
    AND public.is_teacher()
  ORDER BY a.assigned_at DESC;
$function$;

CREATE OR REPLACE FUNCTION public.attach_application_to_exam(p_application_id uuid, p_exam_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE v_id uuid;
BEGIN
  IF NOT public.is_teacher() THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;
  SELECT id INTO v_id FROM public.admission_exam_assignments
   WHERE application_id = p_application_id AND exam_id = p_exam_id LIMIT 1;
  IF v_id IS NULL THEN
    INSERT INTO public.admission_exam_assignments (application_id, exam_id, assigned_by)
    VALUES (p_application_id, p_exam_id, auth.uid())
    RETURNING id INTO v_id;
  END IF;
  RETURN v_id;
END;
$function$;