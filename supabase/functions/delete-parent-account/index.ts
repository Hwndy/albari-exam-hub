import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.75.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await admin.auth.getUser(token);
    if (authError || !user) return json({ error: "Unauthorized" }, 401);

    const { data: role } = await admin.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
    if (!role) return json({ error: "Only administrators can delete parent accounts" }, 403);

    const { parentUserId } = await req.json();
    if (!parentUserId) return json({ error: "parentUserId required" }, 400);

    const { data: parent } = await admin.from("parents").select("id").eq("user_id", parentUserId).maybeSingle();
    if (parent) {
      await admin.from("student_parent_relationships").delete().eq("parent_id", parent.id);
      await admin.from("parents").delete().eq("id", parent.id);
    }
    await admin.from("user_roles").delete().eq("user_id", parentUserId);
    await admin.from("profiles").delete().eq("user_id", parentUserId);

    const { error: delErr } = await admin.auth.admin.deleteUser(parentUserId);
    if (delErr) return json({ success: true, soft: true, message: "Parent records removed; auth user could not be deleted." });

    return json({ success: true });
  } catch (e) {
    console.error("delete-parent-account error", e);
    return json({ error: (e as Error).message ?? "Unexpected error" }, 500);
  }
});