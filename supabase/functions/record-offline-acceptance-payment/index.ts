import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { enrollApplicant } from "../_shared/enroll-applicant.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const METHODS = ["cash", "bank_transfer", "pos", "cheque"];

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status,
  });

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // ---- Authenticate the caller and require the admin role -------------
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (!token) return json({ error: "Not signed in" }, 401);

    const { data: userData, error: userError } = await admin.auth.getUser(token);
    if (userError || !userData?.user) return json({ error: "Not signed in" }, 401);

    const { data: isAdmin } = await admin.rpc("has_role", {
      _user_id: userData.user.id,
      _role: "admin",
    });
    if (!isAdmin) return json({ error: "Administrator access required" }, 403);

    // ---- Validate input -------------------------------------------------
    const body = await req.json().catch(() => ({}));
    const applicationId = String(body.application_id ?? "").trim();
    const amount = Number(body.amount);
    const method = String(body.method ?? "cash");
    const paidAt = body.paid_at ? new Date(body.paid_at) : new Date();
    const providedRef = String(body.reference ?? "").trim();
    const note = String(body.note ?? "").trim();

    const errors: string[] = [];
    if (!/^[0-9a-f-]{36}$/i.test(applicationId)) errors.push("A valid application is required");
    if (!Number.isFinite(amount) || amount <= 0) errors.push("Enter a valid amount");
    if (!METHODS.includes(method)) errors.push("Choose a valid payment method");
    if (isNaN(paidAt.getTime())) errors.push("Enter a valid date");
    if (errors.length) return json({ error: errors.join(". ") }, 400);

    const { data: application, error: appError } = await admin
      .from("admission_applications")
      .select("id, application_number, status, student_id")
      .eq("id", applicationId)
      .maybeSingle();
    if (appError || !application) return json({ error: "Application not found" }, 404);
    if (!['accepted', 'payment_pending', 'enrolled'].includes(application.status)) {
      return json({ error: "Only an accepted applicant can have an acceptance fee recorded" }, 400);
    }

    const reference =
      providedRef ||
      `OFFLINE-${application.application_number}-${Date.now()}`;

    // ---- Record the payment ---------------------------------------------
    const { data: pendingPayment } = await admin
      .from("admission_payments")
      .select("id")
      .eq("application_id", applicationId)
      .eq("payment_type", "acceptance_fee")
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const paymentRow = {
      application_id: applicationId,
      amount,
      payment_type: "acceptance_fee",
      status: "completed",
      payment_method: method,
      transaction_id: reference,
      payment_reference: reference,
      paid_at: paidAt.toISOString(),
      recorded_by: userData.user.id,
      notes: note || null,
    };

    if (pendingPayment) {
      const { error } = await admin
        .from("admission_payments")
        .update(paymentRow)
        .eq("id", pendingPayment.id);
      if (error) return json({ error: `Could not record the payment: ${error.message}` }, 400);
    } else {
      const { error } = await admin.from("admission_payments").insert(paymentRow);
      if (error) return json({ error: `Could not record the payment: ${error.message}` }, 400);
    }

    console.log(
      `Offline acceptance fee recorded by ${userData.user.id} for ${application.application_number}` +
        (note ? ` — ${note}` : "")
    );

    // ---- Enrol the applicant --------------------------------------------
    try {
      const enrollment = await enrollApplicant(admin, applicationId, {
        amount,
        method,
        reference,
      });
      return json({ success: true, payment_recorded: true, reference, ...enrollment });
    } catch (enrollError: any) {
      console.error("Enrollment failed after offline payment:", enrollError);
      return json({
        success: true,
        payment_recorded: true,
        enrollment_pending: true,
        reference,
        error: enrollError?.message ?? "Enrolment could not be completed",
      });
    }
  } catch (error: any) {
    console.error("Error in record-offline-acceptance-payment:", error);
    return json({ error: error.message }, 500);
  }
});
