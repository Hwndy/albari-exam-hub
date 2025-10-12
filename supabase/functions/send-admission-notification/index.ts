import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "npm:resend@2.0.0";

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

// Helper function to send email with retry logic
async function sendEmailWithRetry(resend: any, emailData: any, maxRetries = MAX_RETRIES): Promise<any> {
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

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

interface NotificationRequest {
  application_id: string;
  notification_type: "submitted" | "under_review" | "interview_scheduled" | "accepted" | "rejected" | "enrolled";
  additional_data?: any;
}

const emailTemplates = {
  submitted: (data: any) => ({
    subject: `Application Received - ${data.application_number}`,
    html: `
      <h1>Application Received!</h1>
      <p>Dear ${data.first_name} ${data.last_name},</p>
      <p>Thank you for applying to Al-Bari College. We have successfully received your application.</p>
      <p><strong>Application Number:</strong> ${data.application_number}</p>
      <p>You will receive updates on your application status via email.</p>
      <p>Next Steps:</p>
      <ul>
        <li>Your application will be reviewed by our admissions team</li>
        <li>You may be contacted for an interview</li>
        <li>Track your application status online using your application number</li>
      </ul>
      <p>Best regards,<br>Al-Bari College Admissions Team</p>
    `,
  }),
  under_review: (data: any) => ({
    subject: `Application Under Review - ${data.application_number}`,
    html: `
      <h1>Application Under Review</h1>
      <p>Dear ${data.first_name} ${data.last_name},</p>
      <p>Your application (${data.application_number}) is currently under review by our admissions team.</p>
      <p>We will contact you soon with the next steps.</p>
      <p>Best regards,<br>Al-Bari College Admissions Team</p>
    `,
  }),
  interview_scheduled: (data: any) => ({
    subject: `Interview Scheduled - ${data.application_number}`,
    html: `
      <h1>Interview Scheduled</h1>
      <p>Dear ${data.first_name} ${data.last_name},</p>
      <p>Congratulations! Your application has progressed to the interview stage.</p>
      <p><strong>Interview Details:</strong></p>
      <ul>
        <li>Date: ${data.interview_date || 'To be confirmed'}</li>
        <li>Time: ${data.interview_time || 'To be confirmed'}</li>
        <li>Location: ${data.interview_location || 'Al-Bari College Campus'}</li>
      </ul>
      <p>Please arrive 15 minutes early and bring the following:</p>
      <ul>
        <li>Valid ID</li>
        <li>Original academic certificates</li>
        <li>Birth certificate</li>
      </ul>
      <p>Best regards,<br>Al-Bari College Admissions Team</p>
    `,
  }),
  accepted: (data: any) => ({
    subject: `🎉 Admission Offer - ${data.application_number}`,
    html: `
      <h1>Congratulations! Admission Offer</h1>
      <p>Dear ${data.first_name} ${data.last_name},</p>
      <p>We are delighted to offer you admission to Al-Bari College for the academic year ${new Date().getFullYear()}/${new Date().getFullYear() + 1}.</p>
      <p><strong>Application Number:</strong> ${data.application_number}</p>
      <p><strong>Class:</strong> ${data.class_name || 'As applied'}</p>
      <p><strong>Next Steps:</strong></p>
      <ol>
        <li>Accept your admission offer by paying the acceptance fee</li>
        <li>Complete the enrollment process</li>
        <li>Attend orientation on the specified date</li>
      </ol>
      <p>Payment Instructions:</p>
      <p>Please proceed to complete your acceptance fee payment to secure your spot.</p>
      <p>Welcome to the Al-Bari College family!</p>
      <p>Best regards,<br>Al-Bari College Admissions Team</p>
    `,
  }),
  rejected: (data: any) => ({
    subject: `Application Status Update - ${data.application_number}`,
    html: `
      <h1>Application Status Update</h1>
      <p>Dear ${data.first_name} ${data.last_name},</p>
      <p>Thank you for your interest in Al-Bari College.</p>
      <p>After careful consideration, we regret to inform you that we are unable to offer you admission at this time.</p>
      <p>We received an overwhelming number of applications this year, and our decision was difficult given the high caliber of all applicants.</p>
      <p>We encourage you to reapply in the future and wish you the very best in your educational journey.</p>
      <p>Best regards,<br>Al-Bari College Admissions Team</p>
    `,
  }),
  enrolled: (data: any) => ({
    subject: `🎓 Welcome to Al-Bari College - Login Credentials`,
    html: `
      <h1>Welcome to Al-Bari College!</h1>
      <p>Dear ${data.first_name} ${data.last_name},</p>
      <p>Your enrollment is now complete! Here are your login credentials for the student portal:</p>
      <p><strong>Student Portal Login:</strong></p>
      <ul>
        <li><strong>Username:</strong> ${data.email}</li>
        <li><strong>Admission Number:</strong> ${data.admission_number}</li>
        <li><strong>Temporary Password:</strong> Will be sent separately</li>
      </ul>
      <p><strong>Important Information:</strong></p>
      <ul>
        <li>Orientation Date: ${data.orientation_date || 'To be announced'}</li>
        <li>First Day of School: ${data.first_day || 'To be announced'}</li>
        <li>Class: ${data.class_name || 'As assigned'}</li>
      </ul>
      <p><strong>Required Actions:</strong></p>
      <ol>
        <li>Change your password on first login</li>
        <li>Complete your student profile</li>
        <li>Review the fee structure and payment schedule</li>
        <li>Download the school calendar</li>
      </ol>
      <p>We look forward to seeing you on campus!</p>
      <p>Best regards,<br>Al-Bari College Administration</p>
    `,
  }),
};

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

    const { application_id, notification_type, additional_data }: NotificationRequest = await req.json();

    console.log(`Sending ${notification_type} notification for application:`, application_id);

    // Get application details
    const { data: application, error: appError } = await supabase
      .from("admission_applications")
      .select(`
        *,
        classes:applying_for_class_id (name)
      `)
      .eq("id", application_id)
      .single();

    if (appError || !application) {
      throw new Error("Application not found");
    }

    // Prepare email data
    const emailData = {
      ...application,
      class_name: application.classes?.name,
      ...additional_data,
    };

    const template = emailTemplates[notification_type](emailData);

    // Log email attempt
    const emailLogData = {
      recipient_email: application.email,
      email_type: `admission_${notification_type}`,
      subject: template.subject,
      application_id: application_id,
      status: 'pending' as const,
    };

    try {
      // Send email with retry
      const emailResult = await sendEmailWithRetry(resend, {
        from: "Al-Bari College <onboarding@resend.dev>",
        to: [application.email],
        subject: template.subject,
        html: template.html,
      });

      // Update log with success
      await logEmail(supabase, {
        ...emailLogData,
        status: 'sent' as const,
        resend_id: emailResult.id,
        sent_at: new Date().toISOString(),
      });

      console.log("Notification email sent successfully:", emailResult);
    } catch (emailError: any) {
      // Update log with failure
      await logEmail(supabase, {
        ...emailLogData,
        status: 'failed' as const,
        error_message: emailError.message,
        retry_count: MAX_RETRIES,
      });

      console.error("Failed to send notification email:", emailError);
      throw new Error(`Failed to send email: ${emailError.message}`);
    }

    console.log("Email sent successfully:", emailResult);

    return new Response(
      JSON.stringify({
        success: true,
        message: `${notification_type} notification sent successfully`,
        email_id: emailResult?.id,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("Error in send-admission-notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});