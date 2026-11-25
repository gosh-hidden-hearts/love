import db from '../repositories/databaseRepository.js';

export const userController = {
  // Search users for contact discovery
  async searchUsers(req, res) {
    try {
      const { q } = req.query;
      const users = await db.searchUsers(q);
      return res.json({ success: true, users });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  },

  // Get user profile
  async getProfile(req, res) {
    try {
      const { userId } = req.params;
      const user = await db.findUserByIdentifier(userId);
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }
      return res.json({ success: true, user, profile: user.user_profiles });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  },

  // Update profile
  async updateProfile(req, res) {
    try {
      const { userId } = req.params;
      const { displayName, username, mobile, bio, relationshipStatus, anniversaryDate, avatarUrl } = req.body;

      await db.updateUserProfile(userId, {
        display_name: displayName,
        avatar_url: avatarUrl,
        bio,
        relationship_status: relationshipStatus,
        anniversary_date: anniversaryDate,
        updated_at: new Date().toISOString()
      });

      return res.json({ success: true, message: 'Profile updated successfully.' });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  },

  // Get user contacts
  async getContacts(req, res) {
    try {
      const userId = req.user?.id || req.query.userId;
      if (!userId) {
        return res.status(400).json({ success: false, message: 'User ID required' });
      }
      const contacts = await db.getContacts(userId);
      return res.json({ success: true, contacts });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  },

  // Add contact
  async addContact(req, res) {
    try {
      const { userId, contactUserId, nickname } = req.body;
      const uid = req.user?.id || userId;
      if (!uid || !contactUserId) {
        return res.status(400).json({ success: false, message: 'User ID and contact user ID required' });
      }
      if (uid === contactUserId) {
        return res.status(400).json({ success: false, message: 'You cannot add yourself as a contact.' });
      }
      await db.addContact(uid, contactUserId, nickname);
      return res.json({ success: true, message: 'Contact saved successfully.' });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  },

  // Update / Rename contact nickname
  async updateContact(req, res) {
    try {
      const { contactUserId } = req.params;
      const { nickname, userId } = req.body;
      const uid = req.user?.id || userId || req.query.userId;
      if (!uid || !contactUserId) {
        return res.status(400).json({ success: false, message: 'User ID and contact user ID required' });
      }
      await db.updateContact(uid, contactUserId, nickname);
      return res.json({ success: true, message: 'Contact nickname updated.' });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  },

  // Remove contact
  async removeContact(req, res) {
    try {
      const { contactUserId } = req.params;
      const userId = req.user?.id || req.body.userId || req.query.userId;
      if (!userId || !contactUserId) {
        return res.status(400).json({ success: false, message: 'User ID and contact user ID required' });
      }
      await db.removeContact(userId, contactUserId);
      return res.json({ success: true, message: 'Contact removed.' });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  },

  // Get blocked users
  async getBlockedUsers(req, res) {
    try {
      const userId = req.user?.id || req.query.userId;
      const blocked = await db.getBlockedUsers(userId);
      return res.json({ success: true, blocked });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  },

  // Block user
  async blockUser(req, res) {
    try {
      const { userId, blockedUserId } = req.body;
      const uid = req.user?.id || userId;
      if (!uid || !blockedUserId) {
        return res.status(400).json({ success: false, message: 'User ID and blocked user ID required' });
      }
      await db.blockUser(uid, blockedUserId);
      return res.json({ success: true, message: 'User has been blocked.' });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  },

  // Unblock user
  async unblockUser(req, res) {
    try {
      const { userId, blockedUserId } = req.body;
      const uid = req.user?.id || userId;
      if (!uid || !blockedUserId) {
        return res.status(400).json({ success: false, message: 'User ID and blocked user ID required' });
      }
      await db.unblockUser(uid, blockedUserId);
      return res.json({ success: true, message: 'User has been unblocked.' });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  },

  // E2EE Public Key Management
  async savePublicKey(req, res) {
    try {
      const { userId, publicKey } = req.body;
      const uid = req.user?.id || userId;
      if (!uid || !publicKey) {
        return res.status(400).json({ success: false, message: 'User ID and public key required' });
      }
      await db.savePublicKey(uid, publicKey);
      return res.json({ success: true, message: 'Public key published successfully.' });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  },

  async getPublicKey(req, res) {
    try {
      const { userId } = req.params;
      const publicKey = await db.getPublicKey(userId);
      return res.json({ success: true, publicKey });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }
};

export default userController;