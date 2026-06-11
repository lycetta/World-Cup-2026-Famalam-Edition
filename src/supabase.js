import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error(
    'Missing Supabase env vars. Add REACT_APP_SUPABASE_URL and ' +
    'REACT_APP_SUPABASE_ANON_KEY to your .env file or Vercel settings.'
  );
}

export const supabase = createClient(supabaseUrl || '', supabaseKey || '');
