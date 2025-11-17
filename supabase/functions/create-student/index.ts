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

    const { email, password, fullName, classId } = await req.json();

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
      throw createError;
    }

    console.log('Student user created:', newUser.user?.id);

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
      message: 'Student created successfully' 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in create-student function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
