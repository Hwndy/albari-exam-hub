import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface PaymentRequest {
  application_id: string;
  amount: number;
  email: string;
  callback_url: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create client with user's JWT for authentication
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: Authentication required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    const { application_id, amount, email, callback_url }: PaymentRequest = await req.json();

    console.log("Initializing payment for application:", application_id);

    // Use service role for privileged operations
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Verify the authenticated user owns this application
    const { data: application, error: appError } = await supabase
      .from("admission_applications")
      .select("application_number, first_name, last_name, email")
      .eq("id", application_id)
      .single();

    if (appError) {
      return new Response(
        JSON.stringify({ error: "Application not found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
      );
    }

    if (application.email !== user.email) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: You can only pay for your own application" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 403 }
      );
    }

    // Check for existing payment to prevent duplicates
    const { data: existingPayment } = await supabase
      .from("admission_payments")
      .select("id, status")
      .eq("application_id", application_id)
      .eq("payment_type", "application_fee")
      .in("status", ["pending", "completed"])
      .maybeSingle();

    if (existingPayment) {
      return new Response(
        JSON.stringify({ error: "A payment already exists for this application" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    console.log("Authorization verified for user:", user.email);


    // Initialize Paystack payment
    const paystackResponse = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${Deno.env.get("PAYSTACK_SECRET_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        amount: amount * 100, // Paystack uses kobo (smallest currency unit)
        currency: "NGN",
        reference: `ADM-${application.application_number}-${Date.now()}`,
        callback_url,
        metadata: {
          application_id,
          application_number: application.application_number,
          student_name: `${application.first_name} ${application.last_name}`,
          payment_type: "application_fee",
        },
      }),
    });

    if (!paystackResponse.ok) {
      const errorData = await paystackResponse.json();
      throw new Error(`Paystack error: ${JSON.stringify(errorData)}`);
    }

    const paystackData = await paystackResponse.json();

    // Create payment record
    const { error: paymentError } = await supabase
      .from("admission_payments")
      .insert({
        application_id,
        amount,
        payment_type: "application_fee",
        transaction_id: paystackData.data.reference,
        payment_reference: paystackData.data.reference,
        status: "pending",
      });

    if (paymentError) {
      console.error("Error creating payment record:", paymentError);
    }

    console.log("Payment initialized successfully:", paystackData.data.reference);

    return new Response(
      JSON.stringify({
        success: true,
        authorization_url: paystackData.data.authorization_url,
        access_code: paystackData.data.access_code,
        reference: paystackData.data.reference,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("Error in initialize-admission-payment:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});