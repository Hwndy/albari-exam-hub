import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { enrollApplicant } from "../_shared/enroll-applicant.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface VerifyRequest {
  reference: string;
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

    const { reference }: VerifyRequest = await req.json();

    console.log("Verifying acceptance payment:", reference);

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

      let enrollment: Record<string, unknown> | null = null;
      let enrollmentPending = false;

      try {
        const { data: payment } = await supabase
          .from("admission_payments")
          .select("application_id, amount")
          .eq("transaction_id", reference)
          .single();

        if (payment) {
          enrollment = await enrollApplicant(supabase, payment.application_id, {
            amount: Number(payment.amount ?? paystackData.data.amount / 100),
            method: paystackData.data.channel || "paystack",
            reference,
          }) as unknown as Record<string, unknown>;
        }
      } catch (enrollError: any) {
        // The money is confirmed at this point — never fail the receipt because
        // a post-payment step broke. Flag it so admin can complete enrolment.
        console.error("Enrollment failed after successful payment:", enrollError);
        enrollmentPending = true;
      }

      return new Response(
        JSON.stringify({
          success: true,
          status: "completed",
          amount: paystackData.data.amount / 100,
          currency: paystackData.data.currency,
          payment_type: "acceptance_fee",
          reference,
          payment_method: paystackData.data.channel,
          paid_at: paystackData.data.paid_at ?? new Date().toISOString(),
          enrollment_pending: enrollmentPending,
          ...(enrollment ?? {}),
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
    console.error("Error in verify-acceptance-payment:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
