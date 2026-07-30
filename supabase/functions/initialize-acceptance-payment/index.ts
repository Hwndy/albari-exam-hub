import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface PaymentRequest {
  application_id: string;
  amount?: number;
  email: string;
  callback_url: string;
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

    const { application_id, email, callback_url }: PaymentRequest = await req.json();

    console.log("Initializing acceptance fee payment for:", application_id);

    const { data: application, error: appError } = await supabase
      .from("admission_applications")
      .select("application_number, first_name, last_name")
      .eq("id", application_id)
      .single();

    if (appError) throw new Error("Application not found");

    // Never trust a client-supplied amount: use the fee stored on the offer,
    // falling back to the configured admin default.
    const { data: offer } = await supabase
      .from("admission_offers")
      .select("acceptance_fee")
      .eq("application_id", application_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let amount = Number(offer?.acceptance_fee ?? 0);
    if (!Number.isFinite(amount) || amount <= 0) {
      const { data: setting } = await supabase
        .from("app_settings")
        .select("setting_value")
        .eq("setting_key", "acceptance_fee_amount")
        .maybeSingle();
      amount = Number(setting?.setting_value ?? 50000);
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error("Acceptance fee is not configured");
    }

    const paystackResponse = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${Deno.env.get("PAYSTACK_SECRET_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        amount: amount * 100,
        currency: "NGN",
        reference: `ACC-${application.application_number}-${Date.now()}`,
        callback_url,
        metadata: {
          application_id,
          application_number: application.application_number,
          student_name: `${application.first_name} ${application.last_name}`,
          payment_type: "acceptance_fee",
        },
      }),
    });

    if (!paystackResponse.ok) {
      const errorData = await paystackResponse.json();
      throw new Error(`Paystack error: ${JSON.stringify(errorData)}`);
    }

    const paystackData = await paystackResponse.json();

    const { error: paymentError } = await supabase
      .from("admission_payments")
      .insert({
        application_id,
        amount,
        payment_type: "acceptance_fee",
        transaction_id: paystackData.data.reference,
        payment_reference: paystackData.data.reference,
        status: "pending",
      });

    if (paymentError) {
      console.error("Error creating payment record:", paymentError);
    }

    console.log("Acceptance fee payment initialized:", paystackData.data.reference);

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
    console.error("Error in initialize-acceptance-payment:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
