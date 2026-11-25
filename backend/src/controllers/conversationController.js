import db from '../repositories/databaseRepository.js';

export const conversationController = {
  // Get all direct & group conversations for user
  async getConversations(req, res) {
    try {
      const { userId } = req.query;
      const convs = await db.getConversationsForUser(userId);
      return res.json({ success: true, conversations: convs });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  },

  // Create direct conversation
  async createConversation(req, res) {
    try {
      const { partnerId, name, avatarUrl, creatorId } = req.body;
      const actualCreatorId = req.user?.id || creatorId;

      if (!actualCreatorId || !partnerId) {
        return res.status(400).json({ success: false, message: 'Creator and partner IDs are required.' });
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
        members: [actualCreatorId, partnerId].filter(Boolean)
      });
      return res.json({ success: true, conversation: conv });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  },

  // Create group conversation
  async createGroup(req, res) {
    try {
      const { name, description, avatarUrl, creatorId, members } = req.body;
      if (!name) {
        return res.status(400).json({ success: false, message: 'Group name is required.' });
      }

      const allMembers = Array.from(new Set([creatorId, ...(members || [])].filter(Boolean)));

      const groupConv = await db.createConversation({
        id: 'group-' + Date.now(),
        type: 'group',
        name,
        description: description || 'Romantic Soul Group ✨',
        avatarUrl: avatarUrl || `https://api.dicebear.com/7.x/shapes/svg?seed=${name}`,
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