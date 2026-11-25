import { createClient } from '@supabase/supabase-js';
import config from './env.js';

if (!config.supabase.url || !config.supabase.serviceRoleKey) {
  throw new Error('Supabase configuration missing: set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
}

export const supabase = createClient(config.supabase.url, config.supabase.serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

export async function checkSupabaseHealth() {
  try {
    const { error } = await supabase.from('users').select('id').limit(1);
    if (error) {
      return {
        connected: false,
        usingServiceRole: !config.supabase.isPublishableKey,
        error: error.message,
        code: error.code || null
      };
    }
    return {
      connected: true,
      usingServiceRole: !config.supabase.isPublishableKey,
      error: null,
      code: null
    };
  } catch (err) {
    return {
      connected: false,
      usingServiceRole: !config.supabase.isPublishableKey,
      error: err.message,
      code: null
    };
  }
}

export default supabase;
