-- COMPREHENSIVE MULTI-TENANCY FIX: Clean data, add school_id, update RLS policies

-- ============================================================
-- STEP 1: Clean orphaned records
-- ============================================================

-- Delete teacher_class_assignments with invalid class_id
DELETE FROM teacher_class_assignments tca
WHERE NOT EXISTS (SELECT 1 FROM classes c WHERE c.id = tca.class_id);

-- ============================================================
-- STEP 2: Add school_id columns
-- ============================================================

ALTER TABLE class_assignments ADD COLUMN IF NOT EXISTS school_id uuid REFERENCES schools(id);
ALTER TABLE exam_questions ADD COLUMN IF NOT EXISTS school_id uuid REFERENCES schools(id);
ALTER TABLE question_options ADD COLUMN IF NOT EXISTS school_id uuid REFERENCES schools(id);
ALTER TABLE question_responses ADD COLUMN IF NOT EXISTS school_id uuid REFERENCES schools(id);
ALTER TABLE student_attendance ADD COLUMN IF NOT EXISTS school_id uuid REFERENCES schools(id);
ALTER TABLE subject_assignments ADD COLUMN IF NOT EXISTS school_id uuid REFERENCES schools(id);
ALTER TABLE teacher_class_assignments ADD COLUMN IF NOT EXISTS school_id uuid REFERENCES schools(id);
ALTER TABLE student_parent_relationships ADD COLUMN IF NOT EXISTS school_id uuid REFERENCES schools(id);
ALTER TABLE periods ADD COLUMN IF NOT EXISTS school_id uuid REFERENCES schools(id);
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS school_id uuid REFERENCES schools(id);

-- ============================================================
-- STEP 3: Populate school_id from related tables
-- ============================================================

UPDATE class_assignments ca 
SET school_id = c.school_id 
FROM classes c 
WHERE ca.class_id = c.id AND ca.school_id IS NULL;

UPDATE exam_questions eq 
SET school_id = e.school_id 
FROM exams e 
WHERE eq.exam_id = e.id AND eq.school_id IS NULL;

UPDATE question_options qo 
SET school_id = q.school_id 
FROM questions q 
WHERE qo.question_id = q.id AND qo.school_id IS NULL;

UPDATE question_responses qr 
SET school_id = es.school_id 
FROM exam_sessions es 
WHERE qr.session_id = es.id AND qr.school_id IS NULL;

UPDATE student_attendance sa 
SET school_id = s.school_id 
FROM students s 
WHERE sa.student_id = s.id AND sa.school_id IS NULL;

UPDATE subject_assignments sa 
SET school_id = p.school_id 
FROM profiles p 
WHERE sa.user_id = p.user_id AND sa.school_id IS NULL;

UPDATE teacher_class_assignments tca 
SET school_id = c.school_id 
FROM classes c 
WHERE tca.class_id = c.id AND tca.school_id IS NULL;

UPDATE student_parent_relationships spr 
SET school_id = s.school_id 
FROM students s 
WHERE spr.student_id = s.id AND spr.school_id IS NULL;

-- ============================================================
-- STEP 4: Set NOT NULL constraints
-- ============================================================

ALTER TABLE class_assignments ALTER COLUMN school_id SET NOT NULL;
ALTER TABLE exam_questions ALTER COLUMN school_id SET NOT NULL;
ALTER TABLE question_options ALTER COLUMN school_id SET NOT NULL;
ALTER TABLE question_responses ALTER COLUMN school_id SET NOT NULL;
ALTER TABLE student_attendance ALTER COLUMN school_id SET NOT NULL;
ALTER TABLE subject_assignments ALTER COLUMN school_id SET NOT NULL;
ALTER TABLE teacher_class_assignments ALTER COLUMN school_id SET NOT NULL;
ALTER TABLE student_parent_relationships ALTER COLUMN school_id SET NOT NULL;

-- ============================================================
-- STEP 5: Update ALL RLS Policies with School Filtering
-- ============================================================

-- announcements
DROP POLICY IF EXISTS "Admins and teachers can manage announcements" ON announcements;
DROP POLICY IF EXISTS "Teachers manage announcements in their school" ON announcements;
CREATE POLICY "Teachers manage announcements in their school"
ON announcements FOR ALL TO authenticated
USING ((school_id = get_user_school_id() AND is_teacher()) OR is_super_admin());

-- class_assignments
DROP POLICY IF EXISTS "Admins can manage class assignments" ON class_assignments;
DROP POLICY IF EXISTS "Admins manage class assignments in their school" ON class_assignments;
CREATE POLICY "Admins manage class assignments in their school"
ON class_assignments FOR ALL TO authenticated
USING ((school_id = get_user_school_id() AND is_admin()) OR is_super_admin());

DROP POLICY IF EXISTS "Users can view their class assignments" ON class_assignments;
DROP POLICY IF EXISTS "Users view class assignments in their school" ON class_assignments;
CREATE POLICY "Users view class assignments in their school"
ON class_assignments FOR SELECT TO authenticated
USING ((auth.uid() = student_id) OR (school_id = get_user_school_id() AND is_teacher()) OR is_super_admin());

-- exam_questions
DROP POLICY IF EXISTS "Teachers can manage exam questions" ON exam_questions;
DROP POLICY IF EXISTS "Teachers manage exam questions in their school" ON exam_questions;
CREATE POLICY "Teachers manage exam questions in their school"
ON exam_questions FOR ALL TO authenticated
USING ((school_id = get_user_school_id() AND is_teacher()) OR is_super_admin());

-- question_options
DROP POLICY IF EXISTS "Teachers can manage question options" ON question_options;
DROP POLICY IF EXISTS "Teachers manage question options in their school" ON question_options;
CREATE POLICY "Teachers manage question options in their school"
ON question_options FOR ALL TO authenticated
USING ((school_id = get_user_school_id() AND is_teacher()) OR is_super_admin());

DROP POLICY IF EXISTS "Students can view options during exam" ON question_options;
DROP POLICY IF EXISTS "Students view options during exam in their school" ON question_options;
CREATE POLICY "Students view options during exam in their school"
ON question_options FOR SELECT TO public
USING (
  question_id IN (
    SELECT eq.question_id FROM exam_questions eq
    JOIN exam_sessions es ON es.exam_id = eq.exam_id
    WHERE es.student_id = auth.uid() AND es.status = 'in_progress'
  )
);

-- question_responses
DROP POLICY IF EXISTS "Teachers can view all responses" ON question_responses;
DROP POLICY IF EXISTS "Teachers view responses in their school" ON question_responses;
CREATE POLICY "Teachers view responses in their school"
ON question_responses FOR SELECT TO authenticated
USING ((school_id = get_user_school_id() AND is_teacher()) OR is_super_admin());

DROP POLICY IF EXISTS "Students can manage their own responses" ON question_responses;
DROP POLICY IF EXISTS "Students manage responses in their school" ON question_responses;
CREATE POLICY "Students manage responses in their school"
ON question_responses FOR ALL TO public
USING (
  EXISTS (SELECT 1 FROM exam_sessions es WHERE es.id = question_responses.session_id AND es.student_id = auth.uid())
);

-- student_attendance
DROP POLICY IF EXISTS "Teachers can manage attendance records" ON student_attendance;
DROP POLICY IF EXISTS "Teachers manage attendance in their school" ON student_attendance;
CREATE POLICY "Teachers manage attendance in their school"
ON student_attendance FOR ALL TO authenticated
USING ((school_id = get_user_school_id() AND is_teacher()) OR is_super_admin());

DROP POLICY IF EXISTS "Students and parents can view attendance records" ON student_attendance;
DROP POLICY IF EXISTS "Students/parents view attendance in their school" ON student_attendance;
CREATE POLICY "Students/parents view attendance in their school"
ON student_attendance FOR SELECT TO authenticated
USING (
  (student_id IN (SELECT s.id FROM students s WHERE s.user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM student_parent_relationships spr JOIN parents p ON p.id = spr.parent_id
    WHERE spr.student_id = s.id AND p.user_id = auth.uid()
  )))
  OR (school_id = get_user_school_id() AND is_teacher())
  OR is_super_admin()
);

-- subject_assignments
DROP POLICY IF EXISTS "Admins and teachers can manage subject assignments" ON subject_assignments;
DROP POLICY IF EXISTS "Teachers manage subject assignments in their school" ON subject_assignments;
CREATE POLICY "Teachers manage subject assignments in their school"
ON subject_assignments FOR ALL TO authenticated
USING ((school_id = get_user_school_id() AND is_teacher()) OR is_super_admin());

DROP POLICY IF EXISTS "Users can view their subject assignments" ON subject_assignments;
DROP POLICY IF EXISTS "Users view subject assignments in their school" ON subject_assignments;
CREATE POLICY "Users view subject assignments in their school"
ON subject_assignments FOR SELECT TO authenticated
USING (
  (auth.uid() = user_id)
  OR (school_id = get_user_school_id() AND is_teacher())
  OR is_super_admin()
);

-- teacher_class_assignments
DROP POLICY IF EXISTS "Admins can manage teacher class assignments" ON teacher_class_assignments;
DROP POLICY IF EXISTS "Admins manage teacher assignments in their school" ON teacher_class_assignments;
CREATE POLICY "Admins manage teacher assignments in their school"
ON teacher_class_assignments FOR ALL TO authenticated
USING ((school_id = get_user_school_id() AND is_admin()) OR is_super_admin());

DROP POLICY IF EXISTS "Teachers can view their class assignments" ON teacher_class_assignments;
DROP POLICY IF EXISTS "Teachers view assignments in their school" ON teacher_class_assignments;
CREATE POLICY "Teachers view assignments in their school"
ON teacher_class_assignments FOR SELECT TO authenticated
USING (
  (teacher_id = auth.uid())
  OR (school_id = get_user_school_id() AND is_admin())
  OR is_super_admin()
);

-- student_parent_relationships
DROP POLICY IF EXISTS "Admins can manage family relationships" ON student_parent_relationships;
DROP POLICY IF EXISTS "Admins manage relationships in their school" ON student_parent_relationships;
CREATE POLICY "Admins manage relationships in their school"
ON student_parent_relationships FOR ALL TO authenticated
USING ((school_id = get_user_school_id() AND is_admin()) OR is_super_admin());

DROP POLICY IF EXISTS "Parents and students can view relationships" ON student_parent_relationships;
DROP POLICY IF EXISTS "Parents/students view relationships in their school" ON student_parent_relationships;
CREATE POLICY "Parents/students view relationships in their school"
ON student_parent_relationships FOR SELECT TO authenticated
USING (
  (EXISTS (SELECT 1 FROM students s WHERE s.id = student_parent_relationships.student_id AND s.user_id = auth.uid()))
  OR (EXISTS (SELECT 1 FROM parents p WHERE p.id = student_parent_relationships.parent_id AND p.user_id = auth.uid()))
  OR (school_id = get_user_school_id() AND is_admin())
  OR is_super_admin()
);

-- periods
DROP POLICY IF EXISTS "Admins manage periods in their school" ON periods;
CREATE POLICY "Admins manage periods in their school"
ON periods FOR ALL TO authenticated
USING ((school_id = get_user_school_id() AND is_admin()) OR is_super_admin());

DROP POLICY IF EXISTS "School members view periods" ON periods;
CREATE POLICY "School members view periods"
ON periods FOR SELECT TO authenticated
USING ((school_id = get_user_school_id()) OR is_super_admin());

-- rooms
DROP POLICY IF EXISTS "Admins manage rooms in their school" ON rooms;
CREATE POLICY "Admins manage rooms in their school"
ON rooms FOR ALL TO authenticated
USING ((school_id = get_user_school_id() AND is_admin()) OR is_super_admin());

DROP POLICY IF EXISTS "School members view rooms" ON rooms;
CREATE POLICY "School members view rooms"
ON rooms FOR SELECT TO authenticated
USING ((school_id = get_user_school_id()) OR is_super_admin());