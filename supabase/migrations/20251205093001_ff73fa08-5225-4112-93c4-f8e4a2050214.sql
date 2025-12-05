-- Fix existing exams where questions_per_student was left at default 20
-- but total_questions is higher (likely unintentional)
UPDATE exams 
SET questions_per_student = total_questions 
WHERE questions_per_student = 20 
  AND total_questions > 20 
  AND questions_per_student != total_questions;