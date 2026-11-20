import nodemailer from 'nodemailer';
import config from './env.js';

export const transporter = nodemailer.createTransport({
  host: config.smtp.host,
  port: config.smtp.port,
  secure: config.smtp.port === 465,
  auth: {
    user: config.smtp.user,
    pass: config.smtp.pass
  }
});

// Verify connection on startup
transporter.verify((err, success) => {
  if (err) {
    console.warn('⚠️ Google SMTP Warning:', err.message);
  } else {
    console.log('💌 Google SMTP Server Ready to dispatch OTPs.');
  }
});

export default transporter;
