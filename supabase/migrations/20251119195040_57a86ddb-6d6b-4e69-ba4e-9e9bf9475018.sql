-- Fix Critical Data Leaks: Drop Old Conflicting RLS Policies
-- This removes policies without school_id filtering that allow cross-school access

-- Drop conflicting policies on question_banks (2 policies)
DROP POLICY IF EXISTS "Students can view published question banks" ON question_banks;
DROP POLICY IF EXISTS "Teachers can manage question banks" ON question_banks;

-- Drop conflicting policies on questions (2 policies)
DROP POLICY IF EXISTS "Teachers can manage questions" ON questions;
DROP POLICY IF EXISTS "Students can view questions during exams" ON questions;

-- Drop conflicting policies on students (2 policies)
DROP POLICY IF EXISTS "Teachers and admins can manage students" ON students;

-- Drop conflicting policies on subjects (2 policies)
DROP POLICY IF EXISTS "Admins can manage subjects" ON subjects;
DROP POLICY IF EXISTS "Public can view subjects for registration" ON subjects;

-- All tables now only have school-filtered policies:
-- question_banks: "Teachers can manage question banks in their school"
-- questions: "Teachers can manage questions in their school", "Students can view questions during exam in their school"
-- students: "Admins can manage students in their school", "Teachers can view students in their school", "Parents can view their children's profiles", "Students can view their own profile in school"
-- subjects: "Admins can manage subjects in their school", "School members can view subjects"