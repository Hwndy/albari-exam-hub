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

// Statuses that must never be downgraded back to under_review
const LATER_STAGES = ["accepted", "payment_pending", "enrolled", "rejected", "withdrawn"];

serve(async (req) => {
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

    // Server-side truth: what kind of payment is this really?
    const { data: existingPayment } = await supabase
      .from("admission_payments")
      .select("application_id, payment_type")
      .eq("transaction_id", reference)
      .maybeSingle();

    // Acceptance fees must go through the enrollment flow, never through here.
    if (existingPayment?.payment_type === "acceptance_fee" || reference?.startsWith("ACC-")) {
      console.log("Delegating acceptance fee verification:", reference);
      const { data, error } = await supabase.functions.invoke("verify-acceptance-payment", {
        body: { reference },
      });
      if (error) throw error;
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

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
      const paidAt = new Date().toISOString();

      const { error: paymentError } = await supabase
        .from("admission_payments")
        .update({
          status: "completed",
          payment_method: paystackData.data.channel,
          paid_at: paidAt,
        })
        .eq("transaction_id", reference);

      if (paymentError) {
        console.error("Error updating payment:", paymentError);
      }

      let applicationInfo: Record<string, unknown> = {};

      if (existingPayment?.application_id) {
        const { data: application } = await supabase
          .from("admission_applications")
          .select("id, status, application_number, first_name, last_name, email")
          .eq("id", existingPayment.application_id)
          .maybeSingle();

        if (application) {
          applicationInfo = {
            application_number: application.application_number,
            student_name: `${application.first_name} ${application.last_name}`,
            login_email: application.email,
          };

          // Only advance the application; never downgrade a later stage.
          if (!LATER_STAGES.includes(application.status)) {
            await supabase
              .from("admission_applications")
              .update({ status: "under_review" })
              .eq("id", application.id);
          } else {
            console.log("Skipping status change; already at", application.status);
          }
        }
      }

      console.log("Payment verified and updated successfully");

      return new Response(
        JSON.stringify({
          success: true,
          status: "completed",
          payment_type: "application_fee",
          reference,
          amount: paystackData.data.amount / 100,
          currency: paystackData.data.currency,
          payment_method: paystackData.data.channel,
          paid_at: paystackData.data.paid_at ?? paidAt,
          ...applicationInfo,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: false,
        status: paystackData.data?.status,
        message: "Payment verification failed",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
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
