-- Add columns to exams table for question pool management
ALTER TABLE exams 
ADD COLUMN questions_per_student INTEGER DEFAULT NULL,
ADD COLUMN question_pool_size INTEGER DEFAULT NULL;

-- Add comment to clarify usage
COMMENT ON COLUMN exams.questions_per_student IS 'Number of questions each student should answer (subset of total pool)';
COMMENT ON COLUMN exams.question_pool_size IS 'Total number of questions in the pool (for reference)';