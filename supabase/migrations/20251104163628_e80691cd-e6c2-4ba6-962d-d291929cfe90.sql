-- Fix RLS policy to allow both public and authenticated users to submit applications
DROP POLICY IF EXISTS "Public can submit applications" ON admission_applications;

-- Create new policy that allows both public and authenticated users to submit
CREATE POLICY "Anyone can submit applications"
ON admission_applications
FOR INSERT
TO public, authenticated
WITH CHECK (true);