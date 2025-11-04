-- Clean up duplicate/conflicting storage policies for admission-documents bucket
-- This removes the less secure policy and keeps the structured one

-- Drop the redundant policy that allows all uploads without folder structure
DROP POLICY IF EXISTS "Public can upload application documents" ON storage.objects;

-- Verify the correct policy exists with folder structure validation
-- Policy "Public can upload admission documents" should already exist from previous migrations