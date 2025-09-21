-- Fix the calculate_exam_score function to avoid ambiguous column reference
CREATE OR REPLACE FUNCTION public.calculate_exam_score(session_id_param uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  session_record RECORD;
  total_points INTEGER := 0;
  earned_points INTEGER := 0;
  calc_percentage DECIMAL(5,2);
  pass_mark_value INTEGER;
  result JSON;
BEGIN
  -- Get session info
  SELECT * INTO session_record 
  FROM public.exam_sessions 
  WHERE id = session_id_param;
  
  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Session not found');
  END IF;
  
  -- Get pass mark
  SELECT pass_mark INTO pass_mark_value
  FROM public.exams 
  WHERE id = session_record.exam_id;
  
  -- Calculate total possible points
  SELECT COALESCE(SUM(eq.points), 0) INTO total_points
  FROM public.exam_questions eq
  WHERE eq.exam_id = session_record.exam_id;
  
  -- Calculate earned points  
  SELECT COALESCE(SUM(qr.points_earned), 0) INTO earned_points
  FROM public.question_responses qr
  WHERE qr.session_id = session_id_param;
  
  -- Calculate percentage
  IF total_points > 0 THEN
    calc_percentage := (earned_points::DECIMAL / total_points::DECIMAL) * 100;
  ELSE
    calc_percentage := 0;
  END IF;
  
  -- Update session with calculated scores
  UPDATE public.exam_sessions 
  SET 
    total_score = earned_points,
    max_score = total_points,
    percentage = calc_percentage,
    passed = calc_percentage >= pass_mark_value,
    updated_at = now()
  WHERE id = session_id_param;
  
  -- Return result
  result := json_build_object(
    'total_score', earned_points,
    'max_score', total_points, 
    'percentage', calc_percentage,
    'passed', calc_percentage >= pass_mark_value
  );
  
  RETURN result;
END;
$function$;

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
DROP POLICY IF EXISTS "Teachers can view profiles" ON public.profiles;
CREATE POLICY "Teachers can view profiles"
ON public.profiles
FOR SELECT
USING (public.is_teacher());

-- Recalculate scores for all completed sessions to backfill totals
DO $$
DECLARE
  s RECORD;
BEGIN
  FOR s IN SELECT id FROM public.exam_sessions WHERE status = 'completed' LOOP
    PERFORM public.calculate_exam_score(s.id);
  END LOOP;
END $$;