import jwt from 'jsonwebtoken';
import config from '../config/env.js';
import otpService from '../services/otpService.js';
import db from '../repositories/databaseRepository.js';

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
      if (email) {
        const existingEmail = await db.findUserByIdentifier(email);
        if (existingEmail) {
          return res.json({
            available: false,
            field: 'email',
            code: 'EMAIL_ALREADY_IN_USE',
            message: 'An account with this email address already exists. Please sign in or reset your password.'
          });
        }
      }
      if (username) {
        const existingUser = await db.findUserByIdentifier(username);
        if (existingUser) {
          return res.json({ available: false, field: 'username', message: 'Username is already taken.' });
        }
      }
      if (mobile) {
        const existingMobile = await db.findUserByIdentifier(mobile);
        if (existingMobile) {
          return res.json({ available: false, field: 'mobile', message: 'Mobile number is already registered.' });
        }
      }
      return res.json({ available: true });
    } catch (err) {
      return res.status(500).json({ available: false, message: err.message });
    }
  },

  // Send Google SMTP OTP
  async sendOtp(req, res) {
    try {
      const { email, identifier, purpose } = req.body;
      let targetEmail = email;

      // If identifier passed instead of direct email, resolve it
      if (!targetEmail && identifier) {
        const user = await db.findUserByIdentifier(identifier);
        if (user) {
          targetEmail = user.email;
        } else if (identifier.includes('@')) {
          targetEmail = identifier;
        }
      }

      if (!targetEmail) {
        return res.status(400).json({ success: false, message: 'Valid email address or registered account identifier is required.' });
      }

      // If purpose is signup, verify email is not already registered before sending OTP
      if (purpose === 'signup') {
        const existing = await db.findUserByIdentifier(targetEmail);
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
      let targetEmail = email;

      if (!targetEmail && identifier) {
        const user = await db.findUserByIdentifier(identifier);
        if (user) {
          targetEmail = user.email;
        } else if (identifier.includes('@')) {
          targetEmail = identifier;
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

      // Generate signed JWT token
      const token = jwt.sign(
        { id: user.id, email: user.email, username: user.username },
        config.jwtSecret,
        { expiresIn: '30d' }
      );

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

  // Sync / Initialize User in Supabase & Local Database
  async syncUser(req, res) {
    try {
      const { firebaseUid, email, displayName, username, mobile_number, photoURL, email_verified } = req.body;
      if (!email) {
        return res.status(400).json({ success: false, message: 'Email is required.' });
      }

      // Check if user already exists
      const existing = await db.findUserByIdentifier(email);
      if (existing) {
        const token = jwt.sign(
          { id: existing.id, email: existing.email, username: existing.username },
          config.jwtSecret,
          { expiresIn: '30d' }
        );
        return res.json({ 
          success: true, 
          token, 
          user: existing, 
          profile: existing.user_profiles 
        });
      }

      // Create new user & profile
      const userData = {
        firebase_uid: firebaseUid,
        email: email.toLowerCase().trim(),
        username: username || email.split('@')[0],
        mobile_number: mobile_number || null,
        email_verified: email_verified || false
      };

      const profileData = {
        display_name: displayName || email.split('@')[0],
        avatar_url: photoURL || `https://api.dicebear.com/7.x/adventurer/svg?seed=${firebaseUid || email}`,
        bio: 'In a love story written by the stars ✨',
        relationship_status: 'In a soul bond'
      };

      const result = await db.createUser(userData, profileData);
      const token = jwt.sign(
        { id: result.user.id, email: result.user.email, username: result.user.username },
        config.jwtSecret,
        { expiresIn: '30d' }
      );

      return res.json({ success: true, token, ...result });
    } catch (err) {
      console.error('Sync user error:', err);
      return res.status(500).json({ success: false, message: 'Error initializing user account.' });
    }
  },

  // Reset password after OTP verification
  async resetPassword(req, res) {
    try {
      const { identifier, otp, newPassword } = req.body;
      if (!identifier || !otp || !newPassword) {
        return res.status(400).json({ success: false, message: 'Identifier, OTP, and new password are required.' });
      }

      const user = await db.findUserByIdentifier(identifier);
      if (!user) {
        return res.status(404).json({ success: false, message: 'No registered user found with this identifier.' });
      }

      const otpResult = await otpService.verifyOtp(user.email, otp, 'forgot_password');
      if (!otpResult.success) {
        return res.status(400).json(otpResult);
      }

      return res.json({ success: true, message: 'Password security credentials verified and updated.' });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  },

  // Record Terms of Service Acceptance
  async recordTermsAcceptance(req, res) {
    try {
      const { termsVersion, privacyVersion, timestamp } = req.body;
      await db.recordTermsAcceptance({
        terms_version: termsVersion || '1.0.0',
        privacy_version: privacyVersion || '1.0.0',
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