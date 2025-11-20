-- Create trigger function to auto-populate school_id in class_assignments
CREATE OR REPLACE FUNCTION auto_populate_school_id_class_assignments()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.school_id IS NULL THEN
    SELECT c.school_id INTO NEW.school_id
    FROM classes c
    WHERE c.id = NEW.class_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for class_assignments
CREATE TRIGGER before_insert_class_assignments_school_id
  BEFORE INSERT ON class_assignments
  FOR EACH ROW
  EXECUTE FUNCTION auto_populate_school_id_class_assignments();

-- Backfill profiles.school_id for students
UPDATE profiles p
SET school_id = (
  SELECT c.school_id 
  FROM class_assignments ca
  JOIN classes c ON c.id = ca.class_id
  WHERE ca.student_id = p.user_id
  LIMIT 1
)
WHERE p.school_id IS NULL 
AND EXISTS (
  SELECT 1 FROM user_roles ur 
  WHERE ur.user_id = p.user_id 
  AND ur.role = 'student'
);

-- Backfill class_assignments.school_id
UPDATE class_assignments ca
SET school_id = c.school_id
FROM classes c
WHERE ca.class_id = c.id
AND ca.school_id IS NULL;

-- Backfill students.school_id
UPDATE students s
SET school_id = (
  SELECT c.school_id 
  FROM class_assignments ca
  JOIN classes c ON c.id = ca.class_id
  WHERE ca.student_id = s.user_id
  LIMIT 1
)
WHERE s.school_id IS NULL;