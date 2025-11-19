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

    // Verify requester is a super admin
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if user is super admin (admin with no school_id)
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('school_id')
      .eq('user_id', user.id)
      .single();

    const { data: roleData } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    if (!roleData || profile?.school_id !== null) {
      return new Response(JSON.stringify({ error: 'Only super admins can create school admins' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get all schools (excluding the default school)
    const { data: schools, error: schoolsError } = await supabaseAdmin
      .from('schools')
      .select('id, name, subdomain, contact_email')
      .order('name');

    if (schoolsError) {
      throw schoolsError;
    }

    // Skip the first school (default/super admin school)
    const schoolsToProcess = schools.slice(1, 21);

    const results = [];
    const errors = [];

    for (const school of schoolsToProcess) {
      try {
        const adminEmail = school.contact_email || `admin@${school.subdomain}.edu.ng`;
        const defaultPassword = 'Admin123!'; // Schools should change this on first login
        
        console.log(`Creating admin for ${school.name} with email: ${adminEmail}`);

        // Create user using admin API
        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email: adminEmail,
          password: defaultPassword,
          email_confirm: true,
          user_metadata: {
            full_name: `${school.name} Administrator`,
            role: 'admin'
          }
        });

        if (createError) {
          // If user already exists, try to update their school assignment
          if (createError.message.includes('already registered')) {
            console.log(`User ${adminEmail} already exists, updating school assignment`);
            
            // Find existing user
            const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
            const existingUser = existingUsers.users.find(u => u.email === adminEmail);
            
            if (existingUser) {
              // Update profile with school_id
              await supabaseAdmin
                .from('profiles')
                .update({ school_id: school.id })
                .eq('user_id', existingUser.id);

              // Ensure admin role exists
              await supabaseAdmin
                .from('user_roles')
                .insert({ user_id: existingUser.id, role: 'admin', created_by: user.id })
                .onConflict('user_id,role')
                .ignoreDuplicates();

              results.push({
                school: school.name,
                email: adminEmail,
                status: 'updated',
                message: 'Existing user updated with school assignment'
              });
              continue;
            }
          }
          
          throw createError;
        }

        console.log(`Admin created for ${school.name}:`, newUser.user?.id);

        // Update profile with school_id
        const { error: profileError } = await supabaseAdmin
          .from('profiles')
          .update({ school_id: school.id })
          .eq('user_id', newUser.user!.id);

        if (profileError) {
          console.error('Profile update error:', profileError);
        }

        // Ensure admin role exists (trigger should have created it, but let's be sure)
        const { error: roleError } = await supabaseAdmin
          .from('user_roles')
          .insert({ 
            user_id: newUser.user!.id, 
            role: 'admin',
            created_by: user.id 
          })
          .onConflict('user_id,role')
          .ignoreDuplicates();

        if (roleError) {
          console.error('Role assignment error:', roleError);
        }

        results.push({
          school: school.name,
          email: adminEmail,
          userId: newUser.user!.id,
          status: 'created',
          defaultPassword: defaultPassword
        });

      } catch (error) {
        console.error(`Error creating admin for ${school.name}:`, error);
        errors.push({
          school: school.name,
          error: error.message
        });
      }
    }

    return new Response(JSON.stringify({ 
      success: true,
      message: `Created ${results.length} school admins`,
      results,
      errors: errors.length > 0 ? errors : undefined,
      note: 'Default password is Admin123! - Schools should change this immediately'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in create-school-admins function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
