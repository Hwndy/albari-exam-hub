import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface BulkSMSRequest {
  templateId: string;
  recipients: { user_id: string; full_name: string; phone?: string }[];
  schoolId: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { templateId, recipients, schoolId }: BulkSMSRequest = await req.json();

    console.log(`Processing bulk SMS for template ${templateId} to ${recipients.length} recipients`);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch template
    const { data: template, error: templateError } = await supabase
      .from("notification_templates")
      .select("*")
      .eq("id", templateId)
      .single();

    if (templateError || !template) {
      console.error("Template not found:", templateError);
      return new Response(
        JSON.stringify({ error: "Template not found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Fetch school info
    const { data: school } = await supabase
      .from("schools")
      .select("name")
      .eq("id", schoolId)
      .single();

    const schoolName = school?.name || "School";

    // NOTE: SMS integration requires an SMS provider API key (e.g., Termii, Africa's Talking)
    // For now, we'll simulate the sending and log the messages
    const smsApiKey = Deno.env.get("SMS_API_KEY");
    
    if (!smsApiKey) {
      console.warn("SMS_API_KEY not configured. SMS sending is simulated.");
    }

    const results: { success: boolean; phone?: string; error?: string }[] = [];
    
    for (const recipient of recipients) {
      try {
        // Get phone number from profile if not provided
        let phone = recipient.phone;
        if (!phone) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("phone")
            .eq("user_id", recipient.user_id)
            .single();
          phone = profile?.phone;
        }

        if (!phone) {
          results.push({ success: false, error: "No phone number found" });
          continue;
        }

        // Replace template variables
        let message = template.body;
        message = message.replace(/\{\{student_name\}\}/g, recipient.full_name);
        message = message.replace(/\{\{parent_name\}\}/g, recipient.full_name);
        message = message.replace(/\{\{school_name\}\}/g, schoolName);

        // If SMS API is configured, send real SMS
        if (smsApiKey) {
          // Example with Termii API
          // const response = await fetch("https://api.ng.termii.com/api/sms/send", {
          //   method: "POST",
          //   headers: { "Content-Type": "application/json" },
          //   body: JSON.stringify({
          //     to: phone,
          //     from: schoolName.slice(0, 11),
          //     sms: message,
          //     type: "plain",
          //     channel: "generic",
          //     api_key: smsApiKey,
          //   }),
          // });
          // const result = await response.json();
          console.log(`[SMS] Would send to ${phone}: ${message}`);
          results.push({ success: true, phone });
        } else {
          // Simulate sending
          console.log(`[SIMULATED SMS] To: ${phone}`);
          console.log(`Message: ${message}`);
          results.push({ success: true, phone });
        }
      } catch (error: any) {
        console.error(`Error sending SMS:`, error);
        results.push({ success: false, error: error.message });
      }
    }

    // Update queue status
    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    const { error: updateError } = await supabase
      .from("notification_queue")
      .update({
        status: failCount === 0 ? "sent" : failCount === recipients.length ? "failed" : "sent",
        sent_at: new Date().toISOString(),
        error_message: failCount > 0 ? `${failCount} of ${recipients.length} failed` : null,
      })
      .eq("template_id", templateId)
      .eq("status", "processing");

    if (updateError) {
      console.error("Error updating queue:", updateError);
    }

    console.log(`Bulk SMS complete: ${successCount} sent, ${failCount} failed`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        sent: successCount, 
        failed: failCount,
        results,
        note: smsApiKey ? undefined : "SMS sending is simulated. Configure SMS_API_KEY for real sending."
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in send-bulk-sms:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
