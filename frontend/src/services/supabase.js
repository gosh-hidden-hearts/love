import { createClient } from '@supabase/supabase-js';

export const supabaseUrl = 'https://azwclorwxrzgofmribms.supabase.co';
export const supabasePublishableKey = 'sb_publishable_TzJoKCD-cPN6JLbgB_5K5g_H2nkq8YW';

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true
  }
});

export default supabase;
