-- Fix 2: Create admission_documents table
CREATE TABLE IF NOT EXISTS public.admission_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES public.admission_applications(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL CHECK (document_type IN ('birth_certificate', 'previous_school_report', 'passport_photo', 'medical_certificate', 'other')),
  document_name TEXT NOT NULL,
  document_url TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  verification_status TEXT NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected')),
  verified_by UUID REFERENCES auth.users(id),
  verified_at TIMESTAMPTZ,
  rejection_reason TEXT,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add RLS policies for admission_documents
ALTER TABLE public.admission_documents ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admins can manage admission documents" ON public.admission_documents;
DROP POLICY IF EXISTS "Applicants can view their documents" ON public.admission_documents;
DROP POLICY IF EXISTS "Public can upload documents during application" ON public.admission_documents;

-- Admins can manage all documents
CREATE POLICY "Admins can manage admission documents"
ON public.admission_documents
FOR ALL
TO public
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Applicants can view their own documents
CREATE POLICY "Applicants can view their documents"
ON public.admission_documents
FOR SELECT
TO public
USING (
  application_id IN (
    SELECT id FROM admission_applications
    WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())::text
  )
);

-- Public can insert documents (for application submission)
CREATE POLICY "Public can upload documents during application"
ON public.admission_documents
FOR INSERT
TO public
WITH CHECK (true);

-- Add trigger for updated_at
DROP TRIGGER IF EXISTS update_admission_documents_updated_at ON public.admission_documents;
CREATE TRIGGER update_admission_documents_updated_at
  BEFORE UPDATE ON public.admission_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Fix 3: Add webhook verification table for Paystack
CREATE TABLE IF NOT EXISTS public.paystack_webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  event_data JSONB NOT NULL,
  reference TEXT,
  processed BOOLEAN NOT NULL DEFAULT false,
  processed_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add RLS for webhook logs (admin only)
ALTER TABLE public.paystack_webhooks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view webhook logs" ON public.paystack_webhooks;
CREATE POLICY "Admins can view webhook logs"
ON public.paystack_webhooks
FOR SELECT
TO public
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add indexes
DROP INDEX IF EXISTS idx_paystack_webhooks_reference;
DROP INDEX IF EXISTS idx_paystack_webhooks_processed;
CREATE INDEX idx_paystack_webhooks_reference ON public.paystack_webhooks(reference);
CREATE INDEX idx_paystack_webhooks_processed ON public.paystack_webhooks(processed, created_at);