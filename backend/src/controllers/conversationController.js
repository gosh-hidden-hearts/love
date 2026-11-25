import db from '../repositories/databaseRepository.js';

export const conversationController = {
  // Get all direct & group conversations for authenticated user
  async getConversations(req, res) {
    try {
      const convs = await db.getConversationsForUser(req.user.id);
      return res.json({ success: true, conversations: convs });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  },

  // Create or return existing direct conversation
  async createConversation(req, res) {
    try {
      const { partnerId, name, avatarUrl } = req.body;
      const actualCreatorId = req.user.id;

      if (!partnerId) {
        return res.status(400).json({ success: false, message: 'Partner ID is required.' });
      }

      if (actualCreatorId === partnerId) {
        return res.status(400).json({ success: false, message: 'Cannot start a direct chat with yourself.' });
      }

      const isBlocked = await db.isUserBlocked(actualCreatorId, partnerId);
      if (isBlocked) {
        return res.status(403).json({
          success: false,
          code: 'USER_BLOCKED',
          message: 'Messaging unavailable: One of the users has blocked the other.'
        });
      }

      // Enforce: User can only initiate a conversation with someone saved in their contacts
      const isContact = await db.isContact(actualCreatorId, partnerId);
      if (!isContact) {
        return res.status(403).json({
          success: false,
          code: 'NOT_A_CONTACT',
          message: 'Contact restriction: You can only message users who are saved in your contacts. Please add this user to your contacts first.'
        });
      }

      const conv = await db.createConversation({
        type: 'direct',
        partnerId,
        name,
        avatarUrl,
        creatorId: actualCreatorId,
        members: [actualCreatorId, partnerId]
      });

      return res.json({ success: true, conversation: conv });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  },

  // Create group conversation
  async createGroup(req, res) {
    try {
      const { name, description, avatarUrl, members } = req.body;
      const creatorId = req.user.id;
      if (!name) {
        return res.status(400).json({ success: false, message: 'Group name is required.' });
      }

      const allMembers = Array.from(new Set([creatorId, ...(members || [])].filter(Boolean)));

      const groupConv = await db.createConversation({
        type: 'group',
        name,
        description: description || 'Romantic Soul Group ✨',
        avatarUrl: avatarUrl || `https://api.dicebear.com/7.x/shapes/svg?seed=${encodeURIComponent(name)}`,
        creatorId,
        members: allMembers,
        lastMessageText: `Group "${name}" was created`
      });

      return res.json({ success: true, group: groupConv });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }
};

export default conversationController;
