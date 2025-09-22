-- Fix search path security issues for functions
CREATE OR REPLACE FUNCTION update_question_class_from_bank()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update the question's class_id to match its question bank's class_id
  IF NEW.question_bank_id IS NOT NULL THEN
    UPDATE questions 
    SET class_id = (
      SELECT class_id 
      FROM question_banks 
      WHERE id = NEW.question_bank_id
    )
    WHERE id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$;