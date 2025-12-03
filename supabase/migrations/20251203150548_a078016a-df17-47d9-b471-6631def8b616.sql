-- Update existing exam_sessions to get school_id from the related exam
UPDATE exam_sessions es
SET school_id = e.school_id
FROM exams e
WHERE es.exam_id = e.id
AND es.school_id IS NULL;

-- Create trigger function to auto-populate school_id from exam
CREATE OR REPLACE FUNCTION populate_exam_session_school_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.school_id IS NULL AND NEW.exam_id IS NOT NULL THEN
    SELECT school_id INTO NEW.school_id
    FROM exams
    WHERE id = NEW.exam_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger on exam_sessions
DROP TRIGGER IF EXISTS set_exam_session_school_id ON exam_sessions;
CREATE TRIGGER set_exam_session_school_id
  BEFORE INSERT ON exam_sessions
  FOR EACH ROW
  EXECUTE FUNCTION populate_exam_session_school_id();