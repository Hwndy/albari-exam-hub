-- Fix RLS policies to allow public access to classes and subjects for registration
-- Update classes table policy to allow public read access for registration
DROP POLICY IF EXISTS "Authenticated users can view classes" ON public.classes;
CREATE POLICY "Public can view classes for registration" ON public.classes FOR SELECT USING (true);

-- Update subjects table policy to allow public read access for registration  
DROP POLICY IF EXISTS "Authenticated users can view subjects" ON public.subjects;
CREATE POLICY "Public can view subjects for registration" ON public.subjects FOR SELECT USING (true);

-- Add missing triggers for grading
DROP TRIGGER IF EXISTS grade_question_response_trigger ON public.question_responses;
CREATE TRIGGER grade_question_response_trigger
  BEFORE INSERT OR UPDATE ON public.question_responses
  FOR EACH ROW
  EXECUTE FUNCTION public.grade_question_response();

-- Add missing updated_at triggers
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_exam_sessions_updated_at ON public.exam_sessions;
CREATE TRIGGER update_exam_sessions_updated_at
  BEFORE UPDATE ON public.exam_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add missing user creation trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();