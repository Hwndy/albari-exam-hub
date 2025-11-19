-- ==========================================
-- PHASE 1: Multi-Tenancy Implementation
-- Create schools table and add school_id to all tables
-- ==========================================

-- Create schools table
CREATE TABLE IF NOT EXISTS public.schools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  subdomain TEXT NOT NULL UNIQUE,
  logo_url TEXT,
  primary_color TEXT DEFAULT '#4F46E5',
  secondary_color TEXT DEFAULT '#10B981',
  contact_email TEXT,
  contact_phone TEXT,
  address JSONB,
  settings JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on schools table
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;

-- Create index on subdomain for fast lookups
CREATE INDEX idx_schools_subdomain ON public.schools(subdomain);
CREATE INDEX idx_schools_active ON public.schools(is_active);

-- Add school_id to all relevant tables
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE;
ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE;
ALTER TABLE public.subjects ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE;
ALTER TABLE public.parents ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE;
ALTER TABLE public.exams ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE;
ALTER TABLE public.question_banks ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE;
ALTER TABLE public.exam_sessions ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE;
ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE;
ALTER TABLE public.attendance_sessions ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE;
ALTER TABLE public.assessments ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE;
ALTER TABLE public.assessment_types ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE;
ALTER TABLE public.grades ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE;
ALTER TABLE public.gradebook_entries ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE;
ALTER TABLE public.grade_comments ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE;
ALTER TABLE public.fee_structures ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE;
ALTER TABLE public.fee_payments ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE;
ALTER TABLE public.library_books ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE;
ALTER TABLE public.book_issues ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE;
ALTER TABLE public.academic_calendar ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE;
ALTER TABLE public.class_timetables ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE;
ALTER TABLE public.periods ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE;
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE;
ALTER TABLE public.timetable_templates ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE;
ALTER TABLE public.admission_sessions ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE;
ALTER TABLE public.admission_applications ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE;
ALTER TABLE public.news_articles ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE;
ALTER TABLE public.gallery ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE;

-- Create indexes on school_id columns for performance
CREATE INDEX idx_profiles_school_id ON public.profiles(school_id);
CREATE INDEX idx_classes_school_id ON public.classes(school_id);
CREATE INDEX idx_subjects_school_id ON public.subjects(school_id);
CREATE INDEX idx_students_school_id ON public.students(school_id);
CREATE INDEX idx_parents_school_id ON public.parents(school_id);
CREATE INDEX idx_exams_school_id ON public.exams(school_id);
CREATE INDEX idx_questions_school_id ON public.questions(school_id);
CREATE INDEX idx_question_banks_school_id ON public.question_banks(school_id);
CREATE INDEX idx_exam_sessions_school_id ON public.exam_sessions(school_id);
CREATE INDEX idx_announcements_school_id ON public.announcements(school_id);
CREATE INDEX idx_attendance_sessions_school_id ON public.attendance_sessions(school_id);
CREATE INDEX idx_assessments_school_id ON public.assessments(school_id);
CREATE INDEX idx_fee_structures_school_id ON public.fee_structures(school_id);
CREATE INDEX idx_admission_sessions_school_id ON public.admission_sessions(school_id);
CREATE INDEX idx_admission_applications_school_id ON public.admission_applications(school_id);

-- Create helper function to get user's school_id
CREATE OR REPLACE FUNCTION public.get_user_school_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT school_id FROM public.profiles WHERE user_id = auth.uid();
$$;

-- Create helper function to check if user is super admin (can access all schools)
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'::app_role
    AND (SELECT school_id FROM public.profiles WHERE user_id = auth.uid()) IS NULL
  );
$$;

-- Update trigger for schools table
CREATE TRIGGER update_schools_updated_at
  BEFORE UPDATE ON public.schools
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies for schools table
CREATE POLICY "Super admins can manage all schools"
  ON public.schools FOR ALL
  USING (public.is_super_admin());

CREATE POLICY "Users can view their own school"
  ON public.schools FOR SELECT
  USING (id = public.get_user_school_id() OR public.is_super_admin());

-- Create default school for existing data (can be updated later)
INSERT INTO public.schools (name, subdomain, is_active)
VALUES ('Default School', 'default', true)
ON CONFLICT (subdomain) DO NOTHING;

-- Update existing profiles to have the default school_id
UPDATE public.profiles
SET school_id = (SELECT id FROM public.schools WHERE subdomain = 'default')
WHERE school_id IS NULL;

-- Update existing data for all tables to have the default school_id
DO $$
DECLARE
  default_school_id UUID;
BEGIN
  SELECT id INTO default_school_id FROM public.schools WHERE subdomain = 'default';
  
  UPDATE public.classes SET school_id = default_school_id WHERE school_id IS NULL;
  UPDATE public.subjects SET school_id = default_school_id WHERE school_id IS NULL;
  UPDATE public.students SET school_id = default_school_id WHERE school_id IS NULL;
  UPDATE public.parents SET school_id = default_school_id WHERE school_id IS NULL;
  UPDATE public.exams SET school_id = default_school_id WHERE school_id IS NULL;
  UPDATE public.questions SET school_id = default_school_id WHERE school_id IS NULL;
  UPDATE public.question_banks SET school_id = default_school_id WHERE school_id IS NULL;
  UPDATE public.exam_sessions SET school_id = default_school_id WHERE school_id IS NULL;
  UPDATE public.announcements SET school_id = default_school_id WHERE school_id IS NULL;
  UPDATE public.attendance_sessions SET school_id = default_school_id WHERE school_id IS NULL;
  UPDATE public.assessments SET school_id = default_school_id WHERE school_id IS NULL;
  UPDATE public.assessment_types SET school_id = default_school_id WHERE school_id IS NULL;
  UPDATE public.grades SET school_id = default_school_id WHERE school_id IS NULL;
  UPDATE public.gradebook_entries SET school_id = default_school_id WHERE school_id IS NULL;
  UPDATE public.grade_comments SET school_id = default_school_id WHERE school_id IS NULL;
  UPDATE public.fee_structures SET school_id = default_school_id WHERE school_id IS NULL;
  UPDATE public.fee_payments SET school_id = default_school_id WHERE school_id IS NULL;
  UPDATE public.library_books SET school_id = default_school_id WHERE school_id IS NULL;
  UPDATE public.book_issues SET school_id = default_school_id WHERE school_id IS NULL;
  UPDATE public.academic_calendar SET school_id = default_school_id WHERE school_id IS NULL;
  UPDATE public.admission_sessions SET school_id = default_school_id WHERE school_id IS NULL;
  UPDATE public.admission_applications SET school_id = default_school_id WHERE school_id IS NULL;
  UPDATE public.news_articles SET school_id = default_school_id WHERE school_id IS NULL;
  UPDATE public.gallery SET school_id = default_school_id WHERE school_id IS NULL;
END $$;

-- Make school_id NOT NULL after data migration (except for super admins in profiles)
ALTER TABLE public.classes ALTER COLUMN school_id SET NOT NULL;
ALTER TABLE public.subjects ALTER COLUMN school_id SET NOT NULL;
ALTER TABLE public.students ALTER COLUMN school_id SET NOT NULL;
ALTER TABLE public.exams ALTER COLUMN school_id SET NOT NULL;
ALTER TABLE public.questions ALTER COLUMN school_id SET NOT NULL;
ALTER TABLE public.question_banks ALTER COLUMN school_id SET NOT NULL;
ALTER TABLE public.announcements ALTER COLUMN school_id SET NOT NULL;
ALTER TABLE public.admission_sessions ALTER COLUMN school_id SET NOT NULL;