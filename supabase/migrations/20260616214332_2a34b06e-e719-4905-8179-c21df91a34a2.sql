
-- 1) Allow admission_number to be NULL so new students can exist before assignment
ALTER TABLE public.students ALTER COLUMN admission_number DROP NOT NULL;

-- 2) Security-definer helpers that bypass RLS to break recursion cycles
CREATE OR REPLACE FUNCTION public.is_my_student_record(_student_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.students WHERE id = _student_id AND user_id = auth.uid())
$$;

CREATE OR REPLACE FUNCTION public.is_my_parent_record(_parent_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.parents WHERE id = _parent_id AND user_id = auth.uid())
$$;

CREATE OR REPLACE FUNCTION public.is_parent_of_student(_student_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.student_parent_relationships spr
    JOIN public.parents p ON p.id = spr.parent_id
    WHERE spr.student_id = _student_id AND p.user_id = auth.uid()
  )
$$;

-- 3) Rebuild recursive policies

-- students: replace recursive parent-view policy
DROP POLICY IF EXISTS "Parents can view their children's profiles" ON public.students;
CREATE POLICY "Parents can view their children's profiles"
ON public.students FOR SELECT
USING (public.is_parent_of_student(id));

-- student_parent_relationships: collapse duplicate recursive policies
DROP POLICY IF EXISTS "Parents/students view relationships in their school" ON public.student_parent_relationships;
DROP POLICY IF EXISTS "Users can view their family relationships" ON public.student_parent_relationships;
CREATE POLICY "Family and admins view relationships"
ON public.student_parent_relationships FOR SELECT
USING (
  public.is_my_student_record(student_id)
  OR public.is_my_parent_record(parent_id)
  OR ((school_id = public.get_user_school_id()) AND public.is_admin())
  OR public.is_super_admin()
);

-- parents: remove the policy that recursively queried students
DROP POLICY IF EXISTS "Teachers view parents in their school only" ON public.parents;
CREATE POLICY "Teachers and family view parents in their school"
ON public.parents FOR SELECT
USING (
  ((school_id = public.get_user_school_id()) AND public.is_teacher())
  OR public.is_super_admin()
  OR (user_id = auth.uid())
);
