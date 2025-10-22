import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const MAX_RETRIES = 3;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendOTPRequest {
  email: string;
  type: 'reset_password' | 'email_verification';
}

// Rate limiting configuration
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour in milliseconds
const MAX_OTP_SENDS_PER_HOUR = 3;
const MAX_IP_SENDS_PER_HOUR = 20;

async function checkRateLimit(
  supabase: any,
  identifier: string,
  action: string,
  maxAttempts: number
): Promise<{ allowed: boolean; blockedUntil?: Date }> {
  // Check if identifier is currently blocked
  const { data: existing, error } = await supabase
    .from('rate_limits')
    .select('*')
    .eq('identifier', identifier)
    .eq('action', action)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
    console.error('Rate limit check error:', error);
    // Fail open - allow the request if we can't check rate limits
    return { allowed: true };
  }

  const now = new Date();

  // Check if currently blocked
  if (existing?.blocked_until) {
    const blockedUntil = new Date(existing.blocked_until);
    if (blockedUntil > now) {
      return { allowed: false, blockedUntil };
    }
  }

  // Check if within rate limit window
  if (existing?.window_start) {
    const windowStart = new Date(existing.window_start);
    const windowAge = now.getTime() - windowStart.getTime();

    if (windowAge < RATE_LIMIT_WINDOW) {
      // Within window - check attempts
      if (existing.attempts >= maxAttempts) {
        // Block for 1 hour
        const blockedUntil = new Date(now.getTime() + RATE_LIMIT_WINDOW);
        
        await supabase
          .from('rate_limits')
          .update({
            blocked_until: blockedUntil.toISOString(),
            updated_at: now.toISOString()
          })
          .eq('identifier', identifier)
          .eq('action', action);

        return { allowed: false, blockedUntil };
      }

      // Increment attempts
      await supabase
        .from('rate_limits')
        .update({
          attempts: existing.attempts + 1,
          updated_at: now.toISOString()
        })
        .eq('identifier', identifier)
        .eq('action', action);

      return { allowed: true };
    }
  }

  // Start new window
  await supabase
    .from('rate_limits')
    .upsert({
      identifier,
      action,
      attempts: 1,
      window_start: now.toISOString(),
      blocked_until: null,
      updated_at: now.toISOString()
    }, { onConflict: 'identifier,action' });

  return { allowed: true };
}

async function sendEmailWithRetry(emailData: any, retries = MAX_RETRIES): Promise<any> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await resend.emails.send(emailData);
      return response;
    } catch (error: any) {
      console.error(`Email send attempt ${attempt} failed:`, error);
      if (attempt === retries) throw error;
      // Exponential backoff: 1s, 2s, 3s
      await new Promise(resolve => setTimeout(resolve, attempt * 1000));
    }
  }
}

async function logEmail(supabase: any, logData: any) {
  try {
    await supabase.from('email_logs').insert(logData);
  } catch (error) {
    console.error('Failed to log email:', error);
  }
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, type }: SendOTPRequest = await req.json();
    
    if (!email || !type) {
      return new Response(
        JSON.stringify({ error: 'Email and type are required' }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Initialize Supabase client with service role
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get client IP for rate limiting
    const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0] || 
                     req.headers.get('x-real-ip') || 
                     'unknown';

    // Check email-based rate limit (3 per hour per email)
    const emailRateCheck = await checkRateLimit(
      supabase,
      email.toLowerCase(),
      'otp_send',
      MAX_OTP_SENDS_PER_HOUR
    );

    if (!emailRateCheck.allowed) {
      const minutesLeft = emailRateCheck.blockedUntil 
        ? Math.ceil((emailRateCheck.blockedUntil.getTime() - Date.now()) / 60000)
        : 60;
      
      return new Response(
        JSON.stringify({ 
          error: `Too many OTP requests. Please try again in ${minutesLeft} minutes.`,
          blocked_until: emailRateCheck.blockedUntil?.toISOString()
        }),
        {
          status: 429,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Check IP-based rate limit (20 per hour per IP)
    const ipRateCheck = await checkRateLimit(
      supabase,
      clientIP,
      'otp_send_ip',
      MAX_IP_SENDS_PER_HOUR
    );

    if (!ipRateCheck.allowed) {
      return new Response(
        JSON.stringify({ 
          error: 'Too many requests from this location. Please try again later.'
        }),
        {
          status: 429,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Invalidate any existing unused OTPs for this email
    await supabase
      .from('password_reset_otps')
      .update({ used: true })
      .eq('email', email.toLowerCase())
      .eq('used', false);

    // Generate an 8-digit alphanumeric OTP (more secure)
    const otp = Math.random().toString(36).substring(2, 10).toUpperCase();
    
    // Store OTP in database with 5-minute expiration (reduced from 10)
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
    
    const { error: dbError } = await supabase
      .from('password_reset_otps')
      .insert({
        email: email.toLowerCase(),
        otp_code: otp,
        expires_at: expiresAt,
        used: false,
        created_at: new Date().toISOString()
      });

    if (dbError) {
      console.error('Database error:', dbError);
      return new Response(
        JSON.stringify({ error: 'Failed to store OTP' }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Prepare email content based on type
    let subject: string;
    let htmlContent: string;
    
    if (type === 'reset_password') {
      subject = "Password Reset Code - ALBARI CBT System";
      htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Password Reset Code</title>
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; padding: 20px 0;">
              <div style="width: 80px; height: 80px; background: linear-gradient(135deg, #059669, #10b981); border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 20px;">
                <span style="color: white; font-size: 32px; font-weight: bold;">A</span>
              </div>
              <h1 style="color: #059669; margin: 0;">ALBARI CBT System</h1>
              <p style="color: #6b7280; margin: 5px 0 30px;">Computer Based Test System</p>
            </div>
            
            <div style="background: #f9fafb; border-radius: 8px; padding: 30px; margin: 20px 0;">
              <h2 style="color: #1f2937; margin-top: 0;">Password Reset Code</h2>
              <p style="margin: 15px 0;">We received a request to reset your password. Use the verification code below to complete the password reset process:</p>
              
              <div style="text-align: center; margin: 30px 0;">
                <div style="background: white; border: 2px solid #059669; border-radius: 8px; padding: 20px; display: inline-block;">
                  <div style="font-size: 32px; font-weight: bold; color: #059669; letter-spacing: 8px; font-family: monospace;">${otp}</div>
                </div>
              </div>
              
              <p style="margin: 15px 0;"><strong>This code will expire in 5 minutes.</strong></p>
              <p style="margin: 15px 0;">If you didn't request a password reset, please ignore this email or contact your administrator if you have concerns.</p>
            </div>
            
            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
              <p style="color: #6b7280; font-size: 14px; margin: 0;">
                This is an automated message from ALBARI CBT System.<br>
                Please do not reply to this email.
              </p>
            </div>
          </body>
        </html>
      `;
    } else {
      subject = "Email Verification Code - ALBARI CBT System";
      htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Email Verification Code</title>
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; padding: 20px 0;">
              <div style="width: 80px; height: 80px; background: linear-gradient(135deg, #059669, #10b981); border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 20px;">
                <span style="color: white; font-size: 32px; font-weight: bold;">A</span>
              </div>
              <h1 style="color: #059669; margin: 0;">ALBARI CBT System</h1>
              <p style="color: #6b7280; margin: 5px 0 30px;">Computer Based Test System</p>
            </div>
            
            <div style="background: #f9fafb; border-radius: 8px; padding: 30px; margin: 20px 0;">
              <h2 style="color: #1f2937; margin-top: 0;">Verify Your Email</h2>
              <p style="margin: 15px 0;">Please use the verification code below to verify your email address:</p>
              
              <div style="text-align: center; margin: 30px 0;">
                <div style="background: white; border: 2px solid #059669; border-radius: 8px; padding: 20px; display: inline-block;">
                  <div style="font-size: 32px; font-weight: bold; color: #059669; letter-spacing: 8px; font-family: monospace;">${otp}</div>
                </div>
              </div>
              
              <p style="margin: 15px 0;"><strong>This code will expire in 5 minutes.</strong></p>
            </div>
            
            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
              <p style="color: #6b7280; font-size: 14px; margin: 0;">
                This is an automated message from ALBARI CBT System.<br>
                Please do not reply to this email.
              </p>
            </div>
          </body>
        </html>
      `;
    }

    // Log email attempt
    const emailLogData = {
      recipient_email: email,
      email_type: `otp_${type}`,
      subject: subject,
      status: 'pending' as const,
    };

    try {
      // Send email with retry via Resend
      const emailResponse = await sendEmailWithRetry({
        from: "Al-Bari College <onboarding@resend.dev>",
        to: [email],
        subject: subject,
        html: htmlContent,
      });

      // Update log with success
      await logEmail(supabase, {
        ...emailLogData,
        status: 'sent' as const,
        resend_id: emailResponse.data?.id,
        sent_at: new Date().toISOString(),
      });

      console.log("OTP email sent successfully");
    } catch (emailError: any) {
      // Update log with failure
      await logEmail(supabase, {
        ...emailLogData,
        status: 'failed' as const,
        error_message: emailError.message,
        retry_count: MAX_RETRIES,
      });

      console.error("Failed to send OTP email:", emailError);
      throw new Error(`Failed to send OTP email: ${emailError.message}`);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'OTP sent successfully',
        expires_in: 300 // 5 minutes
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error("Error in send-otp function:", error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
