/**
 * GOSH SMTP EMAIL DISPATCH CONFIGURATION
 * Dedicated Zero-Cost Gmail SMTP Relay for 2FA Email OTP & Security Alerts
 */

export const SmtpConfig = {
  // Gmail SMTP Server Settings
  host: "smtp.gmail.com",
  port: 465,
  secure: true, // SSL/TLS
  alternativePort: 587, // STARTTLS

  // Dedicated Sender Credentials
  auth: {
    user: "gost81416@gmail.com",
    pass: "vxue vwxa umcc waar", // Google App Password
    cleanPass: "vxuevwxaumccwaar"
  },

  // Default Sender Identity
  from: '"GOSH Security" <gost81416@gmail.com>',
  replyTo: "gost81416@gmail.com",

  // Service Status & Operational Metadata
  enabled: true,
  provider: "Gmail SMTP Relay",
  configuredAt: "2026-11-19T22:59:55.000Z"
};
