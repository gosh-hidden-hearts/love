import db from '../repositories/databaseRepository.js';

export const messageController = {
  async getMessages(req, res) {
    try {
      const { conversationId } = req.params;
      const messages = await db.getMessages(conversationId);
      return res.json({ success: true, messages });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  },

  async sendMessage(req, res) {
    try {
      const msg = req.body;
      const saved = await db.saveMessage(msg);
      return res.json({ success: true, message: saved });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  },

  async reactToMessage(req, res) {
    try {
      const { messageId } = req.params;
      const { reaction } = req.body;
      return res.json({ success: true });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  },

  async deleteMessage(req, res) {
    try {
      const { messageId } = req.params;
      return res.json({ success: true });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }
};

export default messageController;
