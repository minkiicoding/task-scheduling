import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateUserRequest {
  employeeCode: string;
  name: string;
  position: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get the authorization token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    
    // Create a client with the user's token to verify authentication
    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { 
        global: { headers: { Authorization: authHeader } },
        auth: { persistSession: false }
      }
    );

    // Verify the caller is authenticated using the provided JWT
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser(token);
    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Authenticated user:', user.id);

    // Create admin client (service role) for privileged operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    // Check if user is admin using the authenticated client
    const { data: roleData, error: roleError } = await supabaseUser
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle();

    let isAdmin = false;
    if (roleError) {
      console.error('Error checking user role:', roleError);
    }
    if (roleData && ['admin', 'super_admin'].includes(roleData.role)) {
      isAdmin = true;
    }

    // Bootstrap: if initial admin has no role yet, grant super_admin once
    if (!isAdmin && user.email === 'admin@temp.local') {
      console.log('Bootstrapping super_admin role for initial admin user:', user.id);
      const { error: bootstrapError } = await supabaseAdmin
        .from('user_roles')
        .insert({ user_id: user.id, role: 'super_admin' });
      if (bootstrapError) {
        console.error('Failed to bootstrap admin role:', bootstrapError);
      } else {
        isAdmin = true;
      }
    }

    if (!isAdmin) {
      return new Response(JSON.stringify({ error: 'Only admins can create users' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('User is admin, proceeding with user creation');

    // Parse request body
    const { employeeCode, name, position }: CreateUserRequest = await req.json();

    console.log('Creating user:', { employeeCode, name, position });

    // Create user with temporary email
    const tempEmail = `${employeeCode}@temp.local`;
    const defaultPassword = '1234';

    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: tempEmail,
      password: defaultPassword,
      email_confirm: true,
      user_metadata: {
        name,
        position,
        employee_code: employeeCode,
        must_change_password: true
      }
    });

    if (createError) {
      console.error('Error creating user:', createError);
      return new Response(JSON.stringify({ error: createError.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('User created successfully:', newUser.user?.id);

    // Note: Role is assigned automatically by the sync_role_from_position() trigger
    // based on the position_role_mappings table

    return new Response(
      JSON.stringify({ 
        success: true, 
        user: newUser.user,
        message: 'User created with default password: 1234'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in create-user function:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});