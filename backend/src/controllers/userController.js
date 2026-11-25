import db from '../repositories/databaseRepository.js';

export const userController = {
  // Search users for contact discovery (excludes current user)
  async searchUsers(req, res) {
    try {
      const { q } = req.query;
      const users = await db.searchUsers(q, req.user.id);
      return res.json({ success: true, users });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  },

  // Get user profile
  async getProfile(req, res) {
    try {
      const { userId } = req.params;
      const targetId = userId === 'me' ? req.user.id : userId;
      const user = await db.findUserById(targetId);
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      // Never leak private email/mobile of other users
      const sanitizedUser = targetId === req.user.id
        ? user
        : {
            id: user.id,
            username: user.username,
            status: user.status,
            user_profiles: user.user_profiles
          };

      return res.json({ success: true, user: sanitizedUser, profile: user.user_profiles });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  },

  // Update own profile only
  async updateProfile(req, res) {
    try {
      const { userId } = req.params;
      if (userId !== req.user.id) {
        return res.status(403).json({ success: false, message: 'Forbidden: You can only update your own profile.' });
      }

      const { displayName, username, mobile, bio, relationshipStatus, anniversaryDate, avatarUrl } = req.body;

      await db.updateUserProfile(req.user.id, {
        display_name: displayName,
        username,
        mobile,
        avatar_url: avatarUrl,
        bio,
        relationship_status: relationshipStatus,
        anniversary_date: anniversaryDate || null
      });

      const updated = await db.findUserById(req.user.id);
      return res.json({
        success: true,
        message: 'Profile updated successfully.',
        user: updated,
        profile: updated?.user_profiles || null
      });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  },

  // Get user contacts
  async getContacts(req, res) {
    try {
      const contacts = await db.getContacts(req.user.id);
      return res.json({ success: true, contacts });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  },

  // Add contact
  async addContact(req, res) {
    try {
      const { contactUserId, nickname } = req.body;
      const uid = req.user.id;
      if (!contactUserId) {
        return res.status(400).json({ success: false, message: 'Contact user ID required' });
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
      const { nickname } = req.body;
      await db.updateContact(req.user.id, contactUserId, nickname);
      return res.json({ success: true, message: 'Contact nickname updated.' });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  },

  // Remove contact
  async removeContact(req, res) {
    try {
      const { contactUserId } = req.params;
      await db.removeContact(req.user.id, contactUserId);
      return res.json({ success: true, message: 'Contact removed.' });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  },

  // Get blocked users
  async getBlockedUsers(req, res) {
    try {
      const blocked = await db.getBlockedUsers(req.user.id);
      return res.json({ success: true, blocked });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  },

  // Block user
  async blockUser(req, res) {
    try {
      const { blockedUserId } = req.body;
      if (!blockedUserId) {
        return res.status(400).json({ success: false, message: 'Blocked user ID required' });
      }
      await db.blockUser(req.user.id, blockedUserId);
      return res.json({ success: true, message: 'User has been blocked.' });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  },

  // Unblock user
  async unblockUser(req, res) {
    try {
      const { blockedUserId } = req.body;
      if (!blockedUserId) {
        return res.status(400).json({ success: false, message: 'Blocked user ID required' });
      }
      await db.unblockUser(req.user.id, blockedUserId);
      return res.json({ success: true, message: 'User has been unblocked.' });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  },

  // E2EE Public Key Management
  async savePublicKey(req, res) {
    try {
      const { publicKey } = req.body;
      if (!publicKey) {
        return res.status(400).json({ success: false, message: 'Public key required' });
      }
      await db.savePublicKey(req.user.id, publicKey);
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
