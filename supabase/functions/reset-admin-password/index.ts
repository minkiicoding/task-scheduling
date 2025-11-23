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

    // Find admin user by employee_code
    const { data: profiles, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('employee_code', 'admin')
      .single();

    if (profileError || !profiles) {
      console.error('Admin profile not found:', profileError);
      return new Response(
        JSON.stringify({ error: 'Admin user not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const adminUserId = profiles.id;

    // Update email to match the hardcoded value in code
    const { error: emailError } = await supabaseAdmin.auth.admin.updateUserById(
      adminUserId,
      { 
        email: 'admin@temp.local',
        email_confirm: true
      }
    );

    if (emailError) {
      console.error('Failed to update email:', emailError);
      return new Response(
        JSON.stringify({ error: 'Failed to update email' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Reset password to default
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      adminUserId,
      { password: 'admin1234' }
    );

    if (updateError) {
      console.error('Failed to reset password:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to reset password' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Set must_change_password flag
    const { error: profileUpdateError } = await supabaseAdmin
      .from('profiles')
      .update({ must_change_password: true })
      .eq('id', adminUserId);

    if (profileUpdateError) {
      console.error('Failed to update profile:', profileUpdateError);
    }

    console.log(`Admin email updated to admin@temp.local and password reset for user: ${adminUserId}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Admin credentials have been reset to "admin" / "admin1234". Please change password on first login.',
        username: 'admin',
        password: 'admin1234'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in reset-admin-password function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
