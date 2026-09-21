CREATE OR REPLACE FUNCTION public.sync_student_archive_status()
RETURNS trigger
LANGUAGE plpgsql
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

REVOKE ALL ON FUNCTION public.sync_student_archive_status() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sync_student_archive_status() TO service_role;

UPDATE public.students
SET status = 'inactive'
WHERE archived_at IS NOT NULL
  AND status IS DISTINCT FROM 'inactive';