import jwt from 'jsonwebtoken';
import config from '../config/env.js';
import otpService from '../services/otpService.js';
import db from '../repositories/databaseRepository.js';

function signSessionJwt(user) {
  if (!config.jwtSecret) {
    throw new Error('JWT_SECRET is not configured on the server.');
  }
  return jwt.sign(
    {
      id: user.id,
      firebaseUid: user.firebase_uid || null,
      email: user.email,
      username: user.username
    },
    config.jwtSecret,
    { expiresIn: '30d', algorithm: 'HS256' }
  );
}

export const authController = {
  // Resolve Username or Mobile Number to registered Email
  async resolveIdentifier(req, res) {
    try {
      const { identifier } = req.body;
      if (!identifier) {
        return res.status(400).json({ success: false, message: 'Identifier is required.' });
      }

      const user = await db.findUserByIdentifier(identifier);
      if (!user) {
        return res.status(404).json({ success: false, message: 'No registered account found with this identifier.' });
      }

      return res.json({ success: true, email: user.email });
    } catch (err) {
      console.error('Resolve error:', err);
      return res.status(500).json({ success: false, message: 'Internal server error resolving identifier.' });
    }
  },

  // Check username, mobile & email uniqueness
  async checkAvailability(req, res) {
    try {
      const { username, mobile, email } = req.body;
      const result = await db.checkAvailability({ username, mobile, email });
      return res.json(result);
    } catch (err) {
      console.error('Availability check error:', err);
      return res.status(500).json({ available: false, message: err.message });
    }
  },

  // Send Google SMTP OTP
  async sendOtp(req, res) {
    try {
      const { email, identifier, purpose } = req.body;
      let targetEmail = email ? email.trim().toLowerCase() : null;

      if (!targetEmail && identifier) {
        const user = await db.findUserByIdentifier(identifier);
        if (user) {
          targetEmail = user.email;
        } else if (identifier.includes('@')) {
          targetEmail = identifier.trim().toLowerCase();
        }
      }

      if (!targetEmail) {
        return res.status(400).json({
          success: false,
          message: 'Valid email address or registered account identifier is required.'
        });
      }

      if (purpose === 'signup') {
        const existing = await db.findUserByEmail(targetEmail);
        if (existing) {
          return res.status(400).json({
            success: false,
            code: 'EMAIL_ALREADY_IN_USE',
            message: 'An account with this email address already exists. Please sign in to continue.'
          });
        }
      }

      const result = await otpService.sendOtpEmail(targetEmail, purpose || 'signup');
      return res.json({ ...result, email: targetEmail });
    } catch (err) {
      console.error('Send OTP error:', err);
      return res.status(500).json({ success: false, message: 'Failed to send OTP email: ' + err.message });
    }
  },

  // Verify OTP
  async verifyOtp(req, res) {
    try {
      const { email, identifier, otp, purpose } = req.body;
      let targetEmail = email ? email.trim().toLowerCase() : null;

      if (!targetEmail && identifier) {
        const user = await db.findUserByIdentifier(identifier);
        if (user) {
          targetEmail = user.email;
        } else if (identifier.includes('@')) {
          targetEmail = identifier.trim().toLowerCase();
        }
      }

      if (!targetEmail || !otp) {
        return res.status(400).json({ success: false, message: 'Email/Identifier and OTP are required.' });
      }

      const result = await otpService.verifyOtp(targetEmail, otp, purpose || 'signup');
      return res.json(result);
    } catch (err) {
      console.error('Verify OTP error:', err);
      return res.status(500).json({ success: false, message: 'OTP verification failed.' });
    }
  },

  // Login via Phone Number / Email + OTP
  async loginWithOtp(req, res) {
    try {
      const { identifier, otp } = req.body;
      if (!identifier || !otp) {
        return res.status(400).json({ success: false, message: 'Identifier and OTP are required.' });
      }

      const user = await db.findUserByIdentifier(identifier);
      if (!user) {
        return res.status(404).json({ success: false, message: 'No registered account found with this identifier.' });
      }

      const otpResult = await otpService.verifyOtp(user.email, otp, 'login');
      if (!otpResult.success) {
        return res.status(400).json(otpResult);
      }

      const token = signSessionJwt(user);
      return res.json({
        success: true,
        token,
        user,
        profile: user.user_profiles
      });
    } catch (err) {
      console.error('Login with OTP error:', err);
      return res.status(500).json({ success: false, message: 'OTP login failed: ' + err.message });
    }
  },

  // Sync / Initialize Verified Firebase User in Supabase PostgreSQL
  // Protected by requireFirebaseToken: req.firebaseUser is cryptographically verified.
  async syncUser(req, res) {
    try {
      const verified = req.firebaseUser;
      if (!verified?.uid || !verified?.email) {
        return res.status(400).json({
          success: false,
          message: 'Verified Firebase token must include UID and email.'
        });
      }

      const { displayName, username, mobile_number, photoURL } = req.body || {};

      const result = await db.syncFirebaseUser({
        firebaseUid: verified.uid,
        email: verified.email,
        emailVerified: verified.emailVerified,
        displayName: displayName || verified.name,
        username: username || null,
        mobileNumber: mobile_number || verified.phoneNumber || null,
        photoURL: photoURL || verified.picture || null
      });

      const token = signSessionJwt(result.user);

      return res.json({
        success: true,
        token,
        user: result.user,
        profile: result.profile
      });
    } catch (err) {
      console.error('Sync user error:', err);
      const status =
        err.code === 'USERNAME_TAKEN' || err.code === 'FIREBASE_UID_MISMATCH' ? 409 : 500;
      return res.status(status).json({
        success: false,
        code: err.code || 'SYNC_FAILED',
        message: err.message || 'Error synchronizing user account with Supabase.'
      });
    }
  },

  // Reset password verification notice (Firebase password updates happen via Firebase reset email)
  async resetPassword(req, res) {
    try {
      const { identifier, otp } = req.body;
      if (!identifier || !otp) {
        return res.status(400).json({ success: false, message: 'Identifier and OTP are required.' });
      }

      const user = await db.findUserByIdentifier(identifier);
      if (!user) {
        return res.status(404).json({ success: false, message: 'No registered user found with this identifier.' });
      }

      const otpResult = await otpService.verifyOtp(user.email, otp, 'forgot_password');
      if (!otpResult.success) {
        return res.status(400).json(otpResult);
      }

      return res.json({
        success: true,
        email: user.email,
        message: 'OTP verified. A Firebase password reset link can now be dispatched to your email.'
      });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  },

  // Record Terms of Service Acceptance
  async recordTermsAcceptance(req, res) {
    try {
      const { termsVersion, privacyVersion, timestamp } = req.body || {};
      await db.recordTermsAcceptance({
        user_id: req.user?.id || null,
        terms_version: termsVersion || 'v1.0.0',
        privacy_version: privacyVersion || 'v1.0.0',
        accepted_at: timestamp || new Date().toISOString(),
        ip_address: req.ip
      });
      return res.json({ success: true });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }
};

export default authController;
