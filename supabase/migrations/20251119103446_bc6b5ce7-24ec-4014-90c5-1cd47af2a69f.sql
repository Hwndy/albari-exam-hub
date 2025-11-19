-- Phase 1: Super Admin Foundation Functions

-- Function to create/promote a user to super admin
CREATE OR REPLACE FUNCTION public.create_super_admin(admin_user_id UUID)
RETURNS VOID 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
  -- Set school_id to NULL to make user a super admin
  UPDATE public.profiles 
  SET school_id = NULL 
  WHERE user_id = admin_user_id;
  
  -- Ensure user has admin role
  INSERT INTO public.user_roles (user_id, role, created_by)
  VALUES (admin_user_id, 'admin'::app_role, admin_user_id)
  ON CONFLICT (user_id, role) DO NOTHING;
END;
$$;

-- Function to check if a user is a super admin (school_id IS NULL)
CREATE OR REPLACE FUNCTION public.is_user_super_admin(check_user_id UUID)
RETURNS BOOLEAN 
LANGUAGE sql 
STABLE 
SECURITY DEFINER 
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.profiles 
    WHERE user_id = check_user_id 
    AND school_id IS NULL
    AND EXISTS (
      SELECT 1 
      FROM public.user_roles 
      WHERE user_id = check_user_id 
      AND role = 'admin'::app_role
    )
  );
$$;

-- Add indexes for better performance on school-related queries
CREATE INDEX IF NOT EXISTS idx_profiles_school_id ON public.profiles(school_id);
CREATE INDEX IF NOT EXISTS idx_schools_subdomain ON public.schools(subdomain);
CREATE INDEX IF NOT EXISTS idx_schools_is_active ON public.schools(is_active);

COMMENT ON FUNCTION public.create_super_admin IS 'Promotes a user to super admin by setting their school_id to NULL';
COMMENT ON FUNCTION public.is_user_super_admin IS 'Checks if a user is a super admin (NULL school_id and admin role)';
