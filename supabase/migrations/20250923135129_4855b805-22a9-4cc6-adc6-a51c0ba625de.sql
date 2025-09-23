-- Add foreign key constraint from exam_sessions.student_id to profiles.user_id
ALTER TABLE public.exam_sessions 
ADD CONSTRAINT fk_exam_sessions_student_id 
FOREIGN KEY (student_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;

-- Add index for better performance on the foreign key
CREATE INDEX IF NOT EXISTS idx_exam_sessions_student_id ON public.exam_sessions(student_id);