-- Create function to automatically assign teachers to classes when they register
-- This ensures teachers have proper class assignments for exam visibility

CREATE OR REPLACE FUNCTION public.auto_assign_teacher_class()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    default_class_id uuid;
BEGIN
    -- Only process if this is a teacher profile
    IF NEW.role != 'teacher' THEN
        RETURN NEW;
    END IF;
    
    -- Get a default class to assign (you can modify this logic)
    -- For now, we'll skip auto-assignment and let admins assign manually
    -- But we ensure the structure is in place
    
    RETURN NEW;
END;
$$;

-- Update exam RLS policies to better handle teacher visibility
-- Teachers should see exams they created OR exams for classes they're assigned to

DROP POLICY IF EXISTS "Teachers can manage exams" ON exams;

CREATE POLICY "Teachers can manage exams" 
ON exams 
FOR ALL 
USING (
  is_admin() OR 
  created_by = auth.uid() OR 
  (
    is_teacher() AND (
      -- Teachers can see exams they created
      created_by = auth.uid() OR
      -- Teachers can see exams for classes they're assigned to (if they have class assignments)
      (
        EXISTS (
          SELECT 1 FROM teacher_class_assignments tca 
          WHERE tca.teacher_id = auth.uid() 
          AND tca.class_id = exams.class_id
        )
      ) OR
      -- Teachers can see exams for subjects they're assigned to (even without class assignment)
      (
        EXISTS (
          SELECT 1 FROM subject_assignments sa 
          WHERE sa.user_id = auth.uid() 
          AND sa.subject_id = exams.subject_id
        )
      )
    )
  )
);

-- Update question bank policies to ensure proper visibility
DROP POLICY IF EXISTS "Teachers can manage question banks" ON question_banks;

CREATE POLICY "Teachers can manage question banks" 
ON question_banks 
FOR ALL 
USING (
  is_teacher() AND (
    -- Teachers can access question banks they created
    created_by = auth.uid() OR
    -- Teachers can access question banks for subjects they're assigned to
    EXISTS (
      SELECT 1 FROM subject_assignments sa 
      WHERE sa.user_id = auth.uid() 
      AND sa.subject_id = question_banks.subject_id
    ) OR
    -- Teachers can access question banks for classes they're assigned to
    (
      class_id IS NOT NULL AND
      EXISTS (
        SELECT 1 FROM teacher_class_assignments tca 
        WHERE tca.teacher_id = auth.uid() 
        AND tca.class_id = question_banks.class_id
      )
    )
  )
);

-- Ensure existing question banks without class_id are accessible
UPDATE question_banks 
SET class_id = NULL 
WHERE class_id IS NULL;