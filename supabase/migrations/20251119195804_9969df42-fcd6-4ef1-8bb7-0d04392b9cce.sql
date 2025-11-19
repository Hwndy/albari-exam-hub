-- Make school_id nullable temporarily for incremental code updates
-- This allows existing inserts to work while code is being updated

ALTER TABLE question_responses ALTER COLUMN school_id DROP NOT NULL;
ALTER TABLE exam_questions ALTER COLUMN school_id DROP NOT NULL;
ALTER TABLE question_options ALTER COLUMN school_id DROP NOT NULL;
ALTER TABLE student_attendance ALTER COLUMN school_id DROP NOT NULL;
ALTER TABLE class_assignments ALTER COLUMN school_id DROP NOT NULL;
ALTER TABLE subject_assignments ALTER COLUMN school_id DROP NOT NULL;
ALTER TABLE teacher_class_assignments ALTER COLUMN school_id DROP NOT NULL;
ALTER TABLE student_parent_relationships ALTER COLUMN school_id DROP NOT NULL;

-- Add triggers to auto-populate school_id from related tables
CREATE OR REPLACE FUNCTION auto_populate_school_id_question_responses()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.school_id IS NULL THEN
    SELECT es.school_id INTO NEW.school_id
    FROM exam_sessions es
    WHERE es.id = NEW.session_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trigger_auto_school_id_question_responses
BEFORE INSERT ON question_responses
FOR EACH ROW EXECUTE FUNCTION auto_populate_school_id_question_responses();

-- Similar triggers for other tables
CREATE OR REPLACE FUNCTION auto_populate_school_id_exam_questions()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.school_id IS NULL THEN
    SELECT e.school_id INTO NEW.school_id
    FROM exams e
    WHERE e.id = NEW.exam_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trigger_auto_school_id_exam_questions
BEFORE INSERT ON exam_questions
FOR EACH ROW EXECUTE FUNCTION auto_populate_school_id_exam_questions();

CREATE OR REPLACE FUNCTION auto_populate_school_id_question_options()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.school_id IS NULL THEN
    SELECT q.school_id INTO NEW.school_id
    FROM questions q
    WHERE q.id = NEW.question_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trigger_auto_school_id_question_options
BEFORE INSERT ON question_options
FOR EACH ROW EXECUTE FUNCTION auto_populate_school_id_question_options();