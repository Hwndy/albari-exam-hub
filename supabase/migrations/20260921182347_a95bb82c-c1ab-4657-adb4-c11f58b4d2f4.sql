REVOKE ALL ON FUNCTION public.sync_student_archive_status() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sync_student_archive_status() TO service_role;