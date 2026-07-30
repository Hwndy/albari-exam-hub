import { createClient } from 'npm:@supabase/supabase-js@2';
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface Body {
  fullName?: string;
  email?: string;
  password?: string;
  staffCode?: string;
  classIds?: string[];
  subjectIds?: string[];
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

// Constant-time-ish comparison so the code cannot be guessed by timing.
const codeMatches = (a: string, b: string) => {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
};

const isUuid = (v: unknown) =>
  typeof v === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  try {
    const expectedCode = (Deno.env.get('STAFF_REGISTRATION_CODE') || '').trim();
    if (!expectedCode) {
      return json({ error: 'not_configured', message: 'Staff registration is not configured. Contact the administrator.' }, 503);
    }

    const body = (await req.json()) as Body;
    const fullName = (body.fullName || '').trim();
    const email = (body.email || '').trim().toLowerCase();
    const password = body.password || '';
    const staffCode = (body.staffCode || '').trim();
    const classIds = (body.classIds || []).filter(isUuid);
    const subjectIds = (body.subjectIds || []).filter(isUuid);

    if (fullName.length < 2 || fullName.length > 120) {
      return json({ error: 'invalid_name', message: 'Enter a valid full name.' }, 400);
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 255) {
      return json({ error: 'invalid_email', message: 'Enter a valid email address.' }, 400);
    }
    if (password.length < 8 || password.length > 200) {
      return json({ error: 'invalid_password', message: 'Password must be at least 8 characters.' }, 400);
    }
    if (classIds.length === 0 || subjectIds.length === 0) {
      return json({ error: 'invalid_assignments', message: 'Select at least one class and one subject.' }, 400);
    }
    if (!codeMatches(staffCode, expectedCode)) {
      // Slow down brute-force attempts.
      await new Promise((r) => setTimeout(r, 1200));
      return json({ error: 'invalid_code', message: 'The authorization code is not valid. Ask the school administrator for the current code.' }, 403);
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );

    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });

    if (createError || !created?.user) {
      const msg = createError?.message || 'Could not create the account.';
      const already = /already|registered|exists/i.test(msg);
      return json({ error: already ? 'email_taken' : 'create_failed', message: already ? 'An account with this email already exists.' : msg }, already ? 409 : 400);
    }

    const userId = created.user.id;

    // The signup trigger only ever grants student/parent. Promote to teacher here.
    await admin.from('user_roles').delete().eq('user_id', userId).eq('role', 'student');
    const { error: roleError } = await admin
      .from('user_roles')
      .upsert({ user_id: userId, role: 'teacher', created_by: userId }, { onConflict: 'user_id,role' });
    if (roleError) {
      await admin.auth.admin.deleteUser(userId);
      return json({ error: 'role_failed', message: roleError.message }, 500);
    }

    await admin.from('profiles').upsert({ user_id: userId, full_name: fullName }, { onConflict: 'user_id' });

    if (classIds.length) {
      await admin
        .from('teacher_class_assignments')
        .upsert(classIds.map((class_id) => ({ teacher_id: userId, class_id })), { onConflict: 'teacher_id,class_id' });
    }

    const subjectRows = subjectIds.flatMap((subject_id) =>
      classIds.map((class_id) => ({ user_id: userId, subject_id, class_id })),
    );
    if (subjectRows.length) {
      await admin.from('subject_assignments').insert(subjectRows);
    }

    return json({ success: true, user_id: userId });
  } catch (err) {
    console.error('register-staff error', err);
    return json({ error: 'unexpected', message: err instanceof Error ? err.message : 'Unexpected error' }, 500);
  }
});
