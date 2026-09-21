REVOKE EXECUTE ON FUNCTION public.get_audit_logs(text, text, text, text, uuid, timestamptz, timestamptz, integer, integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_audit_log_actors() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_audit_logs(text, text, text, text, uuid, timestamptz, timestamptz, integer, integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_audit_log_actors() TO authenticated, service_role;

DROP TRIGGER IF EXISTS trg_audit_admission_apps ON public.admission_applications;