-- Ensure grading triggers exist for question_responses
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_grade_question_response_ins'
  ) THEN
    CREATE TRIGGER trg_grade_question_response_ins
    BEFORE INSERT ON public.question_responses
    FOR EACH ROW
    EXECUTE FUNCTION public.grade_question_response();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_grade_question_response_upd'
  ) THEN
    CREATE TRIGGER trg_grade_question_response_upd
    BEFORE UPDATE OF selected_option_id, text_answer ON public.question_responses
    FOR EACH ROW
    EXECUTE FUNCTION public.grade_question_response();
  END IF;
END $$;

-- Allow teachers to view student profiles for results
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE polname = 'Teachers can view profiles'
  ) THEN
    CREATE POLICY "Teachers can view profiles"
    ON public.profiles
    FOR SELECT
    USING (public.is_teacher());
  END IF;
END $$;

-- Recalculate scores for all completed sessions to backfill totals
DO $$
DECLARE
  s RECORD;
BEGIN
  FOR s IN SELECT id FROM public.exam_sessions WHERE status = 'completed' LOOP
    PERFORM public.calculate_exam_score(s.id);
  END LOOP;
END $$;