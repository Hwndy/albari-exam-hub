import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.75.0";
import { z } from "npm:zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
    const parsed = z.object({ reference: z.string().trim().min(10).max(120) }).safeParse(await req.json());
    if (!parsed.success) return json({ error: "Invalid payment reference" }, 400);
    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;
    const userClient = createClient(url, anon, { global: { headers: { Authorization: authHeader } } });
    const { data: claims, error: claimsError } = await userClient.auth.getClaims(authHeader.slice(7));
    const userId = claims?.claims?.sub;
    if (claimsError || !userId) return json({ error: "Unauthorized" }, 401);
    const service = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
    const { data: payment } = await service.from("fee_payments").select("*").eq("payment_reference", parsed.data.reference).eq("parent_user_id", userId).maybeSingle();
    if (!payment) return json({ error: "Payment not found" }, 404);
    if (payment.status === "completed") return json({ success: true, alreadyVerified: true });
    const response = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(parsed.data.reference)}`, { headers: { Authorization: `Bearer ${Deno.env.get("PAYSTACK_SECRET_KEY")}` } });
    const result = await response.json();
    if (!response.ok || result?.data?.status !== "success" || Number(result.data.amount) !== Math.round(Number(payment.amount_paid) * 100)) return json({ error: "Payment has not been confirmed" }, 400);
    const paidAt = result.data.paid_at || new Date().toISOString();
    const receipt = `REC-${new Date().getFullYear()}-${parsed.data.reference.slice(-8).toUpperCase()}`;
    const { error: updateError } = await service.from("fee_payments").update({ status: "completed", paid_at: paidAt, payment_date: paidAt.slice(0, 10), receipt_number: receipt }).eq("id", payment.id).eq("status", "pending");
    if (updateError) return json({ error: "Could not finalize payment" }, 500);
    if (payment.fee_installment_id) {
      await service.from("fee_installments").update({ paid_amount: payment.amount_paid, status: "paid", paid_at: paidAt, payment_id: payment.id }).eq("id", payment.fee_installment_id);
    }
    return json({ success: true, receipt_number: receipt });
  } catch (error) {
    console.error("verify-fee-payment", error);
    return json({ error: "Could not verify payment" }, 500);
  }
});