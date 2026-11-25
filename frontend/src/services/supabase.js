import { createClient } from '@supabase/supabase-js';

export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://azwclorwxrzgofmribms.supabase.co';
export const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_TzJoKCD-cPN6JLbgB_5K5g_H2nkq8YW';

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true
  }
});

export { createClient as createBrowserClient } from '../lib/supabase/client';
export default supabase;
