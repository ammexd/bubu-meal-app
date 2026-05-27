// import { createClient } from '@supabase/supabase-js';

// const supabaseUrl     = process.env.NEXT_PUBLIC_SUPABASE_URL      ?? 'https://placeholder.supabase.co';
// const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder-key';

// export const supabase = createClient(supabaseUrl, supabaseAnonKey);



import { createClient } from '@supabase/supabase-js';

const supabaseUrl     = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase env vars — check .env.local');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);