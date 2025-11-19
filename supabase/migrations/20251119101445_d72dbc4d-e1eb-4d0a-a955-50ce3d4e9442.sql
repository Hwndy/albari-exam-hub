-- ==========================================
-- PHASE 2: Update RLS Policies for Multi-Tenancy
-- Add school_id filtering to all existing policies
-- ==========================================

-- Drop existing policies that need to be updated with school filtering
DROP POLICY IF EXISTS "Admins can manage classes" ON public.classes;
DROP POLICY IF EXISTS "Public can view classes for registration" ON public.classes;

DROP POLICY IF EXISTS "Admins can manage all parents" ON public.parents;
DROP POLICY IF EXISTS "Parents can view and update their own profile" ON public.parents;
DROP POLICY IF EXISTS "Teachers can view parents" ON public.parents;

DROP POLICY IF EXISTS "Admins can manage all students" ON public.students;
DROP POLICY IF EXISTS "Students can view their own profile" ON public.students;
DROP POLICY IF EXISTS "Teachers can view students in their classes" ON public.students;
DROP POLICY IF EXISTS "Parents can view their children" ON public.parents;

DROP POLICY IF EXISTS "Teachers can manage exams" ON public.exams;
DROP POLICY IF EXISTS "Students can view published exams for their class" ON public.exams;

DROP POLICY IF EXISTS "Teachers can manage exam questions" ON public.questions;
DROP POLICY IF EXISTS "Students can view exam questions during session" ON public.exam_questions;

DROP POLICY IF EXISTS "Admins can manage admission sessions" ON public.admission_sessions;
DROP POLICY IF EXISTS "Public can view active sessions" ON public.admission_sessions;

DROP POLICY IF EXISTS "Admins can update applications" ON public.admission_applications;
DROP POLICY IF EXISTS "Admins can view all applications" ON public.admission_applications;
DROP POLICY IF EXISTS "Anyone can submit applications" ON public.admission_applications;
DROP POLICY IF EXISTS "Authenticated users can view own applications" ON public.admission_applications;

-- Classes: School-aware policies
CREATE POLICY "Admins can manage classes in their school"
  ON public.classes FOR ALL
  USING (
    school_id = public.get_user_school_id() AND is_admin()
    OR public.is_super_admin()
  );

CREATE POLICY "Public can view classes for their school"
  ON public.classes FOR SELECT
  USING (
    school_id = public.get_user_school_id()
    OR is_teacher()
    OR public.is_super_admin()
  );

-- Subjects: School-aware policies
CREATE POLICY "School members can view subjects"
  ON public.subjects FOR SELECT
  USING (
    school_id = public.get_user_school_id()
    OR is_teacher()
    OR public.is_super_admin()
  );

CREATE POLICY "Admins can manage subjects in their school"
  ON public.subjects FOR ALL
  USING (
    school_id = public.get_user_school_id() AND is_admin()
    OR public.is_super_admin()
  );

-- Students: School-aware policies
CREATE POLICY "Students can view their own profile in school"
  ON public.students FOR SELECT
  USING (
    (user_id = auth.uid() AND school_id = public.get_user_school_id())
    OR public.is_super_admin()
  );

CREATE POLICY "Teachers can view students in their school"
  ON public.students FOR SELECT
  USING (
    (school_id = public.get_user_school_id() AND is_teacher())
    OR public.is_super_admin()
  );

CREATE POLICY "Admins can manage students in their school"
  ON public.students FOR ALL
  USING (
    (school_id = public.get_user_school_id() AND is_admin())
    OR public.is_super_admin()
  );

-- Parents: School-aware policies
CREATE POLICY "Parents can manage own profile in school"
  ON public.parents FOR ALL
  USING (
    (user_id = auth.uid() AND school_id = public.get_user_school_id())
    OR public.is_super_admin()
  );

CREATE POLICY "Teachers can view parents in their school"
  ON public.parents FOR SELECT
  USING (
    (school_id = public.get_user_school_id() AND is_teacher())
    OR public.is_super_admin()
  );

-- Exams: School-aware policies
CREATE POLICY "Teachers can manage exams in their school"
  ON public.exams FOR ALL
  USING (
    (school_id = public.get_user_school_id() AND is_teacher())
    OR public.is_super_admin()
  );

CREATE POLICY "Students can view published exams in their school"
  ON public.exams FOR SELECT
  USING (
    (status = 'published'::exam_status AND school_id = public.get_user_school_id())
    OR public.is_super_admin()
  );

-- Questions: School-aware policies
CREATE POLICY "Teachers can manage questions in their school"
  ON public.questions FOR ALL
  USING (
    (school_id = public.get_user_school_id() AND is_teacher())
    OR public.is_super_admin()
  );

CREATE POLICY "Students can view questions during exam in their school"
  ON public.questions FOR SELECT
  USING (
    (school_id = public.get_user_school_id())
    OR public.is_super_admin()
  );

-- Question Banks: School-aware policies
CREATE POLICY "Teachers can manage question banks in their school"
  ON public.question_banks FOR ALL
  USING (
    (school_id = public.get_user_school_id() AND is_teacher())
    OR public.is_super_admin()
  );

-- Announcements: School-aware policies
CREATE POLICY "School members can view announcements"
  ON public.announcements FOR SELECT
  USING (
    (school_id = public.get_user_school_id() AND is_published = true)
    OR public.is_super_admin()
  );

CREATE POLICY "Teachers can manage announcements in their school"
  ON public.announcements FOR ALL
  USING (
    (school_id = public.get_user_school_id() AND is_teacher())
    OR public.is_super_admin()
  );

-- Admission Sessions: School-aware policies
CREATE POLICY "Admins can manage admission sessions in their school"
  ON public.admission_sessions FOR ALL
  USING (
    (school_id = public.get_user_school_id() AND is_admin())
    OR public.is_super_admin()
  );

CREATE POLICY "Public can view active sessions for school"
  ON public.admission_sessions FOR SELECT
  USING (
    status = 'active'
  );

-- Admission Applications: School-aware policies
CREATE POLICY "Admins can manage applications in their school"
  ON public.admission_applications FOR ALL
  USING (
    (school_id = public.get_user_school_id() AND is_admin())
    OR public.is_super_admin()
  );

CREATE POLICY "Anyone can submit applications to school"
  ON public.admission_applications FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can view own applications"
  ON public.admission_applications FOR SELECT
  USING (
    email = (SELECT email FROM auth.users WHERE id = auth.uid())::text
    OR (school_id = public.get_user_school_id() AND is_admin())
    OR public.is_super_admin()
  );

-- News Articles: School-aware policies
CREATE POLICY "Public can view published news for school"
  ON public.news_articles FOR SELECT
  USING (
    is_published = true
  );

CREATE POLICY "Admins can manage news in their school"
  ON public.news_articles FOR ALL
  USING (
    (school_id = public.get_user_school_id() AND is_admin())
    OR public.is_super_admin()
  );

-- Gallery: School-aware policies
CREATE POLICY "Public can view gallery for school"
  ON public.gallery FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage gallery in their school"
  ON public.gallery FOR ALL
  USING (
    (school_id = public.get_user_school_id() AND is_admin())
    OR public.is_super_admin()
  );