import { createClient } from '@supabase/supabase-js';

// Anon client — respects RLS, use for most operations
export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Service role client — bypasses RLS, use ONLY for admin server-side operations
// Never expose this to the client
export const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
