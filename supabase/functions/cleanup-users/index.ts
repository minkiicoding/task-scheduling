import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        // 1. List all users to find ADMIN001
        const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();

        if (listError) throw listError;

        const results = [];
        let found = false;

        for (const user of users) {
            const employeeCode = user.user_metadata?.employeeCode || user.user_metadata?.employee_code;
            console.log(`Checking user ${user.id}: ${employeeCode} (metadata: ${JSON.stringify(user.user_metadata)})`);

            if (employeeCode === 'ADMIN001' || employeeCode === 'admin') {
                found = true;
                // Update auth metadata
                const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
                    user.id,
                    { user_metadata: { ...user.user_metadata, employee_code: 'admin', employeeCode: 'admin' } }
                );

                if (updateError) {
                    results.push(`Failed to update auth metadata: ${updateError.message}`);
                } else {
                    results.push(`Updated auth metadata: employee_code = 'admin'`);
                }

                // Update profile
                const { error: profileError } = await supabaseAdmin
                    .from('profiles')
                    .update({ employee_code: 'admin' })
                    .eq('id', user.id);

                if (profileError) {
                    results.push(`Failed to update profile: ${profileError.message}`);
                } else {
                    results.push(`Updated profile: employee_code = 'admin'`);
                }
            }
        }

        if (!found) {
            results.push('User with employee_code ADMIN001 not found.');
        }

        return new Response(
            JSON.stringify({ message: 'Update complete', results }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (error) {
        return new Response(
            JSON.stringify({ error: (error as Error).message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
