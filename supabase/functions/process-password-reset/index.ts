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
    const { requestId, action } = await req.json();

    if (!requestId || !action) {
      return new Response(
        JSON.stringify({ error: 'Request ID and action are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action !== 'approve' && action !== 'reject') {
      return new Response(
        JSON.stringify({ error: 'Invalid action' }),
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
        JSON.stringify({ error: 'Only admins can process password reset requests' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the reset request
    const { data: request, error: requestError } = await supabaseAdmin
      .from('password_reset_requests')
      .select('*')
      .eq('id', requestId)
      .single();

    if (requestError || !request) {
      return new Response(
        JSON.stringify({ error: 'Request not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (request.status !== 'pending') {
      return new Response(
        JSON.stringify({ error: 'Request has already been processed' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let tempPassword = null;

    // If approved, reset the password
    if (action === 'approve') {
      const employeeCode = request.employee_code;
      tempPassword = `${employeeCode}1234`;

      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        request.employee_id,
        { password: tempPassword }
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
        .eq('id', request.employee_id);

      if (profileUpdateError) {
        console.error('Failed to update profile:', profileUpdateError);
      }
    }

    // Update the request status
    const { error: updateRequestError } = await supabaseAdmin
      .from('password_reset_requests')
      .update({
        status: action === 'approve' ? 'approved' : 'rejected',
        processed_by: user.id,
        processed_at: new Date().toISOString()
      })
      .eq('id', requestId);

    if (updateRequestError) {
      console.error('Failed to update request:', updateRequestError);
      return new Response(
        JSON.stringify({ error: 'Failed to update request' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Password reset request ${requestId} ${action}ed by ${user.id}`);

    return new Response(
      JSON.stringify({ 
        success: true,
        action,
        tempPassword: action === 'approve' ? tempPassword : null
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in process-password-reset function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
