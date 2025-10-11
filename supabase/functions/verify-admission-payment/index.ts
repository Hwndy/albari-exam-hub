import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface VerifyRequest {
  reference: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { reference }: VerifyRequest = await req.json();

    console.log("Verifying payment:", reference);

    // Verify payment with Paystack
    const paystackResponse = await fetch(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          "Authorization": `Bearer ${Deno.env.get("PAYSTACK_SECRET_KEY")}`,
        },
      }
    );

    if (!paystackResponse.ok) {
      throw new Error("Failed to verify payment with Paystack");
    }

    const paystackData = await paystackResponse.json();

    if (paystackData.status && paystackData.data.status === "success") {
      // Update payment record
      const { error: paymentError } = await supabase
        .from("admission_payments")
        .update({
          status: "completed",
          payment_method: paystackData.data.channel,
          paid_at: new Date().toISOString(),
        })
        .eq("transaction_id", reference);

      if (paymentError) {
        console.error("Error updating payment:", paymentError);
      }

      // Get application ID from payment
      const { data: payment } = await supabase
        .from("admission_payments")
        .select("application_id")
        .eq("transaction_id", reference)
        .single();

      if (payment) {
        // Update application status to payment_pending -> under_review
        await supabase
          .from("admission_applications")
          .update({ status: "under_review" })
          .eq("id", payment.application_id);
      }

      console.log("Payment verified and updated successfully");

      return new Response(
        JSON.stringify({
          success: true,
          status: "completed",
          amount: paystackData.data.amount / 100,
          currency: paystackData.data.currency,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    } else {
      return new Response(
        JSON.stringify({
          success: false,
          status: paystackData.data.status,
          message: "Payment verification failed",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }
  } catch (error: any) {
    console.error("Error in verify-admission-payment:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});