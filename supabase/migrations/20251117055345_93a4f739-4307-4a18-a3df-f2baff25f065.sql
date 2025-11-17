-- Clean up orphaned subject assignments
-- Delete subject assignments without class_id where the teacher has class assignments
DELETE FROM subject_assignments
WHERE class_id IS NULL
AND user_id IN (
  SELECT DISTINCT teacher_id 
  FROM teacher_class_assignments
);

-- Note: This removes orphaned assignments. 
-- Proper assignments will need to be recreated by the teacher re-registering or admin re-assigning.