import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const FRONTEND_URL = Deno.env.get("FRONTEND_URL") || "https://irrxmoqbgygyyzozifdl.lovable.app";
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

interface OfferLetterRequest {
  application_id: string;
  acceptance_deadline: string;
}

// Helper function to send email with retry logic
async function sendEmailWithRetry(emailData: any, maxRetries = MAX_RETRIES): Promise<any> {
  let lastError;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const result = await resend.emails.send(emailData);
      return result;
    } catch (error) {
      console.error(`Email send attempt ${attempt + 1} failed:`, error);
      lastError = error;
      if (attempt < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS * (attempt + 1)));
      }
    }
  }
  throw lastError;
}

// Helper function to log email attempts
async function logEmail(supabase: any, logData: any) {
  try {
    await supabase.from('email_logs').insert(logData);
  } catch (error) {
    console.error('Failed to log email:', error);
  }
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

    const { application_id, acceptance_deadline }: OfferLetterRequest = await req.json();

    console.log("Sending offer letter for:", application_id);

    const { data: application, error: appError } = await supabase
      .from("admission_applications")
      .select(`
        *,
        classes:applying_for_class_id(name)
      `)
      .eq("id", application_id)
      .single();

    if (appError || !application) {
      throw new Error("Application not found");
    }

    // Generate acceptance token
    const acceptanceToken = crypto.randomUUID();

    // Create offer record with acceptance fee
    const { error: offerError } = await supabase
      .from("admission_offers")
      .insert({
        application_id,
        acceptance_deadline,
        acceptance_token: acceptanceToken,
        acceptance_fee: 50000,
        status: "sent",
      });

    if (offerError) {
      console.error("Error creating offer:", offerError);
      throw new Error(`Failed to create offer: ${offerError.message}`);
    }

    const acceptanceUrl = `${FRONTEND_URL}/website/accept-offer/${acceptanceToken}`;
    
    const emailSubject = `🎉 Admission Offer - ${application.application_number}`;
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #2563eb;">🎉 Congratulations!</h1>
        <p>Dear ${application.first_name} ${application.last_name},</p>
        
        <p>We are thrilled to inform you that you have been <strong>offered admission</strong> to <strong>Al-Bari College</strong> for the <strong>${application.classes?.name || 'upcoming'}</strong> class.</p>
        
        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Admission Details:</h3>
          <ul style="list-style: none; padding: 0;">
            <li><strong>Application Number:</strong> ${application.application_number}</li>
            <li><strong>Class:</strong> ${application.classes?.name || 'N/A'}</li>
            <li><strong>Acceptance Fee:</strong> ₦50,000</li>
            <li><strong>Deadline:</strong> ${new Date(acceptance_deadline).toLocaleDateString()}</li>
          </ul>
        </div>

        <p><strong>Next Steps:</strong></p>
        <ol>
          <li>Click the button below to accept or decline your offer</li>
          <li>If you accept, you'll be directed to pay the acceptance fee</li>
          <li>Complete the enrollment process after payment confirmation</li>
        </ol>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${acceptanceUrl}" style="background: #2563eb; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold; margin-bottom: 10px;">
            Accept Offer & Pay Fee
          </a>
          <p style="margin-top: 15px; color: #6b7280; font-size: 14px;">
            The acceptance page includes a secure payment button
          </p>
        </div>

        <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;">
          <p style="margin: 0; color: #92400e;">
            <strong>⚠️ Important:</strong> You must accept and pay the acceptance fee by <strong>${new Date(acceptance_deadline).toLocaleDateString()}</strong> to secure your place.
          </p>
        </div>

        <p style="color: #6b7280; font-size: 14px;">
          If you have any questions, please contact our admissions office at <a href="mailto:admissions@albari.edu.ng" style="color: #2563eb;">admissions@albari.edu.ng</a>
        </p>

        <p style="margin-top: 20px;">
          Welcome to the Al-Bari College family!
        </p>

        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
        
        <p style="color: #6b7280; font-size: 12px;">
          This is an automated message. Please do not reply to this email.
        </p>
      </div>
    `;

    // Log email attempt
    const emailLogData = {
      recipient_email: application.email,
      email_type: 'admission_offer',
      subject: emailSubject,
      application_id: application_id,
      status: 'pending',
    };
    
    let emailResult;
    try {
      emailResult = await sendEmailWithRetry({
        from: "Al-Bari College <onboarding@resend.dev>",
        to: [application.email],
        subject: emailSubject,
        html: emailHtml,
      });

      // Update log with success
      await logEmail(supabase, {
        ...emailLogData,
        status: 'sent',
        resend_id: emailResult.id,
        sent_at: new Date().toISOString(),
      });

      console.log("Offer letter sent successfully:", emailResult);
    } catch (error: any) {
      // Update log with failure
      await logEmail(supabase, {
        ...emailLogData,
        status: 'failed',
        error_message: error.message,
        retry_count: MAX_RETRIES,
      });
      
      console.error("Failed to send offer letter after retries:", error);
      throw new Error(`Failed to send email: ${error.message}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Offer letter sent successfully",
        acceptance_url: acceptanceUrl,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("Error in send-offer-letter:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
