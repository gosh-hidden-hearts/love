import { createClient } from '@supabase/supabase-js';
import config from './env.js';

export const supabase = createClient(config.supabase.url, config.supabase.key, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

export default supabase;
