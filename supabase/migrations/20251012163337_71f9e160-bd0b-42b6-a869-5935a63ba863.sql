-- Complete Admission Management System Database Schema

-- Create admission_sessions table for session configuration
CREATE TABLE IF NOT EXISTS public.admission_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  academic_year TEXT NOT NULL,
  session_name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'active', 'closed')),
  application_fee NUMERIC NOT NULL,
  classes_open JSONB NOT NULL DEFAULT '[]'::jsonb,
  required_documents JSONB NOT NULL DEFAULT '[]'::jsonb,
  max_applicants INTEGER,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create interview_panels table for multi-member panels
CREATE TABLE IF NOT EXISTS public.interview_panels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_id UUID REFERENCES public.admission_interviews(id) ON DELETE CASCADE NOT NULL,
  interviewer_id UUID REFERENCES public.profiles(user_id) NOT NULL,
  role TEXT,
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create interview_feedback table for structured evaluations
CREATE TABLE IF NOT EXISTS public.interview_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_id UUID REFERENCES public.admission_interviews(id) ON DELETE CASCADE NOT NULL,
  panel_member_id UUID REFERENCES public.profiles(user_id) NOT NULL,
  ratings JSONB NOT NULL DEFAULT '{}'::jsonb,
  comments TEXT,
  recommendation TEXT CHECK (recommendation IN ('strong_accept', 'accept', 'neutral', 'reject')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create admission_offers table for offer letters
CREATE TABLE IF NOT EXISTS public.admission_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID REFERENCES public.admission_applications(id) ON DELETE CASCADE NOT NULL UNIQUE,
  offer_letter_url TEXT,
  offered_class_id UUID REFERENCES public.classes(id),
  acceptance_fee NUMERIC NOT NULL,
  acceptance_deadline DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'accepted', 'declined', 'expired')),
  accepted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create admission_exam_assignments table
CREATE TABLE IF NOT EXISTS public.admission_exam_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID REFERENCES public.admission_applications(id) ON DELETE CASCADE NOT NULL,
  exam_id UUID REFERENCES public.exams(id) ON DELETE CASCADE NOT NULL,
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  assigned_by UUID REFERENCES auth.users(id),
  UNIQUE(application_id, exam_id)
);

-- Add exam_category field to exams table if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'exams' AND column_name = 'exam_category') THEN
    ALTER TABLE public.exams ADD COLUMN exam_category TEXT DEFAULT 'regular' CHECK (exam_category IN ('regular', 'entrance'));
  END IF;
END $$;

-- Add aggregate_score and panel_decision to admission_interviews if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'admission_interviews' AND column_name = 'aggregate_score') THEN
    ALTER TABLE public.admission_interviews ADD COLUMN aggregate_score NUMERIC;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'admission_interviews' AND column_name = 'panel_decision') THEN
    ALTER TABLE public.admission_interviews ADD COLUMN panel_decision TEXT CHECK (panel_decision IN ('accept', 'reject', 'waitlist'));
  END IF;
END $$;

-- Add combined_score to admission_applications
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'admission_applications' AND column_name = 'combined_score') THEN
    ALTER TABLE public.admission_applications ADD COLUMN combined_score NUMERIC;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'admission_applications' AND column_name = 'merit_rank') THEN
    ALTER TABLE public.admission_applications ADD COLUMN merit_rank INTEGER;
  END IF;
END $$;

-- Enable RLS on all new tables
ALTER TABLE public.admission_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interview_panels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interview_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admission_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admission_exam_assignments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for admission_sessions
CREATE POLICY "Admins can manage admission sessions"
ON public.admission_sessions
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Public can view active sessions"
ON public.admission_sessions
FOR SELECT
TO anon, authenticated
USING (status = 'active');

-- RLS Policies for interview_panels
CREATE POLICY "Admins can manage interview panels"
ON public.interview_panels
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Panel members can view their assignments"
ON public.interview_panels
FOR SELECT
TO authenticated
USING (interviewer_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for interview_feedback
CREATE POLICY "Admins can view all feedback"
ON public.interview_feedback
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Panel members can manage their feedback"
ON public.interview_feedback
FOR ALL
TO authenticated
USING (panel_member_id = auth.uid());

-- RLS Policies for admission_offers
CREATE POLICY "Admins can manage offers"
ON public.admission_offers
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Applicants can view and accept their offers"
ON public.admission_offers
FOR SELECT
TO anon, authenticated
USING (
  application_id IN (
    SELECT id FROM public.admission_applications
    WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
  )
);

CREATE POLICY "Applicants can update offer status"
ON public.admission_offers
FOR UPDATE
TO authenticated
USING (
  application_id IN (
    SELECT id FROM public.admission_applications
    WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
  )
)
WITH CHECK (
  application_id IN (
    SELECT id FROM public.admission_applications
    WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
  )
);

-- RLS Policies for admission_exam_assignments
CREATE POLICY "Admins can manage exam assignments"
ON public.admission_exam_assignments
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Applicants can view their exam assignments"
ON public.admission_exam_assignments
FOR SELECT
TO authenticated
USING (
  application_id IN (
    SELECT id FROM public.admission_applications
    WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
  )
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_admission_sessions_status ON public.admission_sessions(status);
CREATE INDEX IF NOT EXISTS idx_interview_panels_interview_id ON public.interview_panels(interview_id);
CREATE INDEX IF NOT EXISTS idx_interview_feedback_interview_id ON public.interview_feedback(interview_id);
CREATE INDEX IF NOT EXISTS idx_admission_offers_application_id ON public.admission_offers(application_id);
CREATE INDEX IF NOT EXISTS idx_admission_offers_status ON public.admission_offers(status);
CREATE INDEX IF NOT EXISTS idx_admission_exam_assignments_application_id ON public.admission_exam_assignments(application_id);
CREATE INDEX IF NOT EXISTS idx_admission_applications_combined_score ON public.admission_applications(combined_score);

-- Create trigger for updating updated_at
CREATE OR REPLACE FUNCTION update_admission_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_admission_sessions_updated_at
BEFORE UPDATE ON public.admission_sessions
FOR EACH ROW
EXECUTE FUNCTION update_admission_sessions_updated_at();

CREATE TRIGGER update_admission_offers_updated_at
BEFORE UPDATE ON public.admission_offers
FOR EACH ROW
EXECUTE FUNCTION update_admission_sessions_updated_at();