CREATE OR REPLACE FUNCTION public.guard_enrolled_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status = 'enrolled'::admission_status
     AND NEW.status IS DISTINCT FROM OLD.status
     AND NEW.status <> 'withdrawn'::admission_status THEN
    RAISE EXCEPTION 'Application % is already enrolled and cannot be moved back to %', OLD.application_number, NEW.status;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_enrolled_status ON public.admission_applications;
CREATE TRIGGER trg_guard_enrolled_status
BEFORE UPDATE OF status ON public.admission_applications
FOR EACH ROW EXECUTE FUNCTION public.guard_enrolled_status();