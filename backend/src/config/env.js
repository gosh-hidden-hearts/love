import dotenv from 'dotenv';
dotenv.config();

const supabaseServiceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_KEY ||
  '';

export const config = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigins: (process.env.CORS_ORIGIN || 'https://gosh-hidden-hearts.github.io,http://localhost:3000,http://127.0.0.1:3000')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID || 'gosh-81416'
  },
  supabase: {
    url: process.env.SUPABASE_URL || 'https://azwclorwxrzgofmribms.supabase.co',
    serviceRoleKey: supabaseServiceRoleKey,
    isPublishableKey: supabaseServiceRoleKey.startsWith('sb_publishable_')
  },
  smtp: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || '"GOSH Sanctuary" <gosh81416@gmail.com>'
  },
  mega: {
    email: process.env.MEGA_EMAIL || '',
    password: process.env.MEGA_PASSWORD || ''
  },
  jwtSecret: process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? '' : 'gosh_dev_only_secret_change_in_prod'),
  otpExpiryMinutes: parseInt(process.env.OTP_EXPIRY_MINUTES || '10', 10)
};

if (config.nodeEnv === 'production' && !config.jwtSecret) {
  console.error('❌ CRITICAL: JWT_SECRET is not configured in production environment.');
}

if (!config.supabase.serviceRoleKey || config.supabase.isPublishableKey) {
  console.warn(
    '⚠️ SUPABASE_SERVICE_ROLE_KEY is missing or set to a publishable/anon key. Backend writes will be blocked once strict RLS is active.'
  );
}

export default config;
