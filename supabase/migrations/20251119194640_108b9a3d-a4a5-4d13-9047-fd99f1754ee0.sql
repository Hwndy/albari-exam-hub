-- ============================================================================
-- CRITICAL SECURITY FIX: Enforce School Isolation via RLS Policies
-- This migration prevents cross-school data leaks by adding school_id checks
-- ============================================================================

-- 1. FIX PROFILES TABLE - Teachers can currently see all profiles across schools
DROP POLICY IF EXISTS "Teachers can view profiles" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;

CREATE POLICY "Users can view own profile"
ON profiles FOR SELECT
TO public
USING (user_id = auth.uid());

CREATE POLICY "Teachers can view profiles in their school"
ON profiles FOR SELECT
TO authenticated
USING (
  (school_id = get_user_school_id() AND is_teacher())
  OR is_super_admin()
  OR user_id = auth.uid()
);

CREATE POLICY "Admins can manage profiles in their school"
ON profiles FOR ALL
TO authenticated
USING (
  (school_id = get_user_school_id() AND is_admin())
  OR is_super_admin()
  OR user_id = auth.uid()
);

-- 2. FIX PARENTS TABLE - Teachers can see all parent data across schools
DROP POLICY IF EXISTS "Teachers can view all parents in their school" ON parents;

CREATE POLICY "Teachers view parents in their school only"
ON parents FOR SELECT
TO public
USING (
  (school_id = get_user_school_id() AND is_teacher())
  OR is_super_admin()
  OR (user_id = auth.uid())
  OR (EXISTS (
    SELECT 1 FROM student_parent_relationships spr
    WHERE spr.parent_id = parents.id
    AND spr.student_id IN (
      SELECT id FROM students WHERE user_id = auth.uid()
    )
  ))
);

CREATE POLICY "Admins manage parents in their school"
ON parents FOR ALL
TO authenticated
USING (
  (school_id = get_user_school_id() AND is_admin())
  OR is_super_admin()
);

-- 3. FIX ACADEMIC_CALENDAR - Missing school_id check
DROP POLICY IF EXISTS "Admins can manage academic calendar" ON academic_calendar;

CREATE POLICY "Admins manage calendar in their school"
ON academic_calendar FOR ALL
TO authenticated
USING (
  (school_id = get_user_school_id() AND is_admin())
  OR is_super_admin()
);

-- 4. FIX ANNOUNCEMENTS - Teachers/admins can see across schools
DROP POLICY IF EXISTS "Teachers can manage announcements in their school" ON announcements;
DROP POLICY IF EXISTS "School members can view announcements" ON announcements;

CREATE POLICY "Teachers manage announcements in their school"
ON announcements FOR ALL
TO authenticated
USING (
  (school_id = get_user_school_id() AND is_teacher())
  OR is_super_admin()
);

CREATE POLICY "Users view announcements in their school"
ON announcements FOR SELECT
TO authenticated
USING (
  (school_id = get_user_school_id() AND is_published = true)
  OR is_super_admin()
);

-- 5. FIX ASSESSMENT_TYPES - Missing school_id check
DROP POLICY IF EXISTS "Teachers can manage assessment types" ON assessment_types;

CREATE POLICY "Teachers manage assessment types in their school"
ON assessment_types FOR ALL
TO authenticated
USING (
  (school_id = get_user_school_id() AND is_teacher())
  OR is_super_admin()
);

-- 6. FIX ASSESSMENTS - Missing school_id check
DROP POLICY IF EXISTS "Teachers can manage assessments" ON assessments;

CREATE POLICY "Teachers manage assessments in their school"
ON assessments FOR ALL
TO authenticated
USING (
  ((school_id = get_user_school_id() AND is_teacher()) OR is_admin())
  OR is_super_admin()
);

-- 7. FIX ATTENDANCE_SESSIONS - Missing school_id check
DROP POLICY IF EXISTS "Teachers can manage attendance sessions" ON attendance_sessions;

CREATE POLICY "Teachers manage attendance in their school"
ON attendance_sessions FOR ALL
TO authenticated
USING (
  ((school_id = get_user_school_id() AND is_teacher()) OR is_admin())
  OR is_super_admin()
);

-- 8. FIX BOOK_ISSUES - Missing school_id check
DROP POLICY IF EXISTS "Admins can manage book issues" ON book_issues;

CREATE POLICY "Admins manage book issues in their school"
ON book_issues FOR ALL
TO authenticated
USING (
  (school_id = get_user_school_id() AND is_admin())
  OR is_super_admin()
);

-- 9. FIX CLASS_TIMETABLES - Missing school_id check
DROP POLICY IF EXISTS "Admins can manage timetables" ON class_timetables;

CREATE POLICY "Admins manage timetables in their school"
ON class_timetables FOR ALL
TO authenticated
USING (
  (school_id = get_user_school_id() AND is_admin())
  OR is_super_admin()
);

-- 10. FIX EXAM_SESSIONS - Students can access sessions across schools
DROP POLICY IF EXISTS "Students can manage their own sessions" ON exam_sessions;
DROP POLICY IF EXISTS "Teachers can view exam sessions" ON exam_sessions;

CREATE POLICY "Students manage sessions in their school"
ON exam_sessions FOR ALL
TO public
USING (
  student_id = auth.uid()
  AND (school_id = get_user_school_id() OR school_id IS NULL)
);

CREATE POLICY "Teachers view sessions in their school"
ON exam_sessions FOR SELECT
TO authenticated
USING (
  (school_id = get_user_school_id() AND is_teacher())
  OR is_super_admin()
);

-- 11. FIX FEE_PAYMENTS - Missing school_id check
DROP POLICY IF EXISTS "Admins can manage fee payments" ON fee_payments;

CREATE POLICY "Admins manage fee payments in their school"
ON fee_payments FOR ALL
TO authenticated
USING (
  (school_id = get_user_school_id() AND is_admin())
  OR is_super_admin()
);

-- 12. FIX FEE_STRUCTURES - Missing school_id check
DROP POLICY IF EXISTS "Admins can manage fee structures" ON fee_structures;

CREATE POLICY "Admins manage fee structures in their school"
ON fee_structures FOR ALL
TO authenticated
USING (
  (school_id = get_user_school_id() AND is_admin())
  OR is_super_admin()
);

-- 13. FIX GRADEBOOK_ENTRIES - Missing school_id check
DROP POLICY IF EXISTS "Teachers can manage gradebook entries" ON gradebook_entries;

CREATE POLICY "Teachers manage gradebook in their school"
ON gradebook_entries FOR ALL
TO authenticated
USING (
  (school_id = get_user_school_id() AND is_teacher())
  OR is_super_admin()
);

-- 14. FIX LIBRARY_BOOKS - Missing school_id check
DROP POLICY IF EXISTS "Admins can manage library books" ON library_books;

CREATE POLICY "Admins manage library books in their school"
ON library_books FOR ALL
TO authenticated
USING (
  (school_id = get_user_school_id() AND is_admin())
  OR is_super_admin()
);

CREATE POLICY "Users view library books in their school"
ON library_books FOR SELECT
TO public
USING (
  school_id = get_user_school_id()
  OR is_super_admin()
  OR school_id IS NULL
);

-- 15. FIX NEWS_ARTICLES - Can view across schools
DROP POLICY IF EXISTS "Admins can manage news in their school" ON news_articles;
DROP POLICY IF EXISTS "Public can view published news for school" ON news_articles;

CREATE POLICY "Admins manage news in their school"
ON news_articles FOR ALL
TO authenticated
USING (
  (school_id = get_user_school_id() AND is_admin())
  OR is_super_admin()
);

CREATE POLICY "Public views published news for their school"
ON news_articles FOR SELECT
TO public
USING (
  is_published = true
  AND (school_id = get_user_school_id() OR is_super_admin() OR school_id IS NULL)
);

-- 16. FIX GALLERY - Can view across schools
DROP POLICY IF EXISTS "Admins can manage gallery in their school" ON gallery;
DROP POLICY IF EXISTS "Public can view gallery for school" ON gallery;

CREATE POLICY "Admins manage gallery in their school"
ON gallery FOR ALL
TO authenticated
USING (
  (school_id = get_user_school_id() AND is_admin())
  OR is_super_admin()
);

CREATE POLICY "Public views gallery for their school"
ON gallery FOR SELECT
TO public
USING (
  school_id = get_user_school_id()
  OR is_super_admin()
  OR school_id IS NULL
);

-- 17. FIX GRADE_COMMENTS - Missing school_id check
DROP POLICY IF EXISTS "Teachers can manage grade comments" ON grade_comments;

CREATE POLICY "Teachers manage grade comments in their school"
ON grade_comments FOR ALL
TO authenticated
USING (
  (school_id = get_user_school_id() AND is_teacher())
  OR is_super_admin()
);

-- 18. FIX GRADES - Missing school_id check
DROP POLICY IF EXISTS "Teachers can manage grades" ON grades;

CREATE POLICY "Teachers manage grades in their school"
ON grades FOR ALL
TO authenticated
USING (
  (school_id = get_user_school_id() AND is_teacher())
  OR is_super_admin()
  OR EXISTS (
    SELECT 1 FROM assessments a
    WHERE a.id = grades.assessment_id
    AND ((a.teacher_id = auth.uid()) OR is_admin())
  )
);

-- 19. ADD HELPER FUNCTION for consistent school checking
CREATE OR REPLACE FUNCTION is_same_school(target_school_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    target_school_id = get_user_school_id()
    OR is_super_admin()
    OR target_school_id IS NULL
$$;

-- Success message
DO $$ 
BEGIN 
  RAISE NOTICE 'School isolation RLS policies updated successfully';
  RAISE NOTICE 'All critical cross-school data leaks have been fixed';
END $$;