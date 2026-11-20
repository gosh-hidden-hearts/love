import db from '../repositories/databaseRepository.js';

export const conversationController = {
  async getConversations(req, res) {
    try {
      const { userId } = req.query;
      const convs = await db.getConversationsForUser(userId);
      return res.json({ success: true, conversations: convs });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }
};

export default conversationController;
