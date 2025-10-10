-- Fix security warnings from previous migration

-- Fix generate_application_number function - add search_path
CREATE OR REPLACE FUNCTION public.generate_application_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.application_number := 'APP' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(NEXTVAL('admission_app_seq')::TEXT, 6, '0');
  RETURN NEW;
END;
$$;

-- Fix log_admission_status_change function - add search_path
CREATE OR REPLACE FUNCTION public.log_admission_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.admission_workflow_logs (application_id, from_status, to_status, changed_by, notes)
    VALUES (NEW.id, OLD.status, NEW.status, auth.uid(), 'Status changed from ' || OLD.status || ' to ' || NEW.status);
  END IF;
  RETURN NEW;
END;
$$;