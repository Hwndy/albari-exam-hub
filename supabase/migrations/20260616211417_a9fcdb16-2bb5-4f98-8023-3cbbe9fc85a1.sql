-- Fix policy that referenced auth.users directly (caused "permission denied for table users")
DROP POLICY IF EXISTS "Users can view their own application documents" ON storage.objects;

CREATE POLICY "Users can view their own application documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'admission-documents' AND (
    EXISTS (
      SELECT 1 FROM public.admission_applications aa
      WHERE aa.email = public.get_user_email()
        AND (storage.foldername(objects.name))[1] = aa.id::text
    )
    OR public.has_role(auth.uid(), 'admin'::app_role)
  )
);

-- Admin-scoped policies for the students/ folder
DROP POLICY IF EXISTS "Admins manage student photos" ON storage.objects;
CREATE POLICY "Admins manage student photos"
ON storage.objects FOR ALL
USING (
  bucket_id = 'admission-documents'
  AND (storage.foldername(name))[1] = 'students'
  AND public.has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  bucket_id = 'admission-documents'
  AND (storage.foldername(name))[1] = 'students'
  AND public.has_role(auth.uid(), 'admin'::app_role)
);