import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VerifyOTPRequest {
  email: string;
  otp: string;
  newPassword?: string;
  type: 'reset_password' | 'email_verification';
}

const RATE_LIMIT_WINDOW = 10 * 60 * 1000; // 10 minutes
const MAX_VERIFY_ATTEMPTS = 5;
const LOCKOUT_DURATION = 60 * 60 * 1000; // 1 hour
const MAX_WRONG_OTP_ATTEMPTS = 3;

async function checkRateLimit(supabase: any, identifier: string, action: string, maxAttempts: number) {
  const { data: existing } = await supabase.from('rate_limits').select('*').eq('identifier', identifier).eq('action', action).single();
  const now = new Date();
  
  if (existing?.blocked_until && new Date(existing.blocked_until) > now) {
    return { allowed: false, attempts: existing.attempts, blockedUntil: new Date(existing.blocked_until) };
  }
  
  if (existing?.window_start) {
    const windowAge = now.getTime() - new Date(existing.window_start).getTime();
    if (windowAge < RATE_LIMIT_WINDOW) {
      if (existing.attempts >= maxAttempts) {
        const blockedUntil = new Date(now.getTime() + LOCKOUT_DURATION);
        await supabase.from('rate_limits').update({ blocked_until: blockedUntil.toISOString() }).eq('identifier', identifier).eq('action', action);
        return { allowed: false, attempts: existing.attempts, blockedUntil };
      }
      await supabase.from('rate_limits').update({ attempts: existing.attempts + 1 }).eq('identifier', identifier).eq('action', action);
      return { allowed: true, attempts: existing.attempts + 1 };
    }
  }
  
  await supabase.from('rate_limits').upsert({ identifier, action, attempts: 1, window_start: now.toISOString(), blocked_until: null }, { onConflict: 'identifier,action' });
  return { allowed: true, attempts: 1 };
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { email, otp, newPassword, type }: VerifyOTPRequest = await req.json();
    if (!email || !otp || !type) {
      return new Response(JSON.stringify({ error: 'Email, OTP, and type are required' }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
    const rateCheck = await checkRateLimit(supabase, email.toLowerCase(), 'otp_verify', MAX_VERIFY_ATTEMPTS);

    if (!rateCheck.allowed) {
      const minutesLeft = Math.ceil((rateCheck.blockedUntil!.getTime() - Date.now()) / 60000);
      return new Response(JSON.stringify({ error: `Too many failed attempts. Locked for ${minutesLeft} minutes.` }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: otpRecord } = await supabase.from('password_reset_otps').select('*').eq('email', email.toLowerCase()).eq('otp_code', otp).eq('used', false).single();

    if (!otpRecord) {
      if (rateCheck.attempts >= MAX_WRONG_OTP_ATTEMPTS) {
        await supabase.from('password_reset_otps').update({ used: true }).eq('email', email.toLowerCase()).eq('used', false);
      }
      return new Response(JSON.stringify({ error: 'Invalid OTP', remaining_attempts: Math.max(0, MAX_VERIFY_ATTEMPTS - rateCheck.attempts) }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (new Date(otpRecord.expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: 'OTP expired. Request a new one.' }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    await supabase.from('password_reset_otps').update({ used: true }).eq('id', otpRecord.id);
    await supabase.from('rate_limits').delete().eq('identifier', email.toLowerCase()).eq('action', 'otp_verify');

    if (type === 'reset_password') {
      const { data: userData } = await supabase.auth.admin.listUsers();
      const user = userData.users.find(u => u.email?.toLowerCase() === email.toLowerCase());
      if (!user) return new Response(JSON.stringify({ error: 'User not found' }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      
      await supabase.auth.admin.updateUserById(user.id, { password: newPassword });
      return new Response(JSON.stringify({ success: true, message: 'Password reset successfully' }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ success: true, message: 'Email verified' }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
};

serve(handler);
