import db from '../repositories/databaseRepository.js';

export const statusController = {
  async getStatuses(req, res) {
    try {
      const { userId } = req.query;
      const { statuses, myStatuses } = await db.getStatuses(userId);
      return res.json({ success: true, statuses, myStatuses });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  },

  async createStatus(req, res) {
    try {
      const { userId, userName, userAvatar, statusType, content, gradient, caption, privacy } = req.body;
      const file = req.file;

      const now = new Date();
      const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      const newStatus = {
        id: 'status-' + Date.now(),
        userId: userId || 'user',
        userName: userName || 'Soul User',
        userAvatar: userAvatar || null,
        type: statusType || 'text',
        content: content || null,
        gradient: gradient || null,
        caption: caption || null,
        mediaUrl: file ? `/uploads/${file.filename}` : null,
        privacy: privacy || 'contacts',
        createdAt: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
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
    try {
      const { statusId } = req.params;
      const { viewerId, viewerName } = req.body;
      const updated = await db.markStatusViewed(statusId, viewerId, viewerName);
      return res.json({ success: true, status: updated });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  },

  async deleteStatus(req, res) {
    try {
      const { statusId } = req.params;
      await db.deleteStatus(statusId);
      return res.json({ success: true, message: 'Status deleted successfully' });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }
};

export default statusController;
