import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import transporter from '../config/email.js';
import config from '../config/env.js';
import db from '../repositories/databaseRepository.js';

export const otpService = {
  // Generate random 6-digit numeric OTP
  generateOtp() {
    return crypto.randomInt(100000, 999999).toString();
  },

  // Send OTP via Google SMTP
  async sendOtpEmail(email, purpose = 'signup') {
    const rawOtp = this.generateOtp();
    const salt = await bcrypt.genSalt(10);
    const otpHash = await bcrypt.hash(rawOtp, salt);

    const expiresAt = new Date(Date.now() + config.otpExpiryMinutes * 60 * 1000).toISOString();

    // Persist OTP in repository
    await db.saveOtp(email.toLowerCase().trim(), otpHash, purpose, expiresAt);

    // Subject & titles
    const isSignup = purpose === 'signup';
    const subject = isSignup 
      ? 'Your GOSH Verification Code — Welcome to Soul Sanctuary'
      : 'Your GOSH Password Reset Security Code';

    const titleText = isSignup ? 'Welcome to GOSH' : 'GOSH Account Security';
    const subText = isSignup 
      ? 'Thank you for joining GOSH (Glimpse Of Soul Hearts). Please use the security code below to complete your registration.'
      : 'A password reset request was received for your GOSH account. Use the code below to proceed.';

    // Romantic HTML Email Template
    const html = `
      <div style="background-color: #0c0d14; color: #f8fafc; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px 20px; text-align: center;">
        <div style="max-width: 500px; margin: 0 auto; background: #151724; border: 1px solid rgba(244, 63, 94, 0.2); border-radius: 24px; padding: 36px 24px; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
          
          <div style="width: 56px; height: 56px; margin: 0 auto 16px; background: rgba(244,63,94,0.15); border: 1px solid rgba(244,63,94,0.3); border-radius: 16px; line-height: 56px; font-size: 28px;">
            ❤️
          </div>

          <h1 style="color: #ffffff; font-size: 24px; margin: 0 0 4px; font-weight: 700;">${titleText}</h1>
          <p style="color: #f43f5e; font-size: 11px; text-transform: uppercase; letter-spacing: 2px; margin: 0 0 20px;">Glimpse Of Soul Hearts</p>

          <p style="color: #94a3b8; font-size: 13px; line-height: 1.6; margin: 0 0 24px;">${subText}</p>

          <div style="background: rgba(12, 13, 20, 0.8); border: 1px dashed rgba(244, 63, 94, 0.4); border-radius: 16px; padding: 18px; margin: 0 0 24px;">
            <span style="font-family: Courier, monospace; font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #ffffff; display: block;">
              ${rawOtp}
            </span>
          </div>

          <p style="color: #64748b; font-size: 11px; margin: 0 0 8px;">
            This code will expire in <strong style="color: #cbd5e1;">${config.otpExpiryMinutes} minutes</strong>.
          </p>
          <p style="color: #64748b; font-size: 11px; margin: 0;">
            Never share this OTP with anyone. Our team will never ask for your code.
          </p>

          <hr style="border: 0; border-top: 1px solid rgba(255, 255, 255, 0.08); margin: 28px 0 20px;" />

          <p style="color: #475569; font-size: 10px; margin: 0;">
            GOSH — A private digital world for love, communication, and memories.
          </p>
        </div>
      </div>
    `;

    // Dispatch email
    const mailOptions = {
      from: config.smtp.from,
      to: email,
      subject,
      html
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✉️ OTP email successfully dispatched to ${email}. MessageId:`, info.messageId);

    return { success: true, messageId: info.messageId };
  },

  // Verify OTP
  async verifyOtp(email, inputOtp, purpose = 'signup') {
    const record = await db.getLatestOtp(email.toLowerCase().trim(), purpose);
    if (!record) {
      return { success: false, message: 'No active OTP found. Please request a new code.' };
    }

    if (new Date(record.expires_at) < new Date()) {
      return { success: false, message: 'This OTP has expired. Please request a new one.' };
    }

    const matches = await bcrypt.compare(inputOtp.trim(), record.otp_hash);
    if (!matches) {
      return { success: false, message: 'Incorrect OTP. Please check and try again.' };
    }

    // Invalidate OTP
    await db.markOtpUsed(record.id);
    return { success: true };
  }
};

export default otpService;
