/**
 * GOSH SMTP EMAIL DISPATCH CONFIGURATION
 * Dedicated Zero-Cost Gmail SMTP Relay for 2FA Email OTP & Security Alerts
 */

function getStoredSmtp() {
  if (typeof localStorage !== 'undefined') {
    try {
      const data = localStorage.getItem('gosh_smtp_credentials');
      if (data) return JSON.parse(data);
    } catch {}
  }
  return null;
}

const custom = getStoredSmtp();
const defaultUser = "gost81416@gmail.com";
const defaultPass = "vxue vwxa umcc waar";

export const SmtpConfig = {
  // Gmail SMTP Server Settings
  host: custom?.host || "smtp.gmail.com",
  port: custom?.port || 465,
  secure: true, // SSL/TLS
  alternativePort: 587, // STARTTLS

  // Dedicated Sender Credentials
  auth: {
    user: custom?.user || defaultUser,
    pass: custom?.pass || defaultPass,
    cleanPass: (custom?.pass || defaultPass).replace(/\s+/g, '')
  },

  // Default Sender Identity
  from: `"GOSH Security" <${custom?.user || defaultUser}>`,
  replyTo: custom?.user || defaultUser,

  // Service Status & Operational Metadata
  enabled: true,
  provider: "Gmail SMTP Relay",
  configuredAt: custom?.updatedAt || "2026-11-19T22:59:55.000Z",

  // Dynamically update credentials from UI
  saveCredentials(newUser, newPass, newHost = "smtp.gmail.com", newPort = 465) {
    const cleanUser = (newUser || '').trim();
    const cleanP = (newPass || '').trim();
    if (!cleanUser || !cleanP) {
      throw new Error('Please provide both SMTP email and App Password.');
    }
    const record = {
      user: cleanUser,
      pass: cleanP,
      host: (newHost || 'smtp.gmail.com').trim(),
      port: Number(newPort) || 465,
      updatedAt: new Date().toISOString()
    };
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('gosh_smtp_credentials', JSON.stringify(record));
    }
    this.host = record.host;
    this.port = record.port;
    this.auth.user = record.user;
    this.auth.pass = record.pass;
    this.auth.cleanPass = record.pass.replace(/\s+/g, '');
    this.from = `"GOSH Security" <${record.user}>`;
    this.replyTo = record.user;
    this.configuredAt = record.updatedAt;
    return record;
  },

  resetToDefault() {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('gosh_smtp_credentials');
    }
    this.host = "smtp.gmail.com";
    this.port = 465;
    this.auth.user = defaultUser;
    this.auth.pass = defaultPass;
    this.auth.cleanPass = defaultPass.replace(/\s+/g, '');
    this.from = `"GOSH Security" <${defaultUser}>`;
    this.replyTo = defaultUser;
  }
};
