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
    const { employeeCode } = await req.json();

    if (!employeeCode) {
      return new Response(
        JSON.stringify({ error: 'Employee code is required' }),
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

    // Find user by employee_code
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, name, employee_code')
      .eq('employee_code', employeeCode)
      .single();

    if (profileError || !profile) {
      console.error('User profile not found:', profileError);
      return new Response(
        JSON.stringify({ error: 'ไม่พบรหัสพนักงานในระบบ' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = profile.id;

    // Generate temporary password (using employee code + 1234 as pattern)
    const tempPassword = `${employeeCode}1234`;

    // Reset password
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { password: tempPassword }
    );

    if (updateError) {
      console.error('Failed to reset password:', updateError);
      return new Response(
        JSON.stringify({ error: 'ไม่สามารถรีเซ็ตรหัสผ่านได้' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Set must_change_password flag
    const { error: profileUpdateError } = await supabaseAdmin
      .from('profiles')
      .update({ must_change_password: true })
      .eq('id', userId);

    if (profileUpdateError) {
      console.error('Failed to update profile:', profileUpdateError);
    }

    console.log(`Password reset for user: ${userId} (${employeeCode})`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        employeeCode: employeeCode,
        tempPassword: tempPassword,
        name: profile.name
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in reset-user-password function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});