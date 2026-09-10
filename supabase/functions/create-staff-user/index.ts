import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const isUuid = (v: unknown) =>
  typeof v === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

interface Body {
  fullName?: string;
  email?: string;
  password?: string;
  role?: string;
  department?: string;
  designation?: string;
  joinDate?: string;
  employmentType?: string;
  phone?: string;
  classIds?: string[];
  subjectIds?: string[];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

  try {
    // ---- caller must be a signed-in admin -------------------------------
    const authHeader = req.headers.get('Authorization') || '';
    if (!authHeader.startsWith('Bearer ')) {
      return json({ error: 'unauthorized', message: 'You must be signed in.' }, 401);
    }
    const caller = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: userData, error: userErr } = await caller.auth.getUser();
    if (userErr || !userData?.user) {
      return json({ error: 'unauthorized', message: 'Your session has expired. Sign in again.' }, 401);
    }
    const { data: isAdmin, error: roleCheckErr } = await caller.rpc('has_role', {
      _user_id: userData.user.id,
      _role: 'admin',
    });
    if (roleCheckErr) return json({ error: 'role_check_failed', message: roleCheckErr.message }, 500);
    if (!isAdmin) {
      return json({ error: 'forbidden', message: 'Only administrators can create staff accounts.' }, 403);
    }

    // ---- validate input --------------------------------------------------
    const body = (await req.json()) as Body;
    const fullName = (body.fullName || '').trim();
    const email = (body.email || '').trim().toLowerCase();
    const password = body.password || '';
    const role = (body.role || '').trim().toLowerCase();
    const department = (body.department || '').trim() || null;
    const designation = (body.designation || '').trim() || null;
    const joinDate = (body.joinDate || '').trim() || null;
    const employmentType = (body.employmentType || 'full-time').trim();
    const phone = (body.phone || '').trim() || null;
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
    if (!['teacher', 'admin', 'student'].includes(role)) {
      return json({ error: 'invalid_role', message: 'Role must be teacher, admin or student.' }, 400);
    }
    if (joinDate && !/^\d{4}-\d{2}-\d{2}$/.test(joinDate)) {
      return json({ error: 'invalid_date', message: 'Enter a valid join date.' }, 400);
    }

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // ---- create the account ---------------------------------------------
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });

    if (createError || !created?.user) {
      const msg = createError?.message || 'Could not create the account.';
      const already = /already|registered|exists/i.test(msg);
      return json(
        {
          error: already ? 'email_taken' : 'create_failed',
          message: already ? 'An account with this email already exists.' : msg,
        },
        already ? 409 : 400,
      );
    }

    const userId = created.user.id;
    const rollback = async (message: string, code = 'setup_failed') => {
      await admin.auth.admin.deleteUser(userId);
      return json({ error: code, message }, 500);
    };

    // ---- role (signup trigger only ever grants student) ------------------
    if (role !== 'student') {
      await admin.from('user_roles').delete().eq('user_id', userId).eq('role', 'student');
    }
    const { error: roleError } = await admin
      .from('user_roles')
      .upsert({ user_id: userId, role, created_by: userData.user.id }, { onConflict: 'user_id,role' });
    if (roleError) return await rollback(roleError.message, 'role_failed');

    // ---- profile ---------------------------------------------------------
    const { error: profileError } = await admin
      .from('profiles')
      .upsert({ user_id: userId, full_name: fullName }, { onConflict: 'user_id' });
    if (profileError) return await rollback(profileError.message, 'profile_failed');

    // ---- staff record ----------------------------------------------------
    if (role === 'teacher' || role === 'admin') {
      const { error: staffError } = await admin.from('staff_details').upsert(
        {
          user_id: userId,
          department: department ?? (role === 'admin' ? 'Administration' : 'Academics'),
          designation: designation ?? (role === 'admin' ? 'Administrator' : 'Teacher'),
          join_date: joinDate,
          employment_type: employmentType,
          status: 'active',
          phone,
        },
        { onConflict: 'user_id' },
      );
      if (staffError) return await rollback(staffError.message, 'staff_failed');
    }

    // ---- assignments -----------------------------------------------------
    if (role === 'teacher' && classIds.length) {
      const { error: tcaError } = await admin
        .from('teacher_class_assignments')
        .upsert(classIds.map((class_id) => ({ teacher_id: userId, class_id })), {
          onConflict: 'teacher_id,class_id',
        });
      if (tcaError) return await rollback(tcaError.message, 'class_assignment_failed');

      if (subjectIds.length) {
        const rows = subjectIds.flatMap((subject_id) =>
          classIds.map((class_id) => ({ user_id: userId, subject_id, class_id })),
        );
        const { error: saError } = await admin.from('subject_assignments').insert(rows);
        if (saError) return await rollback(saError.message, 'subject_assignment_failed');
      }
    }

    if (role === 'student' && classIds.length) {
      const { error: caError } = await admin
        .from('class_assignments')
        .insert({ student_id: userId, class_id: classIds[0] });
      if (caError) return await rollback(caError.message, 'class_assignment_failed');
    }

    // employee_id is issued by a database trigger; read it back for the UI
    let employeeId: string | null = null;
    if (role === 'teacher' || role === 'admin') {
      const { data: staffRow } = await admin
        .from('staff_details')
        .select('employee_id')
        .eq('user_id', userId)
        .maybeSingle();
      employeeId = (staffRow as { employee_id?: string } | null)?.employee_id ?? null;
    }

    return json({ success: true, user_id: userId, employee_id: employeeId });
  } catch (err) {
    console.error('create-staff-user error', err);
    return json({ error: 'unexpected', message: err instanceof Error ? err.message : 'Unexpected error' }, 500);
  }
});
