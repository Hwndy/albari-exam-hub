import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Export users request received');

    // Create admin client with service role
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Verify the requester is a super admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('No authorization header');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: roleData } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    if (!roleData) {
      console.error('User is not an admin');
      return new Response(
        JSON.stringify({ error: 'Only admins can export users' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Fetching all users with admin client');

    // Fetch all profiles
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('user_id, full_name, created_at')
      .order('created_at', { ascending: false });

    if (profilesError) {
      console.error('Profiles error:', profilesError);
      throw profilesError;
    }

    console.log(`Found ${profiles?.length || 0} profiles`);

    // Fetch all emails from auth.users using admin API
    const { data: authUsers, error: authUsersError } = await supabaseAdmin.auth.admin.listUsers({
      perPage: 10000
    });

    if (authUsersError) {
      console.error('Auth users error:', authUsersError);
      throw authUsersError;
    }

    console.log(`Found ${authUsers?.users?.length || 0} auth users`);

    // Create email map
    const emailMap = new Map(authUsers?.users?.map(u => [u.id, u.email]) || []);

    // Paginated full-table fetch (avoids over-long .in() filters and the 1000-row cap)
    const fetchAll = async (table: string, columns: string) => {
      const rows: any[] = [];
      let from = 0;
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { data, error } = await supabaseAdmin
          .from(table)
          .select(columns)
          .range(from, from + 999);
        if (error) {
          console.error(`${table} error:`, error);
          throw new Error(`Failed to load ${table}: ${error.message}`);
        }
        rows.push(...(data || []));
        if (!data || data.length < 1000) break;
        from += 1000;
      }
      return rows;
    };

    // Fetch all user roles
    const rolesData = await fetchAll('user_roles', 'user_id, role');
    const rolePriority: Record<string, number> = { admin: 0, teacher: 1, parent: 2, student: 3 };
    const roleMap = new Map<string, string>();
    for (const r of rolesData) {
      const existing = roleMap.get(r.user_id);
      if (!existing || (rolePriority[r.role] ?? 9) < (rolePriority[existing] ?? 9)) {
        roleMap.set(r.user_id, r.role);
      }
    }
    console.log(`Found ${rolesData.length} role records`);

    // Fetch class assignments (student_id references profiles.user_id)
    const classAssignments = await fetchAll('class_assignments', 'student_id, class_id, classes(name)');
    const classMap = new Map(
      classAssignments.map(ca => [ca.student_id, (ca.classes as any)?.name || 'Unknown'])
    );
    console.log(`Found ${classAssignments.length} class assignments`);

    // Student details (admission number, gender, etc.) — include archived rows
    const studentRows = await fetchAll(
      'students',
      'user_id, admission_number, gender, date_of_birth, section, status, is_boarder, archived_at'
    );
    const studentMap = new Map(studentRows.filter(s => s.user_id).map(s => [s.user_id, s]));
    console.log(`Found ${studentRows.length} students`);

    // Staff details (employee id, department, etc.)
    const staffRows = await fetchAll(
      'staff_details',
      'user_id, employee_id, department, designation, phone, employment_type, status'
    );
    const staffMap = new Map(staffRows.filter(s => s.user_id).map(s => [s.user_id, s]));
    console.log(`Found ${staffRows.length} staff records`);

    // Parent phone numbers
    const parentRows = await fetchAll('parents', 'user_id, phone_primary');
    const parentPhoneMap = new Map(parentRows.filter(p => p.user_id).map(p => [p.user_id, p.phone_primary]));

    // Build user data with all info
    const usersData = profiles?.map(profile => {
      const role = roleMap.get(profile.user_id)
        || (studentMap.has(profile.user_id) ? 'student'
          : staffMap.has(profile.user_id) ? 'teacher'
          : parentPhoneMap.has(profile.user_id) ? 'parent' : '');
      const email = emailMap.get(profile.user_id) || '';
      const className = role === 'student' ? (classMap.get(profile.user_id) || 'Not Assigned') : 'N/A';
      const student = studentMap.get(profile.user_id);
      const staff = staffMap.get(profile.user_id);

      return {
        full_name: profile.full_name,
        email,
        role,
        school: 'Al-Bari Model Schools',
        class_name: className,
        created_at: profile.created_at,
        admission_number: student?.admission_number || '',
        employee_id: staff?.employee_id || '',
        phone: staff?.phone || parentPhoneMap.get(profile.user_id) || '',
        department: staff?.department || '',
        designation: staff?.designation || '',
        employment_type: staff?.employment_type || '',
        gender: student?.gender || '',
        date_of_birth: student?.date_of_birth || '',
        section: student?.section || '',
        is_boarder: student?.is_boarder ?? null,
        status: student?.status || staff?.status || '',
        archived: !!student?.archived_at,
      };
    }) || [];

    console.log(`Returning ${usersData.length} users`);

    return new Response(
      JSON.stringify({ users: usersData }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Export users error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to export users' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
