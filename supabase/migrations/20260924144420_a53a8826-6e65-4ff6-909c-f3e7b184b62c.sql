CREATE OR REPLACE FUNCTION public.admin_delete_applications(_ids uuid[])
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n integer;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only administrators can delete applications';
  END IF;
  IF EXISTS (SELECT 1 FROM admission_applications WHERE id = ANY(_ids) AND status = 'enrolled') THEN
    RAISE EXCEPTION 'Enrolled applications cannot be deleted. Archive the student instead.';
  END IF;
  DELETE FROM admission_applications WHERE id = ANY(_ids);
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END $$;
REVOKE ALL ON FUNCTION public.admin_delete_applications(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_delete_applications(uuid[]) TO authenticated;