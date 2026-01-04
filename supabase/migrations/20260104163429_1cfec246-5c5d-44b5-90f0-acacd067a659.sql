-- Fix remaining function search_path issues

CREATE OR REPLACE FUNCTION public.update_admission_sessions_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.cleanup_old_rate_limits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete entries older than 24 hours
  DELETE FROM public.rate_limits
  WHERE window_start < now() - interval '24 hours';
END;
$$;