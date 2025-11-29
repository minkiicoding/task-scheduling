import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Error: Missing Supabase credentials in .env file');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runCleanup() {
    console.log(`Target Supabase URL: ${supabaseUrl}`);
    console.log('Invoking cleanup-users function...');

    const { data, error } = await supabase.functions.invoke('cleanup-users');

    if (error) {
        console.error('Function Invocation FAILED:', error);
    } else {
        console.log('Cleanup SUCCESS!');
        console.log('Results:', data);
    }
}

runCleanup();
