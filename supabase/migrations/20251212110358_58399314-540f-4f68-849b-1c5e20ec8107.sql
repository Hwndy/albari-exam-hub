-- Change exam_sessions foreign key from CASCADE to SET NULL
-- This preserves student exam results when exams are deleted

-- Drop the existing CASCADE constraint
ALTER TABLE exam_sessions 
DROP CONSTRAINT IF EXISTS exam_sessions_exam_id_fkey;

-- Add new SET NULL constraint - results are preserved but unlinked when exam is deleted
ALTER TABLE exam_sessions 
ADD CONSTRAINT exam_sessions_exam_id_fkey 
FOREIGN KEY (exam_id) 
REFERENCES exams(id) 
ON DELETE SET NULL;

-- Note: exam_questions will keep CASCADE behavior (handled automatically by existing constraint)
-- Question-exam mappings can be deleted since they're just links, not valuable student data