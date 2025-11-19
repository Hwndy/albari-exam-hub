-- Create profile for suleayo04@gmail.com as super admin
INSERT INTO profiles (user_id, full_name, school_id)
VALUES (
  '70fb30ed-912e-46db-aadd-c76f5bcfb9a2',
  'Sulaimon Ibrahim Semako',
  NULL  -- NULL school_id makes them a super admin
)
ON CONFLICT (user_id) DO UPDATE
SET school_id = NULL, full_name = 'Sulaimon Ibrahim Semako';