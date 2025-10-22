-- Fix RLS policy on admission_applications that causes "permission denied for table users" error
-- The issue: The policy queries auth.users table which triggers recursive RLS evaluation

-- Drop the problematic policy that queries auth.users
DROP POLICY IF EXISTS "Applicants can view own application" ON admission_applications;

-- Create new policy using auth.email() function instead of querying auth.users table
-- This avoids recursive RLS issues while maintaining security
CREATE POLICY "Authenticated users can view own applications"
ON admission_applications
FOR SELECT
TO authenticated
USING (
  email = auth.email()
);

-- Also ensure public users can submit applications (should already exist but verify)
DROP POLICY IF EXISTS "Public can submit applications" ON admission_applications;

CREATE POLICY "Public can submit applications"
ON admission_applications
FOR INSERT
TO public
WITH CHECK (true);