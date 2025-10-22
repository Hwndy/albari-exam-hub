-- =========================================
-- PDF OFFER LETTER STORAGE POLICIES
-- =========================================
-- This migration sets up storage policies for offer letter PDFs

-- Ensure admission-documents bucket exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('admission-documents', 'admission-documents', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Drop old policies if they exist
DROP POLICY IF EXISTS "Admins can upload offer letters" ON storage.objects;
DROP POLICY IF EXISTS "Public can view offer letters" ON storage.objects;
DROP POLICY IF EXISTS "Applicants can view their offer letters" ON storage.objects;

-- Admin can upload and manage offer letters
CREATE POLICY "Admins can upload offer letters"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'admission-documents' 
  AND (storage.foldername(name))[1] = 'offer-letters'
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- Public can view offer letters (for email links)
CREATE POLICY "Public can view offer letters"
ON storage.objects
FOR SELECT
TO public
USING (
  bucket_id = 'admission-documents'
  AND (storage.foldername(name))[1] = 'offer-letters'
);

-- Admins can delete offer letters
CREATE POLICY "Admins can delete offer letters"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'admission-documents'
  AND (storage.foldername(name))[1] = 'offer-letters'
  AND has_role(auth.uid(), 'admin'::app_role)
);