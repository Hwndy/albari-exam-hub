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

    // Verify requester is a teacher or admin
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if user is teacher or admin
    const { data: roleData } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .in('role', ['teacher', 'admin'])
      .single();

    if (!roleData) {
      console.error('User does not have teacher or admin role');
      return new Response(JSON.stringify({ error: 'Only teachers and admins can create students' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { email, password, fullName, classId, admissionNumber } = await req.json();

    console.log('Creating student:', { email, fullName, classId });

    // Create user using admin API (no auto-login)
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        role: 'student'
      }
    });

    if (createError) {
      console.error('Create user error:', createError);
      
      // Handle specific error cases
      let errorMessage = createError.message || 'Failed to create student';
      let errorCode = createError.code || 'unknown_error';
      
      if (errorCode === 'email_exists' || createError.message?.includes('already been registered') ||
          createError.message?.includes('User already registered') ||
          createError.message?.includes('already exists') || errorCode === '23505') {
        // Look up who owns this email so the admin sees a useful message
        let existing: Record<string, unknown> | null = null;
        try {
          let page = 1;
          let found: any = null;
          while (!found && page <= 20) {
            const { data } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 });
            const users = data?.users ?? [];
            found = users.find((u: any) => (u.email ?? '').toLowerCase() === String(email).toLowerCase());
            if (users.length < 1000) break;
            page++;
          }
          if (found) {
            const [{ data: prof }, { data: stu }, { data: ca }, { data: roles }] = await Promise.all([
              supabaseAdmin.from('profiles').select('full_name').eq('user_id', found.id).maybeSingle(),
              supabaseAdmin.from('students').select('id, admission_number, status').eq('user_id', found.id).maybeSingle(),
              supabaseAdmin.from('class_assignments').select('class_id').eq('student_id', found.id),
              supabaseAdmin.from('user_roles').select('role').eq('user_id', found.id),
            ]);
            let className: string | null = null;
            const classIds = (ca ?? []).map((r: any) => r.class_id);
            if (classIds.length) {
              const { data: cls } = await supabaseAdmin.from('classes').select('name').in('id', classIds);
              className = (cls ?? []).map((c: any) => c.name).join(', ') || null;
            }
            existing = {
              user_id: found.id,
              student_id: stu?.id ?? null,
              full_name: prof?.full_name || found.user_metadata?.full_name || found.email,
              admission_number: stu?.admission_number ?? null,
              status: stu?.status ?? null,
              class_name: className,
              roles: (roles ?? []).map((r: any) => r.role),
            };
          }
        } catch (lookupErr) {
          console.error('existing lookup failed', lookupErr);
        }
        const who = existing
          ? `${existing.full_name}${existing.admission_number ? ` (${existing.admission_number}${existing.class_name ? `, ${existing.class_name}` : ''})` : ''}`
          : 'another account';
        return new Response(JSON.stringify({
          error: `This email already belongs to ${who}.`,
          code: 'email_exists',
          existing,
        }), { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      if (/password/i.test(errorMessage)) errorMessage = `Password problem: ${errorMessage}`;
      return new Response(JSON.stringify({ 
        error: errorMessage,
        code: errorCode,
        details: createError.message 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Student user created:', newUser.user?.id);

    // Create student entry (admission number auto-assigned by the database when blank)
    let assignedAdmission: string | null = null;
    if (newUser.user) {
      const studentInsert: Record<string, any> = {
        user_id: newUser.user.id,
      };
      if (admissionNumber && String(admissionNumber).trim()) studentInsert.admission_number = String(admissionNumber).trim();
      const { data: stRow, error: studentError } = await supabaseAdmin
        .from('students')
        .insert(studentInsert)
        .select('admission_number')
        .single();
      assignedAdmission = stRow?.admission_number ?? null;
      
      if (studentError) {
        console.error('Student entry creation error:', studentError);
        return new Response(JSON.stringify({
          error: studentError.message || 'Failed to create student record',
          code: studentError.code || 'student_insert_failed',
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } else {
        console.log('Student entry created with school_id');
      }
    }

    // Assign to class if provided
    if (classId && newUser.user) {
      const { error: assignError } = await supabaseAdmin
        .from('class_assignments')
        .insert({
          student_id: newUser.user.id,
          class_id: classId
        });
      
      if (assignError) {
        console.error('Class assignment error:', assignError);
      } else {
        console.log('Student assigned to class:', classId);
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      user: newUser.user,
      admission_number: assignedAdmission,
      message: 'Student created successfully' 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in create-student function:', error);
    
    let errorMessage = error.message || 'An unexpected error occurred';
    let errorCode = 'unknown_error';
    
    // Parse specific error types
    if (error.message?.includes('User already registered') || 
        error.message?.includes('already exists')) {
      errorMessage = 'This email address is already registered';
      errorCode = 'email_exists';
    } else if (error.message?.includes('duplicate key')) {
      errorMessage = 'This email address is already in use';
      errorCode = 'duplicate_email';
    }
    
    return new Response(JSON.stringify({ 
      error: errorMessage,
      code: errorCode,
      details: error.message 
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
