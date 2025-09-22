-- Add class_id to question_banks table to categorize questions by class and subject
ALTER TABLE question_banks ADD COLUMN IF NOT EXISTS class_id UUID REFERENCES classes(id);

-- Create index for better performance when filtering by class
CREATE INDEX IF NOT EXISTS idx_question_banks_class_id ON question_banks(class_id);

-- Update questions table to include class_id reference
ALTER TABLE questions ADD COLUMN IF NOT EXISTS class_id UUID REFERENCES classes(id);

-- Create index for better performance when filtering questions by class
CREATE INDEX IF NOT EXISTS idx_questions_class_id ON questions(class_id);

-- Create a function to update questions class_id based on question_bank
CREATE OR REPLACE FUNCTION update_question_class_from_bank()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update question class_id when question_bank_id changes
DROP TRIGGER IF EXISTS trigger_update_question_class ON questions;
CREATE TRIGGER trigger_update_question_class
  AFTER INSERT OR UPDATE OF question_bank_id ON questions
  FOR EACH ROW
  EXECUTE FUNCTION update_question_class_from_bank();