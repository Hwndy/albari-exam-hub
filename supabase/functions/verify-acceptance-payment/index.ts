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

      const { data: payment } = await supabase
        .from("admission_payments")
        .select("application_id, amount")
        .eq("transaction_id", reference)
        .single();

      if (payment) {
        // Get application details
        const { data: application } = await supabase
          .from("admission_applications")
          .select("*")
          .eq("id", payment.application_id)
          .single();

        if (application) {
          // Idempotency: if the webhook (or an earlier verify call) already
          // enrolled this applicant, just return the existing details.
          if (application.student_id || application.status === "enrolled") {
            const { data: existingStudent } = await supabase
              .from("students")
              .select("admission_number")
              .eq("id", application.student_id)
              .maybeSingle();
            console.log("Application already enrolled, skipping creation");
            enrollment = {
              already_enrolled: true,
              admission_number: existingStudent?.admission_number ?? null,
              login_email: application.email,
              application_number: application.application_number,
              student_name: `${application.first_name} ${application.last_name}`,
            };
          } else {
          // Generate admission number
          const year = new Date().getFullYear();
          const { count } = await supabase
            .from("students")
            .select("*", { count: "exact", head: true });
          
          const sequence = String((count || 0) + 1).padStart(4, "0");
          const admissionNumber = `ALB/${year}/${sequence}`;

          // Generate random password
          const password = `Alb${Math.random().toString(36).slice(-8)}!`;

          // Create (or reuse) the applicant's auth account.
          let userId: string | null = null;
          const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
            email: application.email,
            password: password,
            email_confirm: true,
            user_metadata: {
              full_name: `${application.first_name} ${application.last_name}`,
              role: "student",
            },
          });

          if (authError) {
            // A previous partially-failed run may already have created the user.
            console.warn("createUser failed, looking up existing account:", authError.message);
            const { data: list } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
            const existing = list?.users?.find(
              (u: any) => (u.email ?? "").toLowerCase() === String(application.email).toLowerCase()
            );
            if (!existing) throw authError;
            userId = existing.id;
            // Reset password so the welcome email credentials work.
            await supabase.auth.admin.updateUserById(userId, { password, email_confirm: true });
          } else {
            userId = authUser.user.id;
          }

          // Ensure the student role exists (trigger covers new users only).
          await supabase
            .from("user_roles")
            .insert({ user_id: userId, role: "student", created_by: userId })
            .select()
            .maybeSingle();

          // Ensure a profile exists and force a password change on first login.
          const { error: profileError } = await supabase
            .from("profiles")
            .upsert(
              {
                user_id: userId,
                full_name: `${application.first_name} ${application.middle_name ?? ""} ${application.last_name}`
                  .replace(/\s+/g, " ")
                  .trim(),
                must_change_password: true,
              },
              { onConflict: "user_id" }
            );
          if (profileError) {
            console.error("Error upserting student profile:", profileError);
            throw profileError;
          }

          // Reuse an existing student record if one was already created.
          const { data: priorStudent } = await supabase
            .from("students")
            .select("id, admission_number")
            .eq("user_id", userId)
            .maybeSingle();

          // Create student record
          const { data: newStudent, error: studentError } = priorStudent
            ? { data: priorStudent, error: null }
            : await supabase
            .from("students")
            .insert({
              user_id: userId,
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
          const student = newStudent as { id: string; admission_number: string };
          const finalAdmissionNumber = student.admission_number ?? admissionNumber;

          // Credit the acceptance fee against the student's school fees so the
          // "deducted from school fees" promise on the offer holds true.
          const acceptanceAmount = Number(payment.amount ?? paystackData.data.amount / 100);
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
              payment_method: paystackData.data.channel || "paystack",
              transaction_id: reference,
              payment_reference: reference,
              status: "completed",
              paid_at: new Date().toISOString(),
              notes: "Acceptance fee credited towards school fees",
              metadata: { source: "acceptance_fee", application_id: payment.application_id },
            });
            if (creditError) {
              console.error("Error crediting acceptance fee to school fees:", creditError);
            }
            }
          }

          // Assign to class (class_assignments.student_id references profiles.user_id)
          const classId = application.admitted_to_class_id ?? application.applying_for_class_id;
          if (classId) {
            const { data: existingAssignment } = await supabase
              .from("class_assignments")
              .select("id")
              .eq("student_id", userId)
              .maybeSingle();
            if (!existingAssignment) {
              const { error: assignError } = await supabase.from("class_assignments").insert({
                student_id: userId,
                class_id: classId,
              });
              if (assignError) console.error("Error assigning student to class:", assignError);
            }
            if (!application.admitted_to_class_id) {
              await supabase
                .from("admission_applications")
                .update({ admitted_to_class_id: classId })
                .eq("id", payment.application_id);
            }
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
            let className: string | null = null;
            if (application.admitted_to_class_id) {
              const { data: cls } = await supabase
                .from("classes")
                .select("name")
                .eq("id", application.admitted_to_class_id)
                .maybeSingle();
              className = cls?.name ?? null;
            }
            await supabase.functions.invoke("send-admission-notification", {
              body: {
                application_id: payment.application_id,
                notification_type: "enrolled",
                additional_data: {
                  admission_number: finalAdmissionNumber,
                  login_email: application.email,
                  temporary_password: password,
                  ...(className ? { class_name: className } : {}),
                },
              },
            });
          } catch (emailError) {
            console.error("Error sending welcome email:", emailError);
          }

          console.log("Student enrolled successfully:", finalAdmissionNumber);
          enrollment = {
            already_enrolled: false,
            admission_number: finalAdmissionNumber,
            login_email: application.email,
            application_number: application.application_number,
            student_name: `${application.first_name} ${application.last_name}`,
          };
          }
        }
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
