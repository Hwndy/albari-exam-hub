
-- 1. Extend student_parent_relationships
ALTER TABLE public.student_parent_relationships
  ADD COLUMN IF NOT EXISTS verified boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS linked_at timestamptz NOT NULL DEFAULT now();

-- 2. Extend fee_payments for online payments
ALTER TABLE public.fee_payments
  ADD COLUMN IF NOT EXISTS parent_user_id uuid,
  ADD COLUMN IF NOT EXISTS fee_installment_id uuid REFERENCES public.fee_installments(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS payment_reference text,
  ADD COLUMN IF NOT EXISTS paid_at timestamptz,
  ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;

CREATE UNIQUE INDEX IF NOT EXISTS fee_payments_payment_reference_key
  ON public.fee_payments(payment_reference) WHERE payment_reference IS NOT NULL;

-- 3. Auto-create parents row on parent signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_role app_role;
BEGIN
  v_role := COALESCE((NEW.raw_user_meta_data ->> 'role')::app_role, 'student'::app_role);

  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email));

  INSERT INTO public.user_roles (user_id, role, created_by)
  VALUES (NEW.id, v_role, NEW.id)
  ON CONFLICT (user_id, role) DO NOTHING;

  IF v_role = 'parent' THEN
    INSERT INTO public.parents (user_id, phone_primary)
    VALUES (NEW.id, NEW.raw_user_meta_data ->> 'phone')
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

-- Backfill parents rows for any existing parent users missing one
INSERT INTO public.parents (user_id)
SELECT ur.user_id FROM public.user_roles ur
LEFT JOIN public.parents p ON p.user_id = ur.user_id
WHERE ur.role = 'parent' AND p.id IS NULL;

-- 4. RPC: parent-initiated linking
CREATE OR REPLACE FUNCTION public.link_parent_to_student(
  p_admission_number text,
  p_date_of_birth date,
  p_relationship_type text DEFAULT 'parent'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_parent_id uuid;
  v_student record;
  v_rel_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE='42501';
  END IF;

  IF NOT public.has_role(auth.uid(), 'parent'::app_role) THEN
    RAISE EXCEPTION 'Only parents can link children' USING ERRCODE='42501';
  END IF;

  SELECT id INTO v_parent_id FROM public.parents WHERE user_id = auth.uid();
  IF v_parent_id IS NULL THEN
    INSERT INTO public.parents (user_id) VALUES (auth.uid()) RETURNING id INTO v_parent_id;
  END IF;

  SELECT s.id, s.admission_number, s.date_of_birth, p.full_name
  INTO v_student
  FROM public.students s
  LEFT JOIN public.profiles p ON p.user_id = s.user_id
  WHERE lower(s.admission_number) = lower(trim(p_admission_number))
    AND s.date_of_birth = p_date_of_birth;

  IF v_student.id IS NULL THEN
    RAISE EXCEPTION 'No student found with that admission number and date of birth' USING ERRCODE='P0002';
  END IF;

  -- Idempotent link
  SELECT id INTO v_rel_id FROM public.student_parent_relationships
    WHERE parent_id = v_parent_id AND student_id = v_student.id;

  IF v_rel_id IS NULL THEN
    INSERT INTO public.student_parent_relationships (
      student_id, parent_id, relationship_type, is_primary_contact,
      can_view_grades, can_view_attendance, can_view_fees, verified
    ) VALUES (
      v_student.id, v_parent_id, COALESCE(p_relationship_type, 'parent'), true,
      true, true, true, true
    ) RETURNING id INTO v_rel_id;
  END IF;

  RETURN jsonb_build_object(
    'relationship_id', v_rel_id,
    'student_id', v_student.id,
    'admission_number', v_student.admission_number,
    'full_name', v_student.full_name
  );
END;
$$;

-- 5. Admin RPCs for manual linking
CREATE OR REPLACE FUNCTION public.admin_link_parent_to_student(
  p_parent_user_id uuid,
  p_student_id uuid,
  p_relationship_type text DEFAULT 'parent'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_parent_id uuid;
  v_rel_id uuid;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT id INTO v_parent_id FROM public.parents WHERE user_id = p_parent_user_id;
  IF v_parent_id IS NULL THEN
    INSERT INTO public.parents (user_id) VALUES (p_parent_user_id) RETURNING id INTO v_parent_id;
  END IF;

  SELECT id INTO v_rel_id FROM public.student_parent_relationships
    WHERE parent_id = v_parent_id AND student_id = p_student_id;

  IF v_rel_id IS NULL THEN
    INSERT INTO public.student_parent_relationships (
      student_id, parent_id, relationship_type, is_primary_contact,
      can_view_grades, can_view_attendance, can_view_fees, verified
    ) VALUES (
      p_student_id, v_parent_id, COALESCE(p_relationship_type, 'parent'), true,
      true, true, true, true
    ) RETURNING id INTO v_rel_id;
  END IF;

  RETURN v_rel_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_unlink_parent(p_relationship_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Not authorized'; END IF;
  DELETE FROM public.student_parent_relationships WHERE id = p_relationship_id;
END;
$$;

-- 6. Helper: get children for current parent
CREATE OR REPLACE FUNCTION public.get_parent_children()
RETURNS TABLE (
  student_id uuid,
  full_name text,
  admission_number text,
  gender text,
  date_of_birth date,
  status text,
  class_id uuid,
  class_name text,
  relationship_id uuid,
  can_view_grades boolean,
  can_view_attendance boolean,
  can_view_fees boolean
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT s.id, pr.full_name, s.admission_number, s.gender, s.date_of_birth, s.status,
         c.id, c.name, spr.id,
         spr.can_view_grades, spr.can_view_attendance, spr.can_view_fees
  FROM public.parents p
  JOIN public.student_parent_relationships spr ON spr.parent_id = p.id
  JOIN public.students s ON s.id = spr.student_id
  LEFT JOIN public.profiles pr ON pr.user_id = s.user_id
  LEFT JOIN public.class_assignments ca ON ca.student_id = s.id
  LEFT JOIN public.classes c ON c.id = ca.class_id
  WHERE p.user_id = auth.uid()
  ORDER BY pr.full_name NULLS LAST;
$$;

GRANT EXECUTE ON FUNCTION public.link_parent_to_student(text, date, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_link_parent_to_student(uuid, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_unlink_parent(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_parent_children() TO authenticated;

-- 7. RLS for parents to read child-scoped data
-- Grades
DROP POLICY IF EXISTS "Parents read grades of linked children" ON public.gradebook_entries;
CREATE POLICY "Parents read grades of linked children" ON public.gradebook_entries
  FOR SELECT TO authenticated
  USING (public.is_parent_of_student(student_id));

-- Attendance
DROP POLICY IF EXISTS "Parents read attendance of linked children" ON public.student_attendance;
CREATE POLICY "Parents read attendance of linked children" ON public.student_attendance
  FOR SELECT TO authenticated
  USING (public.is_parent_of_student(student_id));

-- Fee structures - any authenticated user can view (class-based)
DROP POLICY IF EXISTS "Authenticated read fee_structures" ON public.fee_structures;
CREATE POLICY "Authenticated read fee_structures" ON public.fee_structures
  FOR SELECT TO authenticated USING (true);

-- Fee payments - parents see child payments
DROP POLICY IF EXISTS "Parents read fee_payments of linked children" ON public.fee_payments;
CREATE POLICY "Parents read fee_payments of linked children" ON public.fee_payments
  FOR SELECT TO authenticated
  USING (public.is_parent_of_student(student_id));

-- Fee installments
DROP POLICY IF EXISTS "Parents read installment plans" ON public.fee_installment_plans;
CREATE POLICY "Parents read installment plans" ON public.fee_installment_plans
  FOR SELECT TO authenticated
  USING (public.is_parent_of_student(student_id));

DROP POLICY IF EXISTS "Parents read installments" ON public.fee_installments;
CREATE POLICY "Parents read installments" ON public.fee_installments
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.fee_installment_plans p
    WHERE p.id = plan_id AND public.is_parent_of_student(p.student_id)
  ));

-- Report card publications
DROP POLICY IF EXISTS "Parents read published report cards" ON public.report_card_publications;
CREATE POLICY "Parents read published report cards" ON public.report_card_publications
  FOR SELECT TO authenticated
  USING (public.is_parent_of_student(student_id));

-- Announcements
DROP POLICY IF EXISTS "Parents read announcements" ON public.announcements;
CREATE POLICY "Parents read announcements" ON public.announcements
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'parent'::app_role));

-- Parents can update their own profile
DROP POLICY IF EXISTS "Parents update own profile" ON public.parents;
CREATE POLICY "Parents update own profile" ON public.parents
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Parents read own profile" ON public.parents;
CREATE POLICY "Parents read own profile" ON public.parents
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

-- Parents read their own relationships
DROP POLICY IF EXISTS "Parents read own relationships" ON public.student_parent_relationships;
CREATE POLICY "Parents read own relationships" ON public.student_parent_relationships
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.parents WHERE id = parent_id AND user_id = auth.uid()
  ) OR public.is_admin() OR public.is_teacher());

-- Academic calendar readable by all authenticated
DROP POLICY IF EXISTS "Auth read calendar" ON public.academic_calendar;
CREATE POLICY "Auth read calendar" ON public.academic_calendar
  FOR SELECT TO authenticated USING (true);
