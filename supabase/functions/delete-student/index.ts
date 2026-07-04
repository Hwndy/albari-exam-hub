import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const authHeader = req.headers.get('Authorization') ?? '';
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: roleData } = await supabaseAdmin
      .from('user_roles').select('role').eq('user_id', user.id)
      .in('role', ['admin']).maybeSingle();
    if (!roleData) {
      return new Response(JSON.stringify({ error: 'Only admins can delete students', code: 'forbidden' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { studentUserId } = await req.json();
    if (!studentUserId) {
      return new Response(JSON.stringify({ error: 'studentUserId required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Clean up dependent rows (best effort)
    await supabaseAdmin.from('class_assignments').delete().eq('student_id', studentUserId);
    await supabaseAdmin.from('students').delete().eq('user_id', studentUserId);
    await supabaseAdmin.from('user_roles').delete().eq('user_id', studentUserId);
    await supabaseAdmin.from('profiles').delete().eq('user_id', studentUserId);

    const { error: delErr } = await supabaseAdmin.auth.admin.deleteUser(studentUserId);
    if (delErr) {
      console.error('auth deleteUser failed', delErr);
      // Soft-delete fallback
      await supabaseAdmin.from('students').update({ status: 'inactive' }).eq('user_id', studentUserId);
      return new Response(JSON.stringify({
        success: true, soft: true,
        message: 'Student records removed; auth user could not be deleted and was marked inactive.',
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('delete-student error', e);
    return new Response(JSON.stringify({ error: (e as Error).message ?? 'Unexpected error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});