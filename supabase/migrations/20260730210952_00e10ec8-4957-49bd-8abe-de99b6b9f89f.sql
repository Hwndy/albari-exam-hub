
-- 1. Parent children: match class assignment on student id OR auth user id
CREATE OR REPLACE FUNCTION public.get_parent_children()
 RETURNS TABLE(student_id uuid, full_name text, admission_number text, gender text, date_of_birth date, status text, class_id uuid, class_name text, relationship_id uuid, can_view_grades boolean, can_view_attendance boolean, can_view_fees boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT DISTINCT ON (s.id)
         s.id, pr.full_name, s.admission_number, s.gender, s.date_of_birth, s.status,
         c.id, c.name, spr.id,
         spr.can_view_grades, spr.can_view_attendance, spr.can_view_fees
  FROM public.parents p
  JOIN public.student_parent_relationships spr ON spr.parent_id = p.id
  JOIN public.students s ON s.id = spr.student_id
  LEFT JOIN public.profiles pr ON pr.user_id = s.user_id
  LEFT JOIN public.class_assignments ca
    ON ca.student_id = s.id OR ca.student_id = s.user_id
  LEFT JOIN public.classes c ON c.id = ca.class_id
  WHERE p.user_id = auth.uid()
  ORDER BY s.id, c.name NULLS LAST;
$function$;

-- 2. Staff self-service fields
ALTER TABLE public.staff_details
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS photo_url text,
  ADD COLUMN IF NOT EXISTS blood_group text,
  ADD COLUMN IF NOT EXISTS date_of_birth date,
  ADD COLUMN IF NOT EXISTS next_of_kin jsonb NOT NULL DEFAULT '{}'::jsonb;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.staff_details TO authenticated;
GRANT ALL ON public.staff_details TO service_role;

DROP POLICY IF EXISTS "Staff view own details" ON public.staff_details;
CREATE POLICY "Staff view own details" ON public.staff_details
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Staff update own details" ON public.staff_details;
CREATE POLICY "Staff update own details" ON public.staff_details
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- staff may not change their own pay or identity fields
CREATE OR REPLACE FUNCTION public.protect_staff_self_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_admin() THEN
    RETURN NEW;
  END IF;
  IF NEW.user_id = auth.uid() THEN
    NEW.salary := OLD.salary;
    NEW.employee_id := OLD.employee_id;
    NEW.designation := OLD.designation;
    NEW.department := OLD.department;
    NEW.employment_type := OLD.employment_type;
    NEW.status := OLD.status;
    NEW.join_date := OLD.join_date;
    NEW.user_id := OLD.user_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_staff_self_update ON public.staff_details;
CREATE TRIGGER trg_protect_staff_self_update
  BEFORE UPDATE ON public.staff_details
  FOR EACH ROW EXECUTE FUNCTION public.protect_staff_self_update();

-- 3. Payroll lifecycle fields
ALTER TABLE public.payroll_periods
  ADD COLUMN IF NOT EXISTS pay_date date,
  ADD COLUMN IF NOT EXISTS paid_at timestamptz,
  ADD COLUMN IF NOT EXISTS closed_at timestamptz;

ALTER TABLE public.payroll_items
  ADD COLUMN IF NOT EXISTS bank_account text,
  ADD COLUMN IF NOT EXISTS bank_name text,
  ADD COLUMN IF NOT EXISTS payment_reference text;

-- 4. Next employee id helper
CREATE OR REPLACE FUNCTION public.next_employee_id()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_year text := to_char(now(), 'YYYY');
  v_next int;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;
  SELECT COALESCE(MAX(NULLIF(regexp_replace(employee_id, '^.*/', ''), '')::int), 0) + 1
    INTO v_next
  FROM public.staff_details
  WHERE employee_id LIKE 'ALB/STF/%'
    AND regexp_replace(employee_id, '^.*/', '') ~ '^[0-9]+$';
  RETURN 'ALB/STF/' || LPAD(v_next::text, 4, '0');
END;
$$;
