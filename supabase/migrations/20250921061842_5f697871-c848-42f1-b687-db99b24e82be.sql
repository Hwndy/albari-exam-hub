-- Assign the current student user to PRIMARY 6 class
INSERT INTO public.class_assignments (student_id, class_id)
VALUES ('30067d6f-bd56-40b0-a2e9-68513e539a17', '0b74e37b-4cbb-4cb7-88c8-7a935a9e748b')
ON CONFLICT (student_id, class_id) DO NOTHING;