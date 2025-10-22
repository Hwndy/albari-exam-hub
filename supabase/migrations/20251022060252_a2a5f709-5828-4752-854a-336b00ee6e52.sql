-- Fix profiles table schema by removing role column and updating dependent policies
-- Step 1: Drop policies that depend on profiles.role
DROP POLICY IF EXISTS "Admins can manage documents" ON public.admission_documents;

-- Step 2: Remove the role column from profiles
ALTER TABLE public.profiles DROP COLUMN IF EXISTS role;

-- Step 3: Recreate the policy using the has_role function
CREATE POLICY "Admins can manage documents"
ON public.admission_documents
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Add comment explaining the security model
COMMENT ON TABLE public.profiles IS 'User profiles without role information. Roles are stored in user_roles table for security.';