-- Add missing columns to admission_offers table
ALTER TABLE public.admission_offers 
ADD COLUMN IF NOT EXISTS acceptance_token TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS declined_at TIMESTAMP WITH TIME ZONE;

-- Create index on acceptance_token for faster lookups
CREATE INDEX IF NOT EXISTS idx_admission_offers_acceptance_token 
ON public.admission_offers(acceptance_token);