import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateAdminUserRequest {
    email: string;
    name: string;
    employeeCode: string;
    password?: string;
    position?: string; // Optional override, defaults to 'Admin'
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

        const token = authHeader.replace(/^Bearer\s+/i, '');
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
        const providedServiceKey = req.headers.get('x-service-key');
        let isBootstrapMode = false;

        // Create admin client (service role) for privileged operations
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
            { auth: { persistSession: false } }
        );

        // Check if the caller is using the Service Role Key (Bootstrap Mode)
        // We check a custom header 'x-service-key' to avoid "Invalid JWT" errors from Supabase Gateway
        if (serviceRoleKey && providedServiceKey === serviceRoleKey) {
            console.log('Service Role Key detected via x-service-key header. Running in bootstrap mode.');
            isBootstrapMode = true;
        } else {
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
                return new Response(JSON.stringify({
                    error: 'Unauthorized',
                    debug: {
                        receivedTokenLength: token.length,
                        expectedKeyLength: serviceRoleKey?.length,
                        hasEnv: !!serviceRoleKey,
                        tokenStart: token.substring(0, 10),
                        keyStart: serviceRoleKey?.substring(0, 10)
                    }
                }), {
                    status: 401,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                });
            }

            console.log('Authenticated user:', user.id);

            // Check if user is super_admin using the authenticated client
            const { data: roleData, error: roleError } = await supabaseUser
                .from('user_roles')
                .select('role')
                .eq('user_id', user.id)
                .maybeSingle();

            if (roleError) {
                console.error('Error checking user role:', roleError);
                return new Response(JSON.stringify({ error: 'Error checking permissions' }), {
                    status: 500,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                });
            }

            // Strict check: Only super_admin can create other admins
            if (!roleData || roleData.role !== 'super_admin') {
                return new Response(JSON.stringify({ error: 'Only super_admins can create admin users' }), {
                    status: 403,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                });
            }

            console.log('User is super_admin, proceeding with admin creation');
        }

        // Parse request body
        const { email, name, employeeCode, password, position }: CreateAdminUserRequest = await req.json();

        if (!email || !name || !employeeCode) {
            return new Response(JSON.stringify({ error: 'Missing required fields: email, name, employeeCode' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        console.log('Creating admin user:', { email, name, employeeCode });

        const finalPassword = password || '1234';
        // Default to 'Admin' position which maps to 'super_admin' role in position_role_mappings
        // Or 'Partner' which maps to 'admin' role.
        const finalPosition = position || 'Admin';

        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
            email: email,
            password: finalPassword,
            email_confirm: true,
            user_metadata: {
                name,
                position: finalPosition,
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

        console.log('Admin user created successfully:', newUser.user?.id);

        return new Response(
            JSON.stringify({
                success: true,
                user: newUser.user,
                message: `Admin user created with position ${finalPosition}`
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    } catch (error) {
        console.error('Error in create-admin-user function:', error);
        return new Response(
            JSON.stringify({ error: (error as Error).message }),
            {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
        );
    }
});
