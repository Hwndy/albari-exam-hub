import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { getStudentCreationPassword } from './password.ts';
import { generateStudentEmail } from './email.ts';

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
    const authHeader = req.headers.get('Authorization') || '';
    if (!authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const token = authHeader.slice('Bearer '.length);
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

    const body = await req.json();
    const fullName = typeof body?.fullName === 'string' ? body.fullName.trim() : '';
    const classId = typeof body?.classId === 'string' ? body.classId : null;
    const admissionNumber = typeof body?.admissionNumber === 'string' ? body.admissionNumber : null;
    if (fullName.length < 2 || fullName.length > 120) {
      return new Response(JSON.stringify({ error: 'Enter a valid student name.', code: 'invalid_name' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let newUser: any = null;
    let assignedEmail = '';
    let createError: any = null;
    for (let suffix = 1; suffix <= 100; suffix += 1) {
      assignedEmail = generateStudentEmail(fullName, suffix);
      const attempt = await supabaseAdmin.auth.admin.createUser({
        email: assignedEmail,
        password: getStudentCreationPassword(),
        email_confirm: true,
        user_metadata: { full_name: fullName, role: 'student' },
      });
      if (!attempt.error) {
        newUser = attempt.data;
        createError = null;
        break;
      }
      createError = attempt.error;
      const isDuplicateEmail = createError.code === 'email_exists' || createError.code === '23505' ||
        /already been registered|user already registered|already exists/i.test(createError.message || '');
      if (!isDuplicateEmail) break;
    }

    if (createError || !newUser?.user) {
      console.error('Create student user error:', createError);
      const duplicateLimitReached = createError && (
        createError.code === 'email_exists' || createError.code === '23505' ||
        /already been registered|user already registered|already exists/i.test(createError.message || '')
      );
      const errorMessage = duplicateLimitReached
        ? 'Could not find an unused school email for this name. Please contact an administrator.'
        : createError?.message || 'Failed to create student';
      return new Response(JSON.stringify({
        error: errorMessage,
        code: duplicateLimitReached ? 'email_generation_exhausted' : createError?.code || 'unknown_error',
      }), {
        status: duplicateLimitReached ? 409 : 400,
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
      email: newUser.user.email || assignedEmail,
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
