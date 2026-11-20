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
  }
};

export default userController;
