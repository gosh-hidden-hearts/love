import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  supabase: {
    url: process.env.SUPABASE_URL || 'https://azwclorwxrzgofmribms.supabase.co',
    key: process.env.SUPABASE_KEY || 'sb_publishable_TzJoKCD-cPN6JLbgB_5K5g_H2nkq8YW'
  },
  smtp: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    user: process.env.SMTP_USER || 'gosh81416@gmail.com',
    pass: process.env.SMTP_PASS || 'qpyu ryqr asmf wypm',
    from: process.env.SMTP_FROM || '"GOSH Sanctuary" <gosh81416@gmail.com>'
  },
  mega: {
    email: process.env.MEGA_EMAIL || 'gosh81416@gmail.com',
    password: process.env.MEGA_PASSWORD || 'Gokul@709'
  },
  jwtSecret: process.env.JWT_SECRET || 'gosh_ultra_max_romantic_secret_key_2026',
  otpExpiryMinutes: parseInt(process.env.OTP_EXPIRY_MINUTES || '10', 10)
};

export default config;
