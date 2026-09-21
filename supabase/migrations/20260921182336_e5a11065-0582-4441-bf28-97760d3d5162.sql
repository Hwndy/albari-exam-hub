CREATE OR REPLACE FUNCTION public.sync_student_archive_status()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF OLD.archived_at IS NOT NULL AND NEW.archived_at IS NULL THEN
    NEW.status := 'active';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_student_archive_status_trigger ON public.students;
CREATE TRIGGER sync_student_archive_status_trigger
BEFORE INSERT OR UPDATE OF archived_at, status ON public.students
FOR EACH ROW
EXECUTE FUNCTION public.sync_student_archive_status();

UPDATE public.students
SET status = 'inactive'
WHERE archived_at IS NOT NULL
  AND status = 'active';