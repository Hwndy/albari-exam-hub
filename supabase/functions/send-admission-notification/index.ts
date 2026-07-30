import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "npm:resend@2.0.0";

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;
const ALLOWED_EMAIL_DOMAIN = "albari.com.ng";
const DEFAULT_SENDER_EMAIL = "admissions@albari.com.ng";
const DEFAULT_REPLY_TO_EMAIL = "admissions@albari.com.ng";
const SENDER_EMAIL = getSafeSchoolEmail("SENDER_EMAIL", DEFAULT_SENDER_EMAIL);
const REPLY_TO = getReplyToEmail("REPLY_TO_EMAIL", DEFAULT_REPLY_TO_EMAIL);

function getSafeSchoolEmail(envName: string, fallback: string): string {
  const configured = Deno.env.get(envName)?.trim() || fallback;
  const domain = configured.split("@").pop()?.toLowerCase();

  if (domain !== ALLOWED_EMAIL_DOMAIN) {
    console.error(`${envName} is misconfigured. Expected @${ALLOWED_EMAIL_DOMAIN}, received @${domain || "unknown"}. Falling back to ${fallback}.`);
    return fallback;
  }

  return configured;
}

function getReplyToEmail(envName: string, fallback: string): string {
  const configured = Deno.env.get(envName)?.trim() || fallback;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(configured)) {
    console.error(`${envName} is not a valid email (${configured}). Falling back to ${fallback}.`);
    return fallback;
  }
  return configured;
}

// Helper function to send email with retry logic
async function sendEmailWithRetry(resend: any, emailData: any, maxRetries = MAX_RETRIES): Promise<any> {
  let lastError;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const result = await resend.emails.send(emailData);
      // Resend SDK returns { data, error } — treat error payload as a real failure.
      if (result && (result as any).error) {
        const err = (result as any).error;
        const message = err.message || err.name || JSON.stringify(err);
        throw new Error(`Resend error: ${message}`);
      }
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
  notification_type:
    | "submitted"
    | "under_review"
    | "interview_scheduled"
    | "accepted"
    | "rejected"
    | "enrolled"
    | "exam_result"
    | "exam_resit";
  additional_data?: any;
}

const emailTemplates: Record<string, (data: any) => { subject: string; html: string }> = {
  submitted: (data: any) => ({
    subject: `Application Received - ${data.application_number}`,
    html: `
      <h1>Application Received!</h1>
      <p>Dear ${data.first_name} ${data.last_name},</p>
      <p>Thank you for applying to Al-Bari Group of Schools. We have successfully received your application.</p>
      <p><strong>Application Number:</strong> ${data.application_number}</p>
      <p>You will receive updates on your application status via email.</p>
      <p>Next Steps:</p>
      <ul>
        <li>Your application will be reviewed by our admissions team</li>
        <li>You may be contacted for an interview</li>
        <li>Track your application status online using your application number</li>
      </ul>
      <p>Best regards,<br>Al-Bari Group of Schools Admissions Team</p>
    `,
  }),
  under_review: (data: any) => ({
    subject: `Application Under Review - ${data.application_number}`,
    html: `
      <h1>Application Under Review</h1>
      <p>Dear ${data.first_name} ${data.last_name},</p>
      <p>Your application (${data.application_number}) is currently under review by our admissions team.</p>
      <p>We will contact you soon with the next steps.</p>
      <p>Best regards,<br>Al-Bari Group of Schools Admissions Team</p>
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
        <li>Location: ${data.interview_location || 'Al-Bari Group of Schools Campus'}</li>
      </ul>
      <p>Please arrive 15 minutes early and bring the following:</p>
      <ul>
        <li>Valid ID</li>
        <li>Original academic certificates</li>
        <li>Birth certificate</li>
      </ul>
      <p>Best regards,<br>Al-Bari Group of Schools Admissions Team</p>
    `,
  }),
  accepted: (data: any) => ({
    subject: `🎉 Admission Offer - ${data.application_number}`,
    html: `
      <h1>Congratulations! Admission Offer</h1>
      <p>Dear ${data.first_name} ${data.last_name},</p>
      <p>We are delighted to offer you admission to Al-Bari Group of Schools for the academic year ${new Date().getFullYear()}/${new Date().getFullYear() + 1}.</p>
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
      <p>Welcome to the Al-Bari Group of Schools family!</p>
      <p>Best regards,<br>Al-Bari Group of Schools Admissions Team</p>
    `,
  }),
  rejected: (data: any) => ({
    subject: `Application Status Update - ${data.application_number}`,
    html: `
      <h1>Application Status Update</h1>
      <p>Dear ${data.first_name} ${data.last_name},</p>
      <p>Thank you for your interest in Al-Bari Group of Schools.</p>
      <p>After careful consideration, we regret to inform you that we are unable to offer you admission at this time.</p>
      <p>We received an overwhelming number of applications this year, and our decision was difficult given the high caliber of all applicants.</p>
      <p>We encourage you to reapply in the future and wish you the very best in your educational journey.</p>
      <p>Best regards,<br>Al-Bari Group of Schools Admissions Team</p>
    `,
  }),
  enrolled: (data: any) => {
    const s = data.enrollment_settings || {};
    const portal = String(s.portal_url || "https://www.albari.com.ng/login").replace(/\/$/, "");
    const actions: Array<{ label: string; url?: string }> = Array.isArray(s.required_actions) && s.required_actions.length
      ? s.required_actions
      : [
          { label: "Sign in and change your temporary password", url: portal },
          { label: "Complete your student profile", url: `${portal}` },
          { label: "Review the fee structure and payment schedule", url: `${portal}` },
          { label: "Download the school calendar", url: s.calendar_url || "" },
        ];
    const password = data.temporary_password;
    const studentLogin = data.login_email || data.email;
    const parentEmail = data.parent_email || data.contact_email || data.email;
    const parentPassword = data.parent_temporary_password;
    return {
      subject: `🎓 Welcome to Al-Bari Group of Schools - Login Credentials`,
      html: `
      <h1>Welcome to Al-Bari Group of Schools!</h1>
      <p>Dear ${data.first_name} ${data.last_name},</p>
      <p>${s.intro || "Your enrollment is now complete! Here are your login credentials for the student portal."}</p>
      <div style="border:1px solid #d4d4d4;border-radius:8px;padding:16px;margin:16px 0;background:#f7faf3;">
        <p style="margin:0 0 8px;"><strong>Student Portal Login</strong></p>
        <p style="margin:4px 0;"><strong>Portal:</strong> <a href="${portal}">${portal}</a></p>
        <p style="margin:4px 0;"><strong>Student Login ID:</strong> ${studentLogin}</p>
        <p style="margin:4px 0;"><strong>Admission Number:</strong> ${data.admission_number || "-"}</p>
        ${password
          ? `<p style="margin:4px 0;"><strong>Temporary Password:</strong> <code style="font-size:16px;letter-spacing:1px;">${password}</code></p>
             <p style="margin:8px 0 0;color:#8a5300;">For your security you will be asked to change this password the first time you sign in.</p>`
          : `<p style="margin:4px 0;"><strong>Temporary Password:</strong> Sent separately by the admissions office.</p>`}
        <p style="margin:10px 0 0;color:#555;font-size:13px;">This login ID is issued by the school. It is used to sign in only — it does not receive email. All school emails continue to come to ${parentEmail}.</p>
      </div>
      <div style="border:1px solid #d4d4d4;border-radius:8px;padding:16px;margin:16px 0;background:#f4f7fb;">
        <p style="margin:0 0 8px;"><strong>Parent Portal Login</strong></p>
        <p style="margin:4px 0;"><strong>Portal:</strong> <a href="${portal}">${portal}</a></p>
        <p style="margin:4px 0;"><strong>Email:</strong> ${parentEmail}</p>
        ${parentPassword
          ? `<p style="margin:4px 0;"><strong>Temporary Password:</strong> <code style="font-size:16px;letter-spacing:1px;">${parentPassword}</code></p>`
          : `<p style="margin:4px 0;">Use your existing parent portal password.</p>`}
        <p style="margin:10px 0 0;color:#555;font-size:13px;">If you have more than one child at Al-Bari, all of them appear under this single parent login — you do not need a separate email for each child.</p>
      </div>
      <p><strong>Important Information:</strong></p>
      <ul>
        <li>Orientation Date: ${s.orientation_date || data.orientation_date || "To be announced"}</li>
        <li>First Day of School: ${s.first_day || data.first_day || "To be announced"}</li>
        <li>Class: ${data.class_name || "As assigned"}</li>
      </ul>
      <p><strong>Required Actions:</strong></p>
      <ol>
        ${actions
          .map((a) => `<li>${a.url ? `<a href="${a.url}">${a.label}</a>` : a.label}</li>`)
          .join("")}
      </ol>
      ${s.support_line ? `<p>${s.support_line}</p>` : ""}
      <p>We look forward to seeing you on campus!</p>
      <p>Best regards,<br>Al-Bari Group of Schools Administration</p>
    `,
    };
  },
};

const outcomeLabel: Record<string, string> = {
  pass: "Successful",
  fail: "Unsuccessful",
  resit: "Resit Required",
  pending: "Under Review",
};

const subjectTable = (data: any) => {
  const rows = Array.isArray(data.subject_scores) ? data.subject_scores : [];
  if (!rows.length) return "";
  return `
    <table cellpadding="6" cellspacing="0" border="1" style="border-collapse:collapse;margin:12px 0;">
      <thead>
        <tr><th align="left">Subject</th><th align="left">Score</th></tr>
      </thead>
      <tbody>
        ${rows.map((r: any) => `<tr><td>${r.subject}</td><td>${r.score ?? "-"} / ${r.max ?? "-"}</td></tr>`).join("")}
      </tbody>
    </table>`;
};

emailTemplates.exam_result = (data: any) => ({
  subject: `Entrance Exam Result - ${data.application_number}`,
  html: `
    <h1>Entrance Examination Result</h1>
    <p>Dear ${data.first_name} ${data.last_name},</p>
    <p>Below is your result for <strong>${data.exam_title || "the entrance examination"}</strong>.</p>
    ${subjectTable(data)}
    <ul>
      <li><strong>Application Number:</strong> ${data.application_number}</li>
      <li><strong>Total Score:</strong> ${data.score ?? "-"}${data.max_score ? ` / ${data.max_score}` : ""}</li>
      <li><strong>Percentage:</strong> ${data.percentage != null ? `${data.percentage}%` : "-"}</li>
      <li><strong>Outcome:</strong> ${outcomeLabel[data.result_status] || "Under Review"}</li>
    </ul>
    ${data.comment ? `<p><strong>Examiner's Comment:</strong><br>${data.comment}</p>` : ""}
    <p>You will be contacted with the next steps in your admission process.</p>
    <p>Best regards,<br>Al-Bari Group of Schools Admissions Team</p>
  `,
});

emailTemplates.exam_resit = (data: any) => ({
  subject: `Entrance Exam Resit - ${data.application_number}`,
  html: `
    <h1>Entrance Examination Resit</h1>
    <p>Dear ${data.first_name} ${data.last_name},</p>
    <p>Following your performance in <strong>${data.exam_title || "the entrance examination"}</strong>, you have been invited to resit the examination.</p>
    ${subjectTable(data)}
    <ul>
      <li><strong>Application Number:</strong> ${data.application_number}</li>
      ${data.score != null ? `<li><strong>Previous Score:</strong> ${data.score}${data.max_score ? ` / ${data.max_score}` : ""}${data.percentage != null ? ` (${data.percentage}%)` : ""}</li>` : ""}
      <li><strong>Resit Date:</strong> ${data.resit_date || "To be communicated"}</li>
      <li><strong>Venue:</strong> ${data.resit_venue || "Al-Bari Group of Schools Campus"}</li>
    </ul>
    ${data.comment ? `<p><strong>Examiner's Comment:</strong><br>${data.comment}</p>` : ""}
    <p>Please arrive 30 minutes early with a valid means of identification and your application number.</p>
    <p>Best regards,<br>Al-Bari Group of Schools Admissions Team</p>
  `,
});

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

    // Admin-editable enrollment email content
    let enrollmentSettings: Record<string, unknown> = {};
    if (notification_type === "enrolled") {
      const { data: rows } = await supabase
        .from("app_settings")
        .select("setting_key, setting_value")
        .like("setting_key", "enrollment_email_%");
      rows?.forEach((r: any) => {
        enrollmentSettings[String(r.setting_key).replace("enrollment_email_", "")] = r.setting_value;
      });
    }

    // Prepare email data
    const emailData = {
      ...application,
      class_name: application.classes?.name,
      enrollment_settings: enrollmentSettings,
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

    let emailResult;
    try {
      // Send email with retry
      emailResult = await sendEmailWithRetry(resend, {
        from: `Al-Bari Group of Schools <${SENDER_EMAIL}>`,
        to: [application.email],
        reply_to: REPLY_TO,
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