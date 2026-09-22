import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
});

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  try {
    const authorization = req.headers.get('Authorization') ?? '';
    if (!authorization.startsWith('Bearer ')) return json({ error: 'unauthorized', message: 'You must be signed in.' }, 401);

    const url = Deno.env.get('SUPABASE_URL') ?? '';
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? Deno.env.get('SUPABASE_PUBLISHABLE_KEY') ?? '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const caller = createClient(url, anonKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

    const { data: callerData, error: callerError } = await caller.auth.getUser();
    if (callerError || !callerData.user) return json({ error: 'unauthorized', message: 'Your session has expired. Sign in again.' }, 401);

    const { data: adminRole, error: roleCheckError } = await admin
      .from('user_roles')
      .select('role')
      .eq('user_id', callerData.user.id)
      .eq('role', 'admin')
      .maybeSingle();
    if (roleCheckError) return json({ error: 'role_check_failed', message: roleCheckError.message }, 500);
    if (!adminRole) return json({ error: 'forbidden', message: 'Only administrators can change user roles.' }, 403);

    const body = await req.json();
    const userId = typeof body?.userId === 'string' ? body.userId : '';
    const role = typeof body?.role === 'string' ? body.role.trim().toLowerCase() : '';
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(userId)) {
      return json({ error: 'invalid_user', message: 'The selected account is invalid.' }, 400);
    }
    if (!['admin', 'teacher', 'student', 'parent'].includes(role)) {
      return json({ error: 'invalid_role', message: 'Select a valid account role.' }, 400);
    }

    const { error: deleteError } = await admin.from('user_roles').delete().eq('user_id', userId);
    if (deleteError) return json({ error: 'role_delete_failed', message: deleteError.message }, 500);
    const { error: insertError } = await admin.from('user_roles').insert({
      user_id: userId,
      role,
      created_by: callerData.user.id,
    });
    if (insertError) return json({ error: 'role_save_failed', message: insertError.message }, 500);

    return json({ success: true, user_id: userId, role });
  } catch (error) {
    console.error('update-user-role error', error);
    return json({ error: 'unexpected', message: error instanceof Error ? error.message : 'Could not update the role.' }, 500);
  }
});