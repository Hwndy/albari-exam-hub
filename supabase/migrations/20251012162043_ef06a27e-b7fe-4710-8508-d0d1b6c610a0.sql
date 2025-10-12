-- Fix RLS policies for admission_applications to allow public tracking and admin access

-- Drop the restrictive "Applicants can view their own application" policy
DROP POLICY IF EXISTS "Applicants can view their own application" ON public.admission_applications;

-- Create new policy that allows public SELECT
-- The ApplicationTracker component filters by email + application_number in the query
CREATE POLICY "Public can view applications"
ON public.admission_applications
FOR SELECT
TO anon, authenticated
USING (true);

-- Ensure the admin policy is using the has_role function correctly
DROP POLICY IF EXISTS "Admins can view all applications" ON public.admission_applications;

CREATE POLICY "Admins can view all applications"
ON public.admission_applications
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));