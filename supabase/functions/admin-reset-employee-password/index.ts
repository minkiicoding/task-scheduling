import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { employeeId } = await req.json();

    if (!employeeId) {
      return new Response(
        JSON.stringify({ error: 'Employee ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Get authorization header
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user is admin
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user has admin or super_admin role
    const { data: userRole, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .in('role', ['admin', 'super_admin']);

    if (roleError || !userRole || userRole.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Only admins can reset employee passwords' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get employee profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, name, employee_code')
      .eq('id', employeeId)
      .single();

    if (profileError || !profile) {
      console.error('Employee profile not found:', profileError);
      return new Response(
        JSON.stringify({ error: 'ไม่พบพนักงานในระบบ' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate temporary password (must meet Supabase password requirements: min 6 characters)
    // Using simple 123456 that users will change on first login
    const tempPassword = '123456';

    // Reset password
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      employeeId,
      { password: tempPassword }
    );

    if (updateError) {
      console.error('Failed to reset password:', updateError);
      return new Response(
        JSON.stringify({ error: `ไม่สามารถรีเซ็ตรหัสผ่านได้: ${updateError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Set must_change_password flag
    const { error: profileUpdateError } = await supabaseAdmin
      .from('profiles')
      .update({ must_change_password: true })
      .eq('id', employeeId);

    if (profileUpdateError) {
      console.error('Failed to update profile:', profileUpdateError);
    }

    console.log(`Password reset for employee: ${employeeId} (${profile.employee_code}) by admin: ${user.id}`);

    return new Response(
      JSON.stringify({
        success: true,
        employeeCode: profile.employee_code,
        tempPassword: tempPassword,
        name: profile.name
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in admin-reset-employee-password function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
