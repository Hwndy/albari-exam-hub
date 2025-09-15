-- Fix security warnings: Set proper search_path for functions

-- Fix calculate_exam_score function
CREATE OR REPLACE FUNCTION public.calculate_exam_score(session_id_param UUID)
RETURNS JSON 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  session_record RECORD;
  total_points INTEGER := 0;
  earned_points INTEGER := 0;
  percentage DECIMAL(5,2);
  result JSON;
BEGIN
  -- Get session info
  SELECT * INTO session_record 
  FROM public.exam_sessions 
  WHERE id = session_id_param;
  
  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Session not found');
  END IF;
  
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
    percentage := (earned_points::DECIMAL / total_points::DECIMAL) * 100;
  ELSE
    percentage := 0;
  END IF;
  
  -- Update session with calculated scores
  UPDATE public.exam_sessions 
  SET 
    total_score = earned_points,
    max_score = total_points,
    percentage = percentage,
    passed = percentage >= (
      SELECT pass_mark FROM public.exams WHERE id = session_record.exam_id
    ),
    updated_at = now()
  WHERE id = session_id_param;
  
  -- Return result
  result := json_build_object(
    'total_score', earned_points,
    'max_score', total_points, 
    'percentage', percentage,
    'passed', percentage >= (
      SELECT pass_mark FROM public.exams WHERE id = session_record.exam_id
    )
  );
  
  RETURN result;
END;
$$;

-- Fix grade_question_response function
CREATE OR REPLACE FUNCTION public.grade_question_response()
RETURNS TRIGGER 
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  question_record RECORD;
  is_answer_correct BOOLEAN := false;
  points_to_award INTEGER := 0;
BEGIN
  -- Get question details
  SELECT q.*, eq.points INTO question_record
  FROM public.questions q
  JOIN public.exam_questions eq ON eq.question_id = q.id
  JOIN public.exam_sessions es ON es.exam_id = eq.exam_id
  WHERE q.id = NEW.question_id 
  AND es.id = NEW.session_id;
  
  -- Grade based on question type
  IF question_record.question_type IN ('mcq', 'true_false') THEN
    -- Check if selected option is correct
    SELECT is_correct INTO is_answer_correct
    FROM public.question_options
    WHERE id = NEW.selected_option_id;
    
    IF is_answer_correct THEN
      points_to_award := question_record.points;
    END IF;
    
  ELSIF question_record.question_type = 'fill_blank' THEN
    -- For fill in the blank, check if any correct option matches
    SELECT EXISTS(
      SELECT 1 FROM public.question_options qo
      WHERE qo.question_id = NEW.question_id
      AND qo.is_correct = true
      AND LOWER(TRIM(qo.option_text)) = LOWER(TRIM(NEW.text_answer))
    ) INTO is_answer_correct;
    
    IF is_answer_correct THEN
      points_to_award := question_record.points;
    END IF;
  END IF;
  
  -- Update response with grading results
  NEW.is_correct := is_answer_correct;
  NEW.points_earned := points_to_award;
  
  RETURN NEW;
END;
$$;