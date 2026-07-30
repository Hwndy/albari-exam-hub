CREATE OR REPLACE FUNCTION public.next_admission_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_year text := to_char(now(), 'YYYY');
  v_next int;
  v_candidate text;
BEGIN
  FOR i IN 1..50 LOOP
    SELECT COALESCE(MAX((regexp_replace(admission_number, '^ALB/' || v_year || '/', ''))::int), 0) + 1
      INTO v_next
      FROM public.students
     WHERE admission_number ~ ('^ALB/' || v_year || '/[0-9]+$');

    v_candidate := 'ALB/' || v_year || '/' || lpad(v_next::text, 4, '0');

    IF NOT EXISTS (SELECT 1 FROM public.students WHERE admission_number = v_candidate) THEN
      RETURN v_candidate;
    END IF;
  END LOOP;

  RETURN 'ALB/' || v_year || '/' || lpad((v_next + floor(random() * 1000)::int)::text, 4, '0');
END;
$$;

REVOKE ALL ON FUNCTION public.next_admission_number() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.next_admission_number() TO service_role;
GRANT EXECUTE ON FUNCTION public.next_admission_number() TO authenticated;