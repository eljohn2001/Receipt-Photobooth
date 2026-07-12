const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://ylmoddvrrwvyxpyeqdzf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlsbW9kZHZycnd2eXhweWVxZHpmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3NzAwMDYsImV4cCI6MjA5NzM0NjAwNn0.tTuys60HEzrExP_6TwR3XyIZUOc4V9O04ynC36-sttU';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function run() {
  console.log('Attempting authentication via Supabase GoTrue API...');
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'admin@snapceipt.com',
    password: 'admin123'
  });
  console.log('DATA:', JSON.stringify(data, null, 2));
  console.log('ERROR:', error);
}

run();
