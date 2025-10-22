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
const SENDER_EMAIL = Deno.env.get("SENDER_EMAIL") || "admissions@albari.edu.ng";
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
    
    const emailSubject = `🎉 Admission Offer - Al-Bari College`;
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; background-color: #f4f4f4;">
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); padding: 40px 20px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">Al-Bari College</h1>
            <p style="color: #e0e7ff; margin: 10px 0 0 0; font-size: 14px;">Excellence in Education</p>
          </div>
          
          <!-- Content -->
          <div style="padding: 40px 30px;">
            <h2 style="color: #2563eb; margin: 0 0 20px 0; font-size: 24px;">🎉 Congratulations!</h2>
            
            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
              Dear ${application.first_name} ${application.last_name},
            </p>
            
            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
              We are thrilled to inform you that you have been <strong>offered admission</strong> to <strong>Al-Bari College</strong> for the <strong>${application.classes?.name || 'upcoming'}</strong> class.
            </p>
            
            <div style="background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); padding: 25px; border-radius: 12px; margin: 30px 0; border-left: 4px solid #2563eb;">
              <h3 style="margin: 0 0 15px 0; color: #1e40af; font-size: 18px;">📋 Admission Details</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Application Number:</td>
                  <td style="padding: 8px 0; color: #111827; font-weight: 600; font-size: 14px;">${application.application_number}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Class:</td>
                  <td style="padding: 8px 0; color: #111827; font-weight: 600; font-size: 14px;">${application.classes?.name || 'N/A'}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Acceptance Fee:</td>
                  <td style="padding: 8px 0; color: #111827; font-weight: 600; font-size: 14px;">₦50,000</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Deadline:</td>
                  <td style="padding: 8px 0; color: #dc2626; font-weight: 600; font-size: 14px;">${new Date(acceptance_deadline).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                </tr>
              </table>
            </div>

            <div style="background: #fefce8; border-left: 4px solid #eab308; padding: 20px; border-radius: 8px; margin: 25px 0;">
              <p style="margin: 0; color: #713f12; font-size: 14px; line-height: 1.5;">
                <strong>⚠️ Important:</strong> You must accept and pay the acceptance fee by <strong>${new Date(acceptance_deadline).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</strong> to secure your place.
              </p>
            </div>

            <div style="margin: 30px 0;">
              <h4 style="color: #1f2937; margin: 0 0 15px 0; font-size: 16px;">🎯 Next Steps:</h4>
              <ol style="color: #4b5563; font-size: 14px; line-height: 1.8; margin: 0; padding-left: 20px;">
                <li>Click the button below to accept or decline your offer</li>
                <li>If you accept, you'll be directed to pay the acceptance fee (₦50,000)</li>
                <li>Complete the enrollment process after payment confirmation</li>
                <li>Receive your student login credentials via email</li>
              </ol>
            </div>

            <div style="text-align: center; margin: 35px 0;">
              <a href="${acceptanceUrl}" style="display: inline-block; background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: #ffffff; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(37, 99, 235, 0.3);">
                Accept Offer & Pay Fee →
              </a>
              <p style="margin-top: 15px; color: #6b7280; font-size: 13px;">
                The acceptance page includes a secure payment button
              </p>
            </div>
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

            <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">
              If you have any questions, please contact our admissions office at 
              <a href="mailto:admissions@albari.edu.ng" style="color: #2563eb; text-decoration: none;">admissions@albari.edu.ng</a>
            </p>

            <p style="margin-top: 30px; color: #059669; font-weight: 600; font-size: 16px;">
              Welcome to the Al-Bari College family! 🎓
            </p>
          </div>

          <!-- Footer -->
          <div style="background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 12px; margin: 0 0 10px 0;">
              Al-Bari College | Excellence in Education
            </p>
            <p style="color: #9ca3af; font-size: 11px; margin: 0;">
              This is an automated message from the admissions office. Please do not reply to this email.
            </p>
            <p style="color: #9ca3af; font-size: 11px; margin: 10px 0 0 0;">
              &copy; ${new Date().getFullYear()} Al-Bari College. All rights reserved.
            </p>
          </div>
        </div>
      </body>
      </html>
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
        from: `Al-Bari College <${SENDER_EMAIL}>`,
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
