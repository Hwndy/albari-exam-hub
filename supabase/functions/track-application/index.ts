import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface TrackApplicationRequest {
  application_number: string;
  email: string;
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

    const body = (await req.json()) as TrackApplicationRequest;
    const application_number = body.application_number?.trim();
    const email = body.email?.trim().toLowerCase();

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

    // Query application with both application_number AND email (case-insensitive)
    const { data: application, error: appError } = await supabase
      .from("admission_applications")
      .select(`
        id,
        application_number,
        first_name,
        last_name,
        email,
        phone,
        status,
        application_date,
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
      .ilike("application_number", application_number)
      .ilike("email", email)
      .maybeSingle();

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
