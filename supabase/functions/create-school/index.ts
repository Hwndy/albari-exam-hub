import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Get the user from the token
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Check if user is super admin (has NULL school_id)
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('school_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (profileError) {
      console.error('Profile fetch error:', profileError);
      throw new Error('Failed to fetch user profile');
    }

    if (!profile) {
      throw new Error('User profile not found. Please ensure your account is properly set up.');
    }

    if (profile.school_id !== null) {
      throw new Error('Only super admins can create schools');
    }

    // Parse request body
    const { name, subdomain, contact_email, contact_phone, address, primary_color, secondary_color } = await req.json();

    // Validate required fields
    if (!name || !subdomain) {
      throw new Error('School name and subdomain are required');
    }

    // Check if subdomain already exists
    const { data: existingSchool } = await supabaseClient
      .from('schools')
      .select('id')
      .eq('subdomain', subdomain)
      .single();

    if (existingSchool) {
      throw new Error('Subdomain already exists');
    }

    // Create the school
    const { data: school, error: schoolError } = await supabaseClient
      .from('schools')
      .insert({
        name,
        subdomain,
        contact_email,
        contact_phone,
        address,
        primary_color,
        secondary_color,
        is_active: true,
        settings: {},
      })
      .select()
      .single();

    if (schoolError) {
      throw schoolError;
    }

    console.log('School created successfully:', school.id);

    return new Response(
      JSON.stringify({
        success: true,
        school,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error creating school:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
