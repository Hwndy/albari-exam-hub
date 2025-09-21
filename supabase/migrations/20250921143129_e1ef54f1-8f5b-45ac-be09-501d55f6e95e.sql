-- Fix RLS policies for exams to allow teachers to see admin-created exams for their subjects

-- Drop the existing policy
DROP POLICY IF EXISTS "Teachers can manage exams" ON public.exams;

-- Create new policy for teachers to manage their own exams and view admin exams for their subjects
CREATE POLICY "Teachers can manage exams" ON public.exams
FOR ALL USING (
  is_admin() OR 
  created_by = auth.uid() OR 
  (
    is_teacher() AND 
    (
      -- Teacher created this exam
      created_by = auth.uid() OR
      -- Teacher is assigned to teach this subject
      EXISTS (
        SELECT 1 FROM public.teacher_class_assignments tca 
        WHERE tca.teacher_id = auth.uid() 
        AND (tca.class_id = exams.class_id OR exams.class_id IS NULL)
      ) AND
      EXISTS (
        SELECT 1 FROM public.subject_assignments sa 
        WHERE sa.user_id = auth.uid() 
        AND sa.subject_id = exams.subject_id
      )
    )
  )
);