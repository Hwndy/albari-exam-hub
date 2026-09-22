import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { enrollApplicant } from "../_shared/enroll-applicant.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-paystack-signature",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Verify Paystack signature using Web Crypto API
    const signature = req.headers.get("x-paystack-signature");
    const body = await req.text();
    
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(Deno.env.get("PAYSTACK_SECRET_KEY") ?? ""),
      { name: "HMAC", hash: "SHA-512" },
      false,
      ["sign"]
    );
    
    const hashBuffer = await crypto.subtle.sign(
      "HMAC",
      key,
      encoder.encode(body)
    );
    
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    const received = signature ?? '';
    const hashBytes = new TextEncoder().encode(hash);
    const receivedBytes = new TextEncoder().encode(received);
    let signaturesMatch = hashBytes.length === receivedBytes.length;
    const maxLength = Math.max(hashBytes.length, receivedBytes.length);
    for (let i = 0; i < maxLength; i++) {
      signaturesMatch = signaturesMatch && (hashBytes[i] ?? 0) === (receivedBytes[i] ?? 0);
    }
    if (!signaturesMatch) {
      console.error("Invalid signature");
      return new Response(
        JSON.stringify({ error: "Invalid signature" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    const event = JSON.parse(body);
    if (!event || typeof event.event !== 'string' || !event.data || typeof event.data !== 'object') {
      return new Response(JSON.stringify({ error: 'Malformed webhook payload' }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    console.log("Webhook event received:", event.event);

    // Log webhook for debugging
    await supabase.from("paystack_webhooks").insert({
      event_type: event.event,
      event_data: event.data,
      reference: event.data.reference,
    });

    // Handle charge.success event
    if (event.event === "charge.success") {
      const { reference, status, amount, channel } = event.data;

      console.log("Processing successful charge:", reference);

      // Update payment record
      const { data: payment, error: paymentError } = await supabase
        .from("admission_payments")
        .update({
          status: "completed",
          payment_method: channel,
          paid_at: new Date().toISOString(),
        })
        .eq("transaction_id", reference)
        .select("application_id, payment_type, amount")
        .single();

      if (paymentError) {
        console.error("Error updating payment:", paymentError);
        throw paymentError;
      }

      if (payment) {
        // Handle based on payment type
        if (payment.payment_type === "application_fee") {
          // Update application status to under_review
          await supabase
            .from("admission_applications")
            .update({ status: "under_review" })
            .eq("id", payment.application_id);

          console.log("Application fee payment processed, status updated to under_review");

        } else if (payment.payment_type === "acceptance_fee") {
          const enrollment = await enrollApplicant(supabase, payment.application_id, {
            amount: Number(payment.amount ?? amount / 100),
            method: channel || "paystack",
            reference,
          });
          console.log("Student enrollment completed:", enrollment.admission_number);
        }

        // Mark webhook as processed
        await supabase
          .from("paystack_webhooks")
          .update({ processed: true, processed_at: new Date().toISOString() })
          .eq("reference", reference);
      }
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );

  } catch (error: any) {
    console.error("Webhook error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});