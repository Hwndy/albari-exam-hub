import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "npm:resend@2.0.0";
import { jsPDF } from "npm:jspdf@2.5.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const FRONTEND_URL = (Deno.env.get("FRONTEND_URL") || "https://www.albari.com.ng").replace(/\/+$/, "");
// NOTE: the custom domain serves index.html for /__l5e/* paths, so assets must be
// loaded from the Lovable asset host (or an explicit ASSET_BASE_URL secret).
const ASSET_BASE_URL = (Deno.env.get("ASSET_BASE_URL") || "https://id-preview--def176ba-5aaa-4bf2-a711-588b116fc44e.lovable.app").replace(/\/+$/, "");
const LETTERHEAD_URL = `${ASSET_BASE_URL}/__l5e/assets-v1/5fe05427-7253-4d80-9bf2-ca75a2a096e5/albari-letterhead.png`;
const ALLOWED_EMAIL_DOMAIN = "albari.com.ng";
const DEFAULT_SENDER_EMAIL = "admissions@albari.com.ng";
const DEFAULT_REPLY_TO_EMAIL = "admissions@albari.com.ng";
const SENDER_EMAIL = getSafeSchoolEmail("SENDER_EMAIL", DEFAULT_SENDER_EMAIL);
const REPLY_TO = getReplyToEmail("REPLY_TO_EMAIL", DEFAULT_REPLY_TO_EMAIL);
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

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

interface OfferLetterRequest {
  application_id: string;
  acceptance_deadline: string;
  acceptance_fee?: number;
}

// Helper function to send email with retry logic
async function sendEmailWithRetry(emailData: any, maxRetries = MAX_RETRIES): Promise<any> {
  let lastError;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const result = await resend.emails.send(emailData);
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

// Fetch letterhead PNG once and cache as base64 data URL for jsPDF
let cachedLetterhead: string | null = null;
async function getLetterheadDataUrl(): Promise<string | null> {
  if (cachedLetterhead) return cachedLetterhead;
  try {
    const res = await fetch(LETTERHEAD_URL);
    if (!res.ok) {
      console.error("Failed to fetch letterhead:", res.status);
      return null;
    }
    const buf = new Uint8Array(await res.arrayBuffer());
    // Guard: some hosts return an SPA index.html with a 200 status.
    const PNG_SIG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
    if (buf.length < 8 || PNG_SIG.some((b, i) => buf[i] !== b)) {
      console.error("Letterhead URL did not return a PNG:", res.headers.get("content-type"));
      return null;
    }
    let binary = "";
    for (let i = 0; i < buf.length; i++) binary += String.fromCharCode(buf[i]);
    cachedLetterhead = `data:image/png;base64,${btoa(binary)}`;
    return cachedLetterhead;
  } catch (e) {
    console.error("Letterhead fetch error:", e);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Offer letter PDF — the letter is typeset INSIDE the official letterhead page.
// The letterhead PNG is a full-page design (crest + address band at the top,
// watermark in the middle, colour bars at the foot), so it is drawn as the page
// background and all text is laid out inside a safe area between the two.
// ---------------------------------------------------------------------------
const PAGE_FORMAT = "letter";      // 215.9mm x 279.4mm — matches the artwork ratio
const SAFE_TOP = 62;               // below the address band
const SAFE_BOTTOM = 248;           // above the footer colour bars
const SAFE_LEFT = 25;
const SAFE_RIGHT = 25;

function fmtDate(value: string | number | Date) {
  return new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

async function generateOfferLetterPDF(
  application: any,
  acceptanceDeadline: string,
  acceptanceFee: number,
  acceptanceFeeNote: string,
): Promise<Uint8Array> {
  const doc = new jsPDF({ unit: "mm", format: PAGE_FORMAT });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const contentWidth = pageWidth - SAFE_LEFT - SAFE_RIGHT;

  const letterhead = await getLetterheadDataUrl();

  const paintBackground = () => {
    if (letterhead) {
      try {
        doc.addImage(letterhead, "PNG", 0, 0, pageWidth, pageHeight, undefined, "FAST");
        return true;
      } catch (e) {
        console.error("Failed to draw letterhead:", e);
      }
    }
    // Fallback stationery if the artwork cannot be fetched.
    doc.setFillColor(21, 128, 61);
    doc.rect(0, 0, pageWidth, 26, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("AL-BARI COLLEGE", pageWidth / 2, 16, { align: "center" });
    doc.setTextColor(0, 0, 0);
    doc.setFillColor(21, 128, 61);
    doc.rect(0, pageHeight - 10, pageWidth, 10, "F");
    return false;
  };

  paintBackground();
  let y = SAFE_TOP;

  const ensureSpace = (needed: number) => {
    if (y + needed <= SAFE_BOTTOM) return;
    doc.addPage(PAGE_FORMAT);
    paintBackground();
    y = SAFE_TOP;
  };

  const write = (
    text: string,
    opts: { size?: number; bold?: boolean; align?: "left" | "center" | "right"; gap?: number; colour?: [number, number, number] } = {},
  ) => {
    const size = opts.size ?? 11;
    doc.setFont("helvetica", opts.bold ? "bold" : "normal");
    doc.setFontSize(size);
    const [r, g, b] = opts.colour ?? [17, 24, 39];
    doc.setTextColor(r, g, b);
    const lines = doc.splitTextToSize(text, contentWidth);
    const lineHeight = size * 0.52;
    ensureSpace(lines.length * lineHeight);
    const x = opts.align === "center" ? pageWidth / 2 : opts.align === "right" ? pageWidth - SAFE_RIGHT : SAFE_LEFT;
    doc.text(lines, x, y, opts.align ? { align: opts.align } : undefined);
    y += lines.length * lineHeight + (opts.gap ?? 4);
  };

  const detailRow = (label: string, value: string) => {
    ensureSpace(6);
    doc.setFontSize(11);
    doc.setTextColor(17, 24, 39);
    doc.setFont("helvetica", "normal");
    doc.text(label, SAFE_LEFT, y);
    doc.setFont("helvetica", "bold");
    doc.text(value, SAFE_LEFT + 52, y);
    y += 6;
  };

  const today = fmtDate(new Date());
  const deadline = fmtDate(acceptanceDeadline);
  const session = `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`;
  const className = application.classes?.name || "the class applied for";
  const candidate = `${application.first_name} ${application.last_name}`.replace(/\s+/g, " ").trim();

  // Reference line and date
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(75, 85, 99);
  doc.text(`Ref: ${application.application_number}`, SAFE_LEFT, y);
  doc.text(today, pageWidth - SAFE_RIGHT, y, { align: "right" });
  y += 12;

  write(candidate, { bold: true, gap: 1 });
  if (application.email) write(application.email, { size: 10, colour: [75, 85, 99], gap: 10 });

  write("OFFER OF PROVISIONAL ADMISSION", { bold: true, size: 12, gap: 2 });
  doc.setDrawColor(21, 128, 61);
  doc.setLineWidth(0.4);
  doc.line(SAFE_LEFT, y - 1, SAFE_LEFT + 78, y - 1);
  y += 6;

  write(`Dear ${application.first_name},`, { gap: 6 });

  write(
    `Following the assessment of your application, I am pleased to confirm that you have been offered a place in ${className} at Al-Bari College for the ${session} academic session. The offer is provisional and becomes final once the acceptance fee is paid and your original documents have been sighted at the school office.`,
    { gap: 8 },
  );

  write("Particulars of the offer", { bold: true, size: 11, gap: 5 });
  detailRow("Application number", String(application.application_number));
  detailRow("Class offered", String(className));
  detailRow("Academic session", session);
  detailRow("Acceptance fee", `NGN ${Number(acceptanceFee || 0).toLocaleString("en-NG")}`);
  detailRow("Payment deadline", deadline);
  y += 4;

  if (acceptanceFeeNote) {
    write(acceptanceFeeNote, { size: 10, colour: [75, 85, 99], gap: 8 });
  }

  write(
    `To take up the place, please accept the offer online using the link in the accompanying email and pay the acceptance fee on or before ${deadline}. Offers that are not accepted by that date are released to candidates on the waiting list.`,
    { gap: 6 },
  );

  write(
    "Once payment is confirmed, the school will issue an admission number and portal login details for the student, together with the parent portal access used for results, attendance and fees.",
    { gap: 6 },
  );

  write(
    "Please bring the originals of the documents uploaded with your application, two passport photographs and this letter on resumption day.",
    { gap: 10 },
  );

  write("Yours faithfully,", { gap: 16 });
  write("Admissions Officer", { bold: true, gap: 1 });
  write("For: Al-Bari College, Badagry, Lagos", { size: 10, colour: [75, 85, 99], gap: 0 });

  return doc.output("arraybuffer") as Uint8Array;
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

    const { application_id, acceptance_deadline, acceptance_fee }: OfferLetterRequest = await req.json();

    // Resolve fee + note: explicit request value wins, otherwise fall back to admin settings.
    const { data: settingsRows } = await supabase
      .from("app_settings")
      .select("setting_key, setting_value")
      .in("setting_key", ["acceptance_fee_amount", "acceptance_fee_note"]);

    const settings = Object.fromEntries(
      (settingsRows ?? []).map((r: any) => [r.setting_key, r.setting_value])
    );
    const acceptanceFee = Number(
      acceptance_fee ?? settings.acceptance_fee_amount ?? 50000
    );
    const acceptanceFeeNote = String(
      settings.acceptance_fee_note ??
        "This acceptance fee will be deducted from your child's school fees."
    );

    if (!Number.isFinite(acceptanceFee) || acceptanceFee <= 0) {
      throw new Error("Invalid acceptance fee amount");
    }

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

    // Check if offer already exists
    const { data: existingOffer, error: offerCheckError } = await supabase
      .from("admission_offers")
      .select('id, offer_letter_url, acceptance_token')
      .eq("application_id", application_id)
      .maybeSingle();

    let acceptanceToken: string;
    let offerLetterUrl: string;
    let pdfFileName: string;

    // Generate PDF
    console.log("Generating offer letter PDF...");
    const pdfBuffer = await generateOfferLetterPDF(
      application,
      acceptance_deadline,
      acceptanceFee,
      acceptanceFeeNote,
    );
    
    if (existingOffer) {
      console.log("Offer already exists, updating instead of creating new one");
      
      // Preserve a valid existing link when re-sending; repair older rows without one.
      acceptanceToken = existingOffer.acceptance_token?.trim() || crypto.randomUUID();
      
      // Delete old PDF if exists
      if (existingOffer.offer_letter_url) {
        const oldFileName = existingOffer.offer_letter_url.split('/').pop();
        if (oldFileName) {
          await supabase.storage
            .from('admission-documents')
            .remove([`offer-letters/${oldFileName}`]);
        }
      }
      
      // Upload new PDF with timestamp
      pdfFileName = `${application.application_number}_offer_letter_${Date.now()}.pdf`;
      const { error: uploadError } = await supabase.storage
        .from('admission-documents')
        .upload(`offer-letters/${pdfFileName}`, pdfBuffer, {
          contentType: 'application/pdf',
          upsert: true
        });
        
      if (uploadError) {
        console.error("Error uploading PDF:", uploadError);
        throw new Error(`PDF upload failed: ${uploadError.message}`);
      }
      
      const { data: urlData } = supabase.storage
        .from('admission-documents')
        .getPublicUrl(`offer-letters/${pdfFileName}`);
      
      offerLetterUrl = urlData.publicUrl;
      console.log("New PDF uploaded successfully:", offerLetterUrl);
      
      // UPDATE existing offer instead of INSERT
      const { error: updateError } = await supabase
        .from("admission_offers")
        .update({
          acceptance_deadline,
          acceptance_token: acceptanceToken,
          acceptance_fee: acceptanceFee,
          offer_letter_url: offerLetterUrl,
          status: "sent",
          updated_at: new Date().toISOString()
        })
        .eq('id', existingOffer.id);
        
      if (updateError) {
        console.error("Error updating offer:", updateError);
        throw new Error(`Failed to update offer: ${updateError.message}`);
      }
      
      console.log("Offer updated successfully");
    } else {
      // Create new offer - original flow
      console.log("Creating new offer");
      
      acceptanceToken = crypto.randomUUID();
      
      // Upload PDF to storage
      pdfFileName = `${application.application_number}_offer_letter.pdf`;
      const { error: uploadError } = await supabase
        .storage
        .from('admission-documents')
        .upload(`offer-letters/${pdfFileName}`, pdfBuffer, {
          contentType: 'application/pdf',
          upsert: true,
        });

      if (uploadError) {
        console.error("Error uploading PDF:", uploadError);
        throw new Error(`Failed to upload PDF: ${uploadError.message}`);
      }

      // Get public URL for the PDF
      const { data: urlData } = supabase
        .storage
        .from('admission-documents')
        .getPublicUrl(`offer-letters/${pdfFileName}`);

      offerLetterUrl = urlData.publicUrl;
      console.log("PDF uploaded successfully:", offerLetterUrl);

      // Create offer record with acceptance fee and PDF URL
      const { error: offerError } = await supabase
        .from("admission_offers")
        .insert({
          application_id,
          acceptance_deadline,
          acceptance_token: acceptanceToken,
          acceptance_fee: acceptanceFee,
          status: "sent",
          offer_letter_url: offerLetterUrl,
        });

      if (offerError) {
        console.error("Error creating offer:", offerError);
        throw new Error(`Failed to create offer: ${offerError.message}`);
      }
      
      console.log("Offer created successfully");
    }

    const acceptanceUrl = `${FRONTEND_URL}/website/accept-offer/${acceptanceToken}`;
    
    const emailSubject = `🎉 Admission Offer - Al-Bari Group of Schools`;
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; background-color: #f4f4f4;">
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
          <!-- Letterhead -->
          <div style="text-align: center; background-color: #ffffff;">
            <img src="${LETTERHEAD_URL}" alt="Al-Bari College Letterhead" style="display: block; width: 100%; height: auto; max-width: 600px; margin: 0 auto;" />
          </div>
          
          <!-- Content -->
          <div style="padding: 40px 30px;">
            <h2 style="color: #2563eb; margin: 0 0 20px 0; font-size: 24px;">🎉 Congratulations!</h2>
            
            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
              Dear ${application.first_name} ${application.last_name},
            </p>
            
            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
              We are thrilled to inform you that you have been <strong>offered admission</strong> to <strong>Al-Bari Group of Schools</strong> for the <strong>${application.classes?.name || 'upcoming'}</strong> class.
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
                  <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Deadline:</td>
                  <td style="padding: 8px 0; color: #dc2626; font-weight: 600; font-size: 14px;">${new Date(acceptance_deadline).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Acceptance Fee:</td>
                  <td style="padding: 8px 0; color: #111827; font-weight: 600; font-size: 14px;">&#8358;${acceptanceFee.toLocaleString('en-NG')}</td>
                </tr>
              </table>
              <p style="margin: 12px 0 0 0; color: #1e40af; font-size: 13px;">${acceptanceFeeNote}</p>
            </div>

            <div style="background: #fefce8; border-left: 4px solid #eab308; padding: 20px; border-radius: 8px; margin: 25px 0;">
              <p style="margin: 0; color: #713f12; font-size: 14px; line-height: 1.5;">
                <strong>⚠️ Important:</strong> You must accept your offer by <strong>${new Date(acceptance_deadline).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</strong> to secure your place.
              </p>
            </div>

            <div style="margin: 30px 0;">
              <h4 style="color: #1f2937; margin: 0 0 15px 0; font-size: 16px;">🎯 Next Steps:</h4>
              <ol style="color: #4b5563; font-size: 14px; line-height: 1.8; margin: 0; padding-left: 20px;">
                <li>Click the button below to accept or decline your offer</li>
                <li>Complete the enrollment process</li>
                <li>Receive your student login credentials via email</li>
              </ol>
            </div>

            <div style="text-align: center; margin: 35px 0;">
              <a href="${acceptanceUrl}" style="display: inline-block; background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: #ffffff; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(37, 99, 235, 0.3);">
                Accept Offer →
              </a>
            </div>

            <div style="background: #f0f9ff; padding: 15px; border-radius: 8px; text-align: center; margin: 25px 0;">
              <p style="margin: 0; color: #1e40af; font-size: 13px;">
                📎 Your official offer letter is attached to this email as a PDF document.
              </p>
            </div>
            <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">
              If you have any questions, please contact our admissions office at 
              <a href="mailto:admissions@albari.com.ng" style="color: #2563eb; text-decoration: none;">admissions@albari.com.ng</a>
            </p>

            <p style="margin-top: 30px; color: #059669; font-weight: 600; font-size: 16px;">
              Welcome to the Al-Bari Group of Schools family! 🎓
            </p>
          </div>

          <!-- Footer -->
          <div style="background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 12px; margin: 0 0 10px 0;">
              Al-Bari Group of Schools | Excellence in Education
            </p>
            <p style="color: #9ca3af; font-size: 11px; margin: 0;">
              This is an automated message from the admissions office. Please do not reply to this email.
            </p>
            <p style="color: #9ca3af; font-size: 11px; margin: 10px 0 0 0;">
              &copy; ${new Date().getFullYear()} Al-Bari Group of Schools. All rights reserved.
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
      // Convert PDF buffer to base64 for email attachment
      const pdfBytes = new Uint8Array(pdfBuffer);
      let pdfBinary = "";
      const CHUNK = 0x8000;
      for (let i = 0; i < pdfBytes.length; i += CHUNK) {
        pdfBinary += String.fromCharCode(...pdfBytes.subarray(i, i + CHUNK));
      }
      const pdfBase64 = btoa(pdfBinary);
      
      emailResult = await sendEmailWithRetry({
        from: `Al-Bari Group of Schools <${SENDER_EMAIL}>`,
        to: [application.email],
        reply_to: REPLY_TO,
        subject: emailSubject,
        html: emailHtml,
        attachments: [
          {
            filename: pdfFileName,
            content: pdfBase64,
            type: 'application/pdf',
          },
        ],
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
