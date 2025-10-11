-- Create storage bucket for admission documents
INSERT INTO storage.buckets (id, name, public) 
VALUES ('admission-documents', 'admission-documents', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for admission documents bucket
CREATE POLICY "Admins can manage admission documents"
ON storage.objects
FOR ALL
USING (
  bucket_id = 'admission-documents' AND
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Users can view their own application documents"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'admission-documents' AND
  (
    -- Check if the folder name matches an application the user has access to
    EXISTS (
      SELECT 1 FROM public.admission_applications aa
      WHERE aa.email = (SELECT email FROM auth.users WHERE id = auth.uid())
      AND (storage.foldername(name))[1] = aa.id::text
    )
    OR
    -- Or if they are an admin
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  )
);

CREATE POLICY "Public can upload application documents"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'admission-documents'
);