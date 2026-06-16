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

    // Get teacher's school_id
    const { data: teacherProfile } = await supabaseAdmin
      .from('profiles')
      .select('school_id')
      .eq('user_id', user.id)
      .single();

    const schoolId = teacherProfile?.school_id;
    console.log('Teacher school_id:', schoolId);

    if (!schoolId) {
      console.error('Teacher profile has no school_id');
      return new Response(JSON.stringify({
        error: 'Your account is not linked to any school. Please contact an administrator.',
        code: 'missing_school',
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

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
      
      if (createError.message?.includes('User already registered') || 
          createError.message?.includes('already exists') ||
          errorCode === '23505') {
        errorMessage = 'This email address is already registered';
        errorCode = 'email_exists';
      }
      
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

    // Update profile with school_id
    if (schoolId && newUser.user) {
      await supabaseAdmin
        .from('profiles')
        .update({ school_id: schoolId })
        .eq('user_id', newUser.user.id);
      
      console.log('Profile updated with school_id:', schoolId);
    }

    // Create student entry with school_id
    if (newUser.user) {
      const studentInsert: Record<string, any> = {
        user_id: newUser.user.id,
        school_id: schoolId,
      };
      if (admissionNumber) studentInsert.admission_number = admissionNumber;
      const { error: studentError } = await supabaseAdmin
        .from('students')
        .insert(studentInsert);
      
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
          class_id: classId,
          school_id: schoolId
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
