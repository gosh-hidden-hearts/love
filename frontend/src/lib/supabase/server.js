import { createServerClient, parseCookieHeader, serializeCookieHeader } from '@supabase/ssr';

export function createClient(request) {
  const headers = new Headers();

  const supabase = createServerClient(
    process.env.VITE_SUPABASE_URL || 'https://azwclorwxrzgofmribms.supabase.co',
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_TzJoKCD-cPN6JLbgB_5K5g_H2nkq8YW',
    {
      cookies: {
        getAll() {
          return parseCookieHeader(request?.headers?.get('Cookie') ?? '');
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            headers.append('Set-Cookie', serializeCookieHeader(name, value, options))
          );
        },
      },
    }
  );

  return { supabase, headers };
}

export default createClient;
