-- Add SELECT policy for students to view exam_questions during active exam session
CREATE POLICY "Students can view exam questions during exam session"
ON exam_questions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM exam_sessions es
    WHERE es.exam_id = exam_questions.exam_id
    AND es.student_id = auth.uid()
    AND es.status IN ('not_started'::session_status, 'in_progress'::session_status)
  )
);

-- Drop the overly broad questions policy
DROP POLICY IF EXISTS "Students can view questions during exam in their school" ON questions;

-- Create a more secure policy that requires an active exam session
CREATE POLICY "Students can view questions during active exam"
ON questions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM exam_questions eq
    JOIN exam_sessions es ON es.exam_id = eq.exam_id
    WHERE eq.question_id = questions.id
    AND es.student_id = auth.uid()
    AND es.status IN ('not_started'::session_status, 'in_progress'::session_status)
  )
  OR is_teacher()
  OR is_super_admin()
);