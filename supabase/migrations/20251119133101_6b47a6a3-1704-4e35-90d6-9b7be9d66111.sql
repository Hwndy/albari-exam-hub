-- Promote admin@gmail.com to super admin
-- This sets their school_id to NULL, making them a system-wide super admin
SELECT public.create_super_admin('e6b082bd-8b3b-453f-9e3c-e845a33fde7b');

-- Verify the promotion was successful
SELECT 
  p.user_id,
  p.full_name,
  p.school_id,
  ur.role,
  public.is_user_super_admin(p.user_id) as is_super_admin
FROM profiles p
JOIN user_roles ur ON ur.user_id = p.user_id
WHERE p.user_id = 'e6b082bd-8b3b-453f-9e3c-e845a33fde7b';