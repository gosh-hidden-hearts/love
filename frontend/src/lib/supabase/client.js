import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    import.meta.env.VITE_SUPABASE_URL || 'https://azwclorwxrzgofmribms.supabase.co',
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_TzJoKCD-cPN6JLbgB_5K5g_H2nkq8YW'
  );
}

export default createClient;
