import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

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

    if (hash !== signature) {
      console.error("Invalid signature");
      return new Response(
        JSON.stringify({ error: "Invalid signature" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    const event = JSON.parse(body);
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
          // Get application details for enrollment
          const { data: application } = await supabase
            .from("admission_applications")
            .select("*")
            .eq("id", payment.application_id)
            .single();

          if (application) {
            // Generate admission number
            const year = new Date().getFullYear();
            const { count } = await supabase
              .from("students")
              .select("*", { count: "exact", head: true });
            
            const sequence = String((count || 0) + 1).padStart(4, "0");
            const admissionNumber = `ALB/${year}/${sequence}`;

            // Generate random password
            const password = `Alb${Math.random().toString(36).slice(-8)}!`;

            // Create user account
            const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
              email: application.email,
              password: password,
              email_confirm: true,
              user_metadata: {
                full_name: `${application.first_name} ${application.last_name}`,
              },
            });

            if (authError) {
              console.error("Error creating user:", authError);
              throw authError;
            }

            // Create user role
            await supabase.from("user_roles").insert({
              user_id: authUser.user.id,
              role: "student",
              created_by: authUser.user.id,
            });

            // Create student record
            const { data: student, error: studentError } = await supabase
              .from("students")
              .insert({
                user_id: authUser.user.id,
                admission_number: admissionNumber,
                date_of_birth: application.date_of_birth,
                gender: application.gender,
                blood_group: application.blood_group,
                address: application.address,
                emergency_contact: application.parent_guardian_info,
                medical_info: {
                  conditions: application.medical_conditions,
                  allergies: application.allergies,
                },
                admission_date: new Date().toISOString().split("T")[0],
                status: "active",
              })
              .select()
              .single();

            if (studentError) {
              console.error("Error creating student:", studentError);
              throw studentError;
            }

            // Credit the acceptance fee towards the student's school fees.
            const acceptanceAmount = Number(payment.amount ?? 0);
            if (Number.isFinite(acceptanceAmount) && acceptanceAmount > 0) {
              const { data: existingCredit } = await supabase
                .from("fee_payments")
                .select("id")
                .eq("transaction_id", reference)
                .maybeSingle();
              if (existingCredit) {
                console.log("Acceptance fee already credited for", reference);
              } else {
              const { error: creditError } = await supabase.from("fee_payments").insert({
                student_id: student.id,
                amount_paid: acceptanceAmount,
                payment_method: channel || "paystack",
                transaction_id: reference,
                payment_reference: reference,
                status: "completed",
                paid_at: new Date().toISOString(),
                notes: "Acceptance fee credited towards school fees",
                metadata: { source: "acceptance_fee", application_id: payment.application_id },
              });
              if (creditError) {
                console.error("Error crediting acceptance fee:", creditError);
              }
              }
            }

            // Assign to class
            if (application.admitted_to_class_id) {
              await supabase.from("class_assignments").insert({
                student_id: student.id,
                class_id: application.admitted_to_class_id,
              });
            }

            // Update application with student ID and status
            await supabase
              .from("admission_applications")
              .update({
                status: "enrolled",
                student_id: student.id,
              })
              .eq("id", payment.application_id);

            // Send welcome email
            try {
              await supabase.functions.invoke("send-admission-notification", {
                body: {
                  application_id: payment.application_id,
                  notification_type: "enrolled",
                  additional_data: {
                    admission_number: admissionNumber,
                    login_email: application.email,
                    temporary_password: password,
                  },
                },
              });
            } catch (emailError) {
              console.error("Error sending welcome email:", emailError);
            }

            console.log("Student enrolled successfully:", admissionNumber);
          }
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