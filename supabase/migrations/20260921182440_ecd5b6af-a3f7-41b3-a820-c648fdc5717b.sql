CREATE OR REPLACE FUNCTION public.sync_student_archive_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF NEW.archived_at IS NOT NULL THEN
    NEW.status := 'inactive';
  ELSIF OLD.archived_at IS NOT NULL AND NEW.archived_at IS NULL THEN
    NEW.status := 'active';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.sync_student_archive_status() FROM PUBLIC, anon, authenticated, service_role;