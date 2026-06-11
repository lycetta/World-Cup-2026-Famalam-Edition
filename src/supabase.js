import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

console.log('SUPABASE URL:', supabaseUrl);
console.log('SUPABASE KEY:', supabaseKey ? 'present' : 'MISSING');

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase env vars');
}

export const supabase = createClient(supabaseUrl || '', supabaseKey || '');
