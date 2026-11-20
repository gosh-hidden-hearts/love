import db from '../repositories/databaseRepository.js';

export const statusController = {
  async getStatuses(req, res) {
    try {
      const statuses = await db.getStatuses();
      return res.json({ success: true, statuses });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  },

  async createStatus(req, res) {
    try {
      const { userId, userName, userAvatar, statusType, content, gradient, caption } = req.body;
      const file = req.file;

      const newStatus = {
        id: 'status-' + Date.now(),
        userId,
        userName,
        userAvatar,
        type: statusType,
        content: content || null,
        gradient: gradient || null,
        caption: caption || null,
        mediaUrl: file ? `/uploads/${file.filename}` : null,
        createdAt: new Date().toISOString(),
        viewsCount: 0,
        viewers: []
      };

      await db.saveStatus(newStatus);
      return res.json({ success: true, status: newStatus });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  },

  async markViewed(req, res) {
    return res.json({ success: true });
  }
};

export default statusController;
