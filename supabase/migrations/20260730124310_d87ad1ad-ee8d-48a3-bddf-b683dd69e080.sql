CREATE POLICY "Students can view their own record"
ON public.students FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Students can update their own record"
ON public.students FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.protect_student_self_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_admin() OR public.is_teacher() THEN
    RETURN NEW;
  END IF;
  IF NEW.user_id = auth.uid() THEN
    NEW.admission_number := OLD.admission_number;
    NEW.status := OLD.status;
    NEW.admission_date := OLD.admission_date;
    NEW.user_id := OLD.user_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_student_self_update ON public.students;
CREATE TRIGGER trg_protect_student_self_update
BEFORE UPDATE ON public.students
FOR EACH ROW EXECUTE FUNCTION public.protect_student_self_update();