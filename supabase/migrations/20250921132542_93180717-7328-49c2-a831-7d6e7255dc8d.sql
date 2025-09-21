-- Fix admin user management by updating RLS policies and functions

-- Update the create_user_with_profile function to be more robust
CREATE OR REPLACE FUNCTION public.create_user_with_profile(
  user_email text, 
  user_password text, 
  user_full_name text, 
  user_role text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only admins can create users
  IF NOT is_admin() THEN
    RETURN jsonb_build_object('error', 'Unauthorized: Admin access required');
  END IF;

  -- Validate role
  IF user_role NOT IN ('admin', 'teacher', 'student') THEN
    RETURN jsonb_build_object('error', 'Invalid role specified');
  END IF;

  -- Return success - the actual user creation will be handled by the client
  RETURN jsonb_build_object('success', true, 'message', 'User creation authorized');
END;
$$;

-- Update the delete_user_profile function to be more robust
CREATE OR REPLACE FUNCTION public.delete_user_profile(user_id_param uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only admins can delete users
  IF NOT is_admin() THEN
    RETURN jsonb_build_object('error', 'Unauthorized: Admin access required');
  END IF;

  -- Delete the profile (this will cascade through RLS)
  DELETE FROM public.profiles WHERE user_id = user_id_param;
  
  RETURN jsonb_build_object('success', true, 'message', 'Profile deleted successfully');
END;
$$;

-- Enhance question categorization with class support
ALTER TABLE public.question_banks 
ADD COLUMN IF NOT EXISTS class_id uuid REFERENCES public.classes(id);

-- Create index for better performance on question filtering
CREATE INDEX IF NOT EXISTS idx_questions_bank_subject_class 
ON public.questions(question_bank_id);

CREATE INDEX IF NOT EXISTS idx_question_banks_subject_class 
ON public.question_banks(subject_id, class_id);

-- Update question banks to support class-based categorization
COMMENT ON COLUMN public.question_banks.class_id IS 'Optional class assignment for question bank categorization';