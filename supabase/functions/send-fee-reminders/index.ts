import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { reminder_days = [7, 3, 1] } = await req.json();

    console.log('Processing fee reminders');

    // Get overdue installments
    const today = new Date().toISOString().split("T")[0];
    
    const { data: overdueInstallments, error: overdueError } = await supabase
      .from("fee_installments")
      .select(`
        *,
        plan:fee_installment_plans(
          student_id,
          student:students(
            id,
            admission_number,
            user_id,
            profile:profiles!students_user_id_fkey(full_name)
          )
        )
      `)
      
      .in("status", ["pending", "partial"])
      .lt("due_date", today);

    if (overdueError) {
      console.error("Error fetching overdue installments:", overdueError);
    }

    // Get upcoming installments based on reminder_days
    const upcomingDates = reminder_days.map((days: number) => {
      const date = new Date();
      date.setDate(date.getDate() + days);
      return date.toISOString().split("T")[0];
    });

    const { data: upcomingInstallments, error: upcomingError } = await supabase
      .from("fee_installments")
      .select(`
        *,
        plan:fee_installment_plans(
          student_id,
          student:students(
            id,
            admission_number,
            user_id,
            profile:profiles!students_user_id_fkey(full_name)
          )
        )
      `)
      
      .eq("status", "pending")
      .in("due_date", upcomingDates);

    if (upcomingError) {
      console.error("Error fetching upcoming installments:", upcomingError);
    }

    // Get outstanding fee structures (non-installment)
    const { data: outstandingFees, error: feeError } = await supabase
      .from("fee_structures")
      .select(`
        *,
        class:classes(name)
      `)
      
      .lt("due_date", today);

    if (feeError) {
      console.error("Error fetching outstanding fees:", feeError);
    }

    const reminders: any[] = [];
    const reminderLogs: any[] = [];

    // Process overdue installments
    if (overdueInstallments) {
      for (const installment of overdueInstallments) {
        const student = installment.plan?.student;
        if (!student) continue;

        const daysOverdue = Math.floor(
          (new Date().getTime() - new Date(installment.due_date).getTime()) / (1000 * 60 * 60 * 24)
        );

        reminders.push({
          type: "overdue",
          student_id: student.id,
          student_name: student.profile?.full_name,
          admission_number: student.admission_number,
          amount: installment.amount - (installment.paid_amount || 0),
          due_date: installment.due_date,
          days_overdue: daysOverdue,
          installment_number: installment.installment_number,
        });

        reminderLogs.push({
          student_id: student.id,
          installment_id: installment.id,
          reminder_type: "email",
          status: "pending",
        });
      }
    }

    // Process upcoming installments
    if (upcomingInstallments) {
      for (const installment of upcomingInstallments) {
        const student = installment.plan?.student;
        if (!student) continue;

        const daysUntilDue = Math.floor(
          (new Date(installment.due_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
        );

        reminders.push({
          type: "upcoming",
          student_id: student.id,
          student_name: student.profile?.full_name,
          admission_number: student.admission_number,
          amount: installment.amount,
          due_date: installment.due_date,
          days_until_due: daysUntilDue,
          installment_number: installment.installment_number,
        });

        reminderLogs.push({
          student_id: student.id,
          installment_id: installment.id,
          reminder_type: "email",
          status: "pending",
        });
      }
    }

    // Log reminders (in a real implementation, you would send actual emails/SMS here)
    if (reminderLogs.length > 0) {
      const { error: logError } = await supabase
        .from("fee_reminder_logs")
        .insert(reminderLogs);

      if (logError) {
        console.error("Error logging reminders:", logError);
      }
    }

    // Update overdue installments status
    if (overdueInstallments && overdueInstallments.length > 0) {
      const overdueIds = overdueInstallments
        .filter(i => i.status === "pending")
        .map(i => i.id);

      if (overdueIds.length > 0) {
        await supabase
          .from("fee_installments")
          .update({ status: "overdue" })
          .in("id", overdueIds);
      }
    }

    console.log(`Processed ${reminders.length} fee reminders`);

    return new Response(
      JSON.stringify({
        success: true,
        reminders_count: reminders.length,
        overdue_count: overdueInstallments?.length || 0,
        upcoming_count: upcomingInstallments?.length || 0,
        reminders,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error processing fee reminders:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
