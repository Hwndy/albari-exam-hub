-- Migration: Implement secure role system using user_roles table (Fixed version)
-- This fixes the critical security vulnerability where roles were stored in profiles table

-- Step 1: Populate user_roles from existing profiles data
INSERT INTO public.user_roles (user_id, role, created_by)
SELECT 
  p.user_id, 
  p.role::app_role,
  p.user_id as created_by
FROM public.profiles p
WHERE p.role IS NOT NULL 
  AND p.role IN ('admin', 'teacher', 'student', 'parent')
  AND NOT EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = p.user_id AND ur.role = p.role::app_role
  )
ON CONFLICT (user_id, role) DO NOTHING;

-- Step 2: Update the handle_new_user trigger function (replace old version)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Create profile without role
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email)
  );
  
  -- Create role entry in user_roles table (secure storage)
  -- Default to student if no role specified
  INSERT INTO public.user_roles (user_id, role, created_by)
  VALUES (
    NEW.id, 
    COALESCE((NEW.raw_user_meta_data ->> 'role')::app_role, 'student'::app_role),
    NEW.id
  )
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Step 3: Update profiles RLS policies to use has_role() function
-- Drop all existing policies first
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;

-- Create new secure policies using has_role() security definer function
CREATE POLICY "users_can_view_own_profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "users_can_update_own_profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "admins_can_insert_profiles"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins_can_delete_profiles"
ON public.profiles
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Step 4: Add documentation
COMMENT ON TABLE public.user_roles IS 'Secure role storage - roles stored here instead of profiles to prevent privilege escalation attacks';
COMMENT ON FUNCTION public.handle_new_user() IS 'Updated to use user_roles table for secure role management - profiles.role deprecated';

-- Note: profiles.role column kept for backwards compatibility during migration
-- After frontend is updated and tested, manually drop with: ALTER TABLE public.profiles DROP COLUMN role;