-- PHASE 1: CORE INFRASTRUCTURE - Security & Admission Database

-- ============================================
-- 1.1 SECURITY OVERHAUL - Role-based Access Control
-- ============================================

-- Create app_role enum
CREATE TYPE app_role AS ENUM ('admin', 'teacher', 'student', 'parent');

-- Create user_roles table for proper role management
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles"
ON public.user_roles FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
  )
);

-- Security definer function to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Helper function to check if current user is admin
CREATE OR REPLACE FUNCTION public.is_admin_v2()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'admin');
$$;

-- Helper function to check if current user is teacher or admin
CREATE OR REPLACE FUNCTION public.is_teacher_v2()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'teacher') OR public.has_role(auth.uid(), 'admin');
$$;

-- Migrate existing roles from profiles to user_roles
INSERT INTO public.user_roles (user_id, role)
SELECT user_id, role::app_role
FROM public.profiles
WHERE role IN ('admin', 'teacher', 'student', 'parent')
ON CONFLICT (user_id, role) DO NOTHING;

-- ============================================
-- 1.2 ADMISSION SYSTEM DATABASE ARCHITECTURE
-- ============================================

-- Admission status enum
CREATE TYPE admission_status AS ENUM (
  'submitted',
  'under_review',
  'interview_scheduled',
  'accepted',
  'rejected',
  'payment_pending',
  'enrolled',
  'withdrawn'
);

-- Admission applications table
CREATE TABLE public.admission_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_number TEXT UNIQUE NOT NULL,
  
  -- Student Information
  first_name TEXT NOT NULL,
  middle_name TEXT,
  last_name TEXT NOT NULL,
  date_of_birth DATE NOT NULL,
  gender TEXT NOT NULL CHECK (gender IN ('male', 'female')),
  blood_group TEXT,
  state_of_origin TEXT,
  lga TEXT,
  nationality TEXT DEFAULT 'Nigerian',
  religion TEXT,
  
  -- Contact Information
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  address JSONB NOT NULL,
  
  -- Academic Information
  previous_school TEXT,
  previous_class TEXT,
  applying_for_class_id UUID REFERENCES public.classes(id),
  
  -- Parent/Guardian Information
  parent_guardian_info JSONB NOT NULL,
  
  -- Medical Information
  medical_conditions TEXT,
  allergies TEXT,
  special_needs TEXT,
  
  -- Application Status
  status admission_status NOT NULL DEFAULT 'submitted',
  application_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  
  -- Admission Details
  admission_date TIMESTAMPTZ,
  admitted_to_class_id UUID REFERENCES public.classes(id),
  student_id UUID REFERENCES public.students(id),
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Admission documents table
CREATE TABLE public.admission_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID REFERENCES public.admission_applications(id) ON DELETE CASCADE NOT NULL,
  document_type TEXT NOT NULL,
  document_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  verified BOOLEAN DEFAULT false,
  verified_by UUID REFERENCES auth.users(id),
  verified_at TIMESTAMPTZ,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Admission interviews table
CREATE TABLE public.admission_interviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID REFERENCES public.admission_applications(id) ON DELETE CASCADE NOT NULL,
  scheduled_date TIMESTAMPTZ NOT NULL,
  interview_type TEXT NOT NULL DEFAULT 'in-person',
  location TEXT,
  interviewer_id UUID REFERENCES auth.users(id),
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled', 'rescheduled')),
  feedback TEXT,
  score INTEGER CHECK (score >= 0 AND score <= 100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Admission payments table
CREATE TABLE public.admission_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID REFERENCES public.admission_applications(id) ON DELETE CASCADE NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  payment_type TEXT NOT NULL DEFAULT 'application_fee',
  payment_method TEXT,
  transaction_id TEXT UNIQUE,
  payment_reference TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Admission workflow logs table
CREATE TABLE public.admission_workflow_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID REFERENCES public.admission_applications(id) ON DELETE CASCADE NOT NULL,
  from_status admission_status,
  to_status admission_status NOT NULL,
  changed_by UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all admission tables
ALTER TABLE public.admission_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admission_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admission_interviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admission_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admission_workflow_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for admission_applications
CREATE POLICY "Public can submit applications"
ON public.admission_applications FOR INSERT
WITH CHECK (true);

CREATE POLICY "Applicants can view their own application"
ON public.admission_applications FOR SELECT
USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()));

CREATE POLICY "Admins can view all applications"
ON public.admission_applications FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update applications"
ON public.admission_applications FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for admission_documents
CREATE POLICY "Applicants can view their documents"
ON public.admission_documents FOR SELECT
USING (
  application_id IN (
    SELECT id FROM public.admission_applications
    WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
  )
);

CREATE POLICY "Public can upload documents"
ON public.admission_documents FOR INSERT
WITH CHECK (true);

CREATE POLICY "Admins can manage documents"
ON public.admission_documents FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for admission_interviews
CREATE POLICY "Applicants can view their interviews"
ON public.admission_interviews FOR SELECT
USING (
  application_id IN (
    SELECT id FROM public.admission_applications
    WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
  )
);

CREATE POLICY "Admins can manage interviews"
ON public.admission_interviews FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for admission_payments
CREATE POLICY "Applicants can view their payments"
ON public.admission_payments FOR SELECT
USING (
  application_id IN (
    SELECT id FROM public.admission_applications
    WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
  )
);

CREATE POLICY "Public can create payments"
ON public.admission_payments FOR INSERT
WITH CHECK (true);

CREATE POLICY "Admins can manage payments"
ON public.admission_payments FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for admission_workflow_logs
CREATE POLICY "Admins can view workflow logs"
ON public.admission_workflow_logs FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can create workflow logs"
ON public.admission_workflow_logs FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- TRIGGERS & FUNCTIONS
-- ============================================

-- Function to generate unique application number
CREATE OR REPLACE FUNCTION public.generate_application_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.application_number := 'APP' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(NEXTVAL('admission_app_seq')::TEXT, 6, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create sequence for application numbers
CREATE SEQUENCE admission_app_seq START 1;

-- Trigger to auto-generate application number
CREATE TRIGGER set_application_number
BEFORE INSERT ON public.admission_applications
FOR EACH ROW
WHEN (NEW.application_number IS NULL)
EXECUTE FUNCTION public.generate_application_number();

-- Function to log admission status changes
CREATE OR REPLACE FUNCTION public.log_admission_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.admission_workflow_logs (application_id, from_status, to_status, changed_by, notes)
    VALUES (NEW.id, OLD.status, NEW.status, auth.uid(), 'Status changed from ' || OLD.status || ' to ' || NEW.status);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to log status changes
CREATE TRIGGER log_status_change
AFTER UPDATE ON public.admission_applications
FOR EACH ROW
EXECUTE FUNCTION public.log_admission_status_change();

-- Update timestamp trigger for admission tables
CREATE TRIGGER update_admission_applications_updated_at
BEFORE UPDATE ON public.admission_applications
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_admission_interviews_updated_at
BEFORE UPDATE ON public.admission_interviews
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- 1.3 ENHANCED PARENT-STUDENT RELATIONSHIP
-- ============================================

-- Add access control columns to student_parent_relationships
ALTER TABLE public.student_parent_relationships
ADD COLUMN IF NOT EXISTS access_level TEXT DEFAULT 'full' CHECK (access_level IN ('full', 'limited')),
ADD COLUMN IF NOT EXISTS can_view_grades BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS can_view_attendance BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS can_view_fees BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{"email": true, "sms": true, "in_app": true}'::jsonb;