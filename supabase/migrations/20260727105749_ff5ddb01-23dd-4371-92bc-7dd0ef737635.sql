
CREATE OR REPLACE FUNCTION public.get_application_documents(p_application_id uuid)
RETURNS SETOF public.admission_documents
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  IF NOT (
    public.is_admin()
    OR EXISTS (
      SELECT 1
      FROM public.admission_interviews ai
      JOIN public.interview_panels ip ON ip.interview_id = ai.id
      WHERE ai.application_id = p_application_id
        AND ip.interviewer_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.admission_applications a
      WHERE a.id = p_application_id
        AND lower(a.email) = lower(public.get_user_email())
    )
  ) THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT * FROM public.admission_documents
  WHERE application_id = p_application_id
  ORDER BY uploaded_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.get_application_documents(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_application_documents(uuid) TO authenticated;

DROP POLICY IF EXISTS "Panel members can view application documents" ON public.admission_documents;
CREATE POLICY "Panel members can view application documents"
ON public.admission_documents
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.admission_interviews ai
    JOIN public.interview_panels ip ON ip.interview_id = ai.id
    WHERE ai.application_id = admission_documents.application_id
      AND ip.interviewer_id = auth.uid()
  )
);
