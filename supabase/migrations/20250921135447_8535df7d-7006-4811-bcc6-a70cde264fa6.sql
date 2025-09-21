-- Add teacher class assignments table
CREATE TABLE IF NOT EXISTS public.teacher_class_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL,
  class_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(teacher_id, class_id)
);

-- Enable RLS
ALTER TABLE public.teacher_class_assignments ENABLE ROW LEVEL SECURITY;

-- RLS policies for teacher class assignments
CREATE POLICY "Teachers can view their class assignments" 
ON public.teacher_class_assignments 
FOR SELECT 
USING (teacher_id = auth.uid() OR is_admin());

CREATE POLICY "Admins can manage teacher class assignments" 
ON public.teacher_class_assignments 
FOR ALL 
USING (is_admin());

-- Add support for different question types
ALTER TABLE public.questions 
ADD COLUMN IF NOT EXISTS allow_multiple_correct boolean DEFAULT false;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_teacher_class_assignments_teacher_id ON public.teacher_class_assignments(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_class_assignments_class_id ON public.teacher_class_assignments(class_id);

-- Update RLS policies for exams to include teacher-class assignments
DROP POLICY IF EXISTS "Teachers can manage exams" ON public.exams;
CREATE POLICY "Teachers can manage exams" 
ON public.exams 
FOR ALL 
USING (
  is_admin() OR 
  created_by = auth.uid() OR 
  (
    is_teacher() AND 
    (
      class_id IS NULL OR 
      EXISTS (
        SELECT 1 FROM public.teacher_class_assignments tca 
        WHERE tca.teacher_id = auth.uid() AND tca.class_id = exams.class_id
      )
    )
  )
);

-- Update exam sessions policy to fix the live monitor issue
DROP POLICY IF EXISTS "Teachers can view all sessions" ON public.exam_sessions;
CREATE POLICY "Teachers can view exam sessions" 
ON public.exam_sessions 
FOR SELECT 
USING (
  is_admin() OR 
  EXISTS (
    SELECT 1 FROM public.exams e
    LEFT JOIN public.teacher_class_assignments tca ON tca.class_id = e.class_id
    WHERE e.id = exam_sessions.exam_id 
    AND (
      e.created_by = auth.uid() OR 
      tca.teacher_id = auth.uid() OR
      is_admin()
    )
  )
);