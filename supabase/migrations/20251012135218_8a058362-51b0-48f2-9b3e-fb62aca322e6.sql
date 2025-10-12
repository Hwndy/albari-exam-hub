-- Fix permission denied error for public admission applications
-- Update the SELECT policy to handle unauthenticated users properly

DROP POLICY IF EXISTS "Applicants can view their own application" ON admission_applications;

CREATE POLICY "Applicants can view their own application"
ON admission_applications FOR SELECT
USING (
  -- Only allow authenticated users to view via this policy
  -- Unauthenticated users won't trigger auth.users access
  auth.uid() IS NOT NULL AND
  email = (SELECT email FROM auth.users WHERE id = auth.uid())::text
);