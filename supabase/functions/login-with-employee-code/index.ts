
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LoginRequest {
  employeeCode: string;
  password: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Parse request body
    const { employeeCode, password }: LoginRequest = await req.json();

    console.log('Login attempt for employee code:', employeeCode);

    // Get email from employee code
    let email: string | null = null;

    const { data: rpcEmail, error: emailError } = await supabase
      .rpc('get_email_by_employee_code', { _employee_code: employeeCode });

    if (!emailError && rpcEmail) {
      email = rpcEmail;
      console.log('Found email via RPC:', email);
    } else {
      console.log('RPC failed or returned null, trying fallback...');
      // Fallback: List users and check metadata
      const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();

      if (!listError && users) {
        const user = users.find(u =>
          (u.user_metadata?.employee_code && u.user_metadata.employee_code.toLowerCase() === employeeCode.toLowerCase()) ||
          (u.user_metadata?.employeeCode && u.user_metadata.employeeCode.toLowerCase() === employeeCode.toLowerCase())
        );
        if (user) {
          email = user.email || null;
          console.log('Found email via fallback metadata:', email);
        }
      }
    }

    if (!email) {
      console.error('Employee code not found:', employeeCode);
      return new Response(
        JSON.stringify({ error: 'Invalid employee code or password' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Sign in with email and password
    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      console.error('Sign in error:', signInError);
      return new Response(
        JSON.stringify({ error: `Sign in failed: ${signInError.message}` }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('Sign in successful for:', employeeCode);

    return new Response(
      JSON.stringify({
        session: data.session,
        user: data.user
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in login-with-employee-code function:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});