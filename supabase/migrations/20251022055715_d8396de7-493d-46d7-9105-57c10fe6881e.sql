-- Assign admin role to specific email
-- REPLACE 'admin@albari.edu' with your actual email after signing up

DO $$
DECLARE
  admin_user_id uuid;
BEGIN
  -- Get user ID from email
  SELECT id INTO admin_user_id 
  FROM auth.users 
  WHERE email = 'admin@albari.edu'
  LIMIT 1;
  
  -- If user exists, assign admin role
  IF admin_user_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role, created_by)
    VALUES (admin_user_id, 'admin'::app_role, admin_user_id)
    ON CONFLICT (user_id, role) DO NOTHING;
    
    RAISE NOTICE 'Admin role assigned to user: %', admin_user_id;
  ELSE
    RAISE NOTICE 'No user found with email: admin@albari.edu';
  END IF;
END $$;

-- Alternative: Assign admin to the first user in the system
-- Uncomment if you want to make the first registered user an admin
/*
DO $$
DECLARE
  first_user_id uuid;
BEGIN
  SELECT id INTO first_user_id 
  FROM auth.users 
  ORDER BY created_at ASC 
  LIMIT 1;
  
  IF first_user_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role, created_by)
    VALUES (first_user_id, 'admin'::app_role, first_user_id)
    ON CONFLICT (user_id, role) DO NOTHING;
    
    RAISE NOTICE 'Admin role assigned to first user: %', first_user_id;
  END IF;
END $$;
*/