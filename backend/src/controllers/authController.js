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

  // Check username & mobile uniqueness
  async checkAvailability(req, res) {
    try {
      const { username, mobile } = req.body;
      if (username) {
        const existingUser = await db.findUserByIdentifier(username);
        if (existingUser) {
          return res.json({ available: false, message: 'Username is already taken.' });
        }
      }
      if (mobile) {
        const existingMobile = await db.findUserByIdentifier(mobile);
        if (existingMobile) {
          return res.json({ available: false, message: 'Mobile number is already registered.' });
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
      const { email, purpose } = req.body;
      if (!email) {
        return res.status(400).json({ success: false, message: 'Email address is required.' });
      }

      const result = await otpService.sendOtpEmail(email, purpose || 'signup');
      return res.json(result);
    } catch (err) {
      console.error('Send OTP error:', err);
      return res.status(500).json({ success: false, message: 'Failed to send OTP email: ' + err.message });
    }
  },

  // Verify OTP
  async verifyOtp(req, res) {
    try {
      const { email, otp, purpose } = req.body;
      if (!email || !otp) {
        return res.status(400).json({ success: false, message: 'Email and OTP are required.' });
      }

      const result = await otpService.verifyOtp(email, otp, purpose || 'signup');
      return res.json(result);
    } catch (err) {
      console.error('Verify OTP error:', err);
      return res.status(500).json({ success: false, message: 'OTP verification failed.' });
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
        return res.json({ success: true, user: existing, profile: existing.user_profiles });
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
      return res.json({ success: true, ...result });
    } catch (err) {
      console.error('Sync user error:', err);
      return res.status(500).json({ success: false, message: 'Error initializing user account.' });
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
