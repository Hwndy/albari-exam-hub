-- ===== PHASE 1: SECURITY FIXES =====

-- Fix 1: Add RLS policies to password_reset_otps table
CREATE POLICY "Anyone can insert password reset OTPs"
ON public.password_reset_otps FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can view their own OTPs"
ON public.password_reset_otps FOR SELECT
USING (email = (SELECT email FROM auth.users WHERE id = auth.uid())::text);

CREATE POLICY "System can update OTPs"
ON public.password_reset_otps FOR UPDATE
USING (true);

CREATE POLICY "System can delete expired OTPs"
ON public.password_reset_otps FOR DELETE
USING (expires_at < now() OR used = true);

-- Fix 2 & 3: Update functions with search_path security
-- (Note: These are the most commonly called security functions)

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
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

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'admin'::app_role)
$$;

CREATE OR REPLACE FUNCTION public.is_teacher()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'teacher'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role)
$$;

CREATE OR REPLACE FUNCTION public.get_user_school_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT school_id FROM public.profiles WHERE user_id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
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
  )
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Create profile without role
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email)
  );
  
  -- Create role entry in user_roles table (secure storage)
  INSERT INTO public.user_roles (user_id, role, created_by)
  VALUES (
    NEW.id, 
    COALESCE((NEW.raw_user_meta_data ->> 'role')::app_role, 'student'::app_role),
    NEW.id
  )
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.log_admission_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.admission_workflow_logs (application_id, from_status, to_status, changed_by, notes)
    VALUES (NEW.id, OLD.status, NEW.status, auth.uid(), 'Status changed from ' || OLD.status || ' to ' || NEW.status);
  END IF;
  RETURN NEW;
END;
$$;

-- ===== PHASE 1: ADD school_id TO MISSING TABLES =====

-- Add school_id to admission-related tables
ALTER TABLE public.admission_documents 
ADD COLUMN IF NOT EXISTS school_id uuid REFERENCES public.schools(id);

ALTER TABLE public.admission_exam_assignments 
ADD COLUMN IF NOT EXISTS school_id uuid REFERENCES public.schools(id);

ALTER TABLE public.admission_interviews 
ADD COLUMN IF NOT EXISTS school_id uuid REFERENCES public.schools(id);

ALTER TABLE public.admission_offers 
ADD COLUMN IF NOT EXISTS school_id uuid REFERENCES public.schools(id);

ALTER TABLE public.admission_payments 
ADD COLUMN IF NOT EXISTS school_id uuid REFERENCES public.schools(id);

ALTER TABLE public.admission_workflow_logs 
ADD COLUMN IF NOT EXISTS school_id uuid REFERENCES public.schools(id);

ALTER TABLE public.interview_feedback 
ADD COLUMN IF NOT EXISTS school_id uuid REFERENCES public.schools(id);

ALTER TABLE public.interview_panels 
ADD COLUMN IF NOT EXISTS school_id uuid REFERENCES public.schools(id);

-- Add school_id to website-related tables
ALTER TABLE public.testimonials 
ADD COLUMN IF NOT EXISTS school_id uuid REFERENCES public.schools(id);

ALTER TABLE public.website_pages 
ADD COLUMN IF NOT EXISTS school_id uuid REFERENCES public.schools(id);

ALTER TABLE public.website_sections 
ADD COLUMN IF NOT EXISTS school_id uuid REFERENCES public.schools(id);

ALTER TABLE public.website_settings 
ADD COLUMN IF NOT EXISTS school_id uuid REFERENCES public.schools(id);

-- Backfill school_id from related admission_applications
UPDATE public.admission_documents ad
SET school_id = aa.school_id
FROM public.admission_applications aa
WHERE ad.application_id = aa.id AND ad.school_id IS NULL;

UPDATE public.admission_exam_assignments aea
SET school_id = aa.school_id
FROM public.admission_applications aa
WHERE aea.application_id = aa.id AND aea.school_id IS NULL;

UPDATE public.admission_interviews ai
SET school_id = aa.school_id
FROM public.admission_applications aa
WHERE ai.application_id = aa.id AND ai.school_id IS NULL;

UPDATE public.admission_offers ao
SET school_id = aa.school_id
FROM public.admission_applications aa
WHERE ao.application_id = aa.id AND ao.school_id IS NULL;

UPDATE public.admission_payments ap
SET school_id = aa.school_id
FROM public.admission_applications aa
WHERE ap.application_id = aa.id AND ap.school_id IS NULL;

UPDATE public.admission_workflow_logs awl
SET school_id = aa.school_id
FROM public.admission_applications aa
WHERE awl.application_id = aa.id AND awl.school_id IS NULL;

-- Backfill interview_feedback from interviews
UPDATE public.interview_feedback if_tbl
SET school_id = ai.school_id
FROM public.admission_interviews ai
WHERE if_tbl.interview_id = ai.id AND if_tbl.school_id IS NULL;

UPDATE public.interview_panels ip
SET school_id = ai.school_id
FROM public.admission_interviews ai
WHERE ip.interview_id = ai.id AND ip.school_id IS NULL;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_admission_documents_school_id ON public.admission_documents(school_id);
CREATE INDEX IF NOT EXISTS idx_admission_exam_assignments_school_id ON public.admission_exam_assignments(school_id);
CREATE INDEX IF NOT EXISTS idx_admission_interviews_school_id ON public.admission_interviews(school_id);
CREATE INDEX IF NOT EXISTS idx_admission_offers_school_id ON public.admission_offers(school_id);
CREATE INDEX IF NOT EXISTS idx_admission_payments_school_id ON public.admission_payments(school_id);
CREATE INDEX IF NOT EXISTS idx_admission_workflow_logs_school_id ON public.admission_workflow_logs(school_id);
CREATE INDEX IF NOT EXISTS idx_interview_feedback_school_id ON public.interview_feedback(school_id);
CREATE INDEX IF NOT EXISTS idx_interview_panels_school_id ON public.interview_panels(school_id);