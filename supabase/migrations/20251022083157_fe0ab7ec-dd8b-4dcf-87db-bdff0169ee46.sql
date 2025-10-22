
-- Fix storage policies for admission-documents bucket to allow public uploads during application

-- Drop existing restrictive policy
DROP POLICY IF EXISTS "Admins can manage admission documents" ON storage.objects;

-- Allow public to upload documents to admission-documents bucket
CREATE POLICY "Public can upload admission documents"
ON storage.objects FOR INSERT
TO public
WITH CHECK (
  bucket_id = 'admission-documents' AND
  (storage.foldername(name))[1] IS NOT NULL
);

-- Allow public to read documents from admission-documents bucket (already public bucket)
CREATE POLICY "Public can view admission documents"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'admission-documents');

-- Allow admins to manage all admission documents
CREATE POLICY "Admins can manage admission documents"
ON storage.objects FOR ALL
TO authenticated
USING (
  bucket_id = 'admission-documents' AND
  has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  bucket_id = 'admission-documents' AND
  has_role(auth.uid(), 'admin'::app_role)
);

-- Allow admins to delete admission documents
CREATE POLICY "Admins can delete admission documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'admission-documents' AND
  has_role(auth.uid(), 'admin'::app_role)
);
