-- Fix Critical PII Exposure: Remove public access to admission_applications
-- Drop the dangerous public view policy
DROP POLICY IF EXISTS "Public can view applications" ON public.admission_applications;

-- Create secure policy: Applicants can only view their own application
CREATE POLICY "Applicants can view own application" 
ON public.admission_applications 
FOR SELECT 
TO authenticated
USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()));

-- Ensure admins retain full access (policy should already exist)
-- Note: "Admins can view all applications" policy already exists

-- Fix Password Reset OTP Exposure: Remove all public access
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Service role can manage OTPs" ON public.password_reset_otps;

-- Note: No new policies needed - only service role should access this table
-- Access will be via edge functions using SUPABASE_SERVICE_ROLE_KEY
-- This ensures zero public/authenticated user access to OTP table