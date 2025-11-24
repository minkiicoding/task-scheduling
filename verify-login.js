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

async function verifyLogin() {
  const email = 'admin@temp.local';
  // NOTE: You can change this password to test different ones
  const password = process.argv[2] || 'password123'; 

  console.log(`Attempting to login with: ${email}`);
  console.log(`Using password: ${password}`);
  console.log(`Target Supabase URL: ${supabaseUrl}`);

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    console.error('Login FAILED:', error.message);
  } else {
    console.log('Login SUCCESS!');
    console.log('User ID:', data.user.id);
    console.log('Email:', data.user.email);
  }
}

verifyLogin();
