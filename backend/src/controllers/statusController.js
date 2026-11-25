import db from '../repositories/databaseRepository.js';

export const statusController = {
  async getStatuses(req, res) {
    try {
      const { statuses, myStatuses } = await db.getStatuses(req.user.id);
      return res.json({ success: true, statuses, myStatuses });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  },

  async createStatus(req, res) {
    try {
      const { userName, userAvatar, statusType, content, gradient, caption } = req.body;
      const file = req.file;

      const now = new Date();
      const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      const saved = await db.saveStatus({
        userId: req.user.id,
        userName: userName || req.user.username || 'Soul User',
        userAvatar: userAvatar || null,
        type: statusType || 'text',
        content: content || null,
        gradient: gradient || '#2e0854',
        caption: caption || null,
        mediaUrl: file ? `/uploads/${file.filename}` : null,
        createdAt: now.toISOString(),
        expiresAt: expiresAt.toISOString()
      });

      return res.json({ success: true, status: saved });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  },

  async markViewed(req, res) {
    try {
      const { statusId } = req.params;
      const updated = await db.markStatusViewed(statusId, req.user.id);
      return res.json({ success: true, status: updated });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  },

  async deleteStatus(req, res) {
    try {
      const { statusId } = req.params;
      await db.deleteStatus(statusId, req.user.id);
      return res.json({ success: true, message: 'Status deleted successfully' });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }
};

export default statusController;
