-- Migration: Add rate limiting for OTP security
-- This prevents brute force attacks and email bombing

-- Create rate_limits table for OTP rate limiting
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier text NOT NULL, -- email or IP address
  action text NOT NULL, -- 'otp_send' or 'otp_verify'
  attempts integer DEFAULT 1,
  window_start timestamptz DEFAULT now(),
  blocked_until timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(identifier, action)
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_rate_limits_identifier_action 
ON public.rate_limits(identifier, action);

CREATE INDEX IF NOT EXISTS idx_rate_limits_blocked_until 
ON public.rate_limits(blocked_until) 
WHERE blocked_until IS NOT NULL;

-- Enable RLS
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Only service role can access rate_limits (used by edge functions)
CREATE POLICY "Service role can manage rate limits"
ON public.rate_limits
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Function to clean up old rate limit entries (run periodically)
CREATE OR REPLACE FUNCTION public.cleanup_old_rate_limits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete entries older than 24 hours
  DELETE FROM public.rate_limits
  WHERE window_start < now() - interval '24 hours';
END;
$$;

COMMENT ON TABLE public.rate_limits IS 'Tracks rate limiting for OTP operations to prevent abuse';
COMMENT ON FUNCTION public.cleanup_old_rate_limits() IS 'Cleans up rate limit entries older than 24 hours';