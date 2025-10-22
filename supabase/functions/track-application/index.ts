import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const RATE_LIMIT_WINDOW_MINUTES = 60;
const MAX_ATTEMPTS_PER_WINDOW = 5;
const BLOCK_DURATION_MINUTES = 30;

interface TrackApplicationRequest {
  application_number: string;
  email: string;
}

async function checkRateLimit(
  supabase: any,
  identifier: string
): Promise<{ allowed: boolean; message?: string }> {
  // Clean up old entries
  await supabase
    .from("application_tracking_limits")
    .delete()
    .lt("window_start", new Date(Date.now() - RATE_LIMIT_WINDOW_MINUTES * 60 * 1000).toISOString());

  // Check if blocked
  const { data: blocked } = await supabase
    .from("application_tracking_limits")
    .select("blocked_until")
    .eq("identifier", identifier)
    .gt("blocked_until", new Date().toISOString())
    .single();

  if (blocked) {
    return {
      allowed: false,
      message: `Too many attempts. Please try again after ${new Date(blocked.blocked_until).toLocaleTimeString()}`,
    };
  }

  // Get current window
  const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MINUTES * 60 * 1000);
  const { data: existing } = await supabase
    .from("application_tracking_limits")
    .select("*")
    .eq("identifier", identifier)
    .gte("window_start", windowStart.toISOString())
    .single();

  if (existing) {
    const newAttempts = existing.attempts + 1;
    
    if (newAttempts > MAX_ATTEMPTS_PER_WINDOW) {
      // Block user
      const blockedUntil = new Date(Date.now() + BLOCK_DURATION_MINUTES * 60 * 1000);
      await supabase
        .from("application_tracking_limits")
        .update({
          blocked_until: blockedUntil.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("identifier", identifier);

      return {
        allowed: false,
        message: `Rate limit exceeded. Blocked until ${blockedUntil.toLocaleTimeString()}`,
      };
    }

    // Increment attempts
    await supabase
      .from("application_tracking_limits")
      .update({
        attempts: newAttempts,
        updated_at: new Date().toISOString(),
      })
      .eq("identifier", identifier);
  } else {
    // Create new tracking record
    await supabase
      .from("application_tracking_limits")
      .insert({
        identifier,
        attempts: 1,
        window_start: new Date().toISOString(),
      });
  }

  return { allowed: true };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { application_number, email }: TrackApplicationRequest = await req.json();

    console.log("Tracking application:", { application_number, email });

    // Validate input
    if (!application_number || !email) {
      return new Response(
        JSON.stringify({ error: "Application number and email are required" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    // Get IP address for rate limiting
    const ip = req.headers.get("x-forwarded-for") || "unknown";
    const identifier = `${ip}_${email}`;

    // Check rate limit
    const rateLimitCheck = await checkRateLimit(supabase, identifier);
    if (!rateLimitCheck.allowed) {
      return new Response(
        JSON.stringify({ error: rateLimitCheck.message }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 429,
        }
      );
    }

    // Query application with both application_number AND email
    const { data: application, error: appError } = await supabase
      .from("admission_applications")
      .select(`
        id,
        application_number,
        first_name,
        last_name,
        status,
        created_at,
        applying_for_class_id,
        classes:applying_for_class_id(name),
        admission_payments(
          id,
          payment_type,
          amount,
          status,
          created_at
        ),
        admission_offers(
          id,
          status,
          acceptance_deadline,
          acceptance_fee
        ),
        admission_interviews(
          id,
          scheduled_date,
          status,
          interview_type,
          location
        ),
        admission_exam_assignments(
          id,
          exam_id,
          assigned_at,
          exams(title, duration_minutes)
        )
      `)
      .eq("application_number", application_number)
      .eq("email", email)
      .single();

    if (appError || !application) {
      console.error("Application not found:", appError);
      return new Response(
        JSON.stringify({ 
          error: "Application not found. Please verify your application number and email address.",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 404,
        }
      );
    }

    console.log("Application found:", application.id);

    return new Response(
      JSON.stringify({
        success: true,
        application,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("Error in track-application:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
