import db from '../repositories/databaseRepository.js';

export const callController = {
  async getCallHistory(req, res) {
    try {
      const { userId } = req.query;
      const calls = await db.getCallHistory(userId);
      return res.json({ success: true, calls });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  },

  async logCall(req, res) {
    try {
      const callData = req.body;
      const saved = await db.saveCallLog({
        id: 'call-' + Date.now(),
        ...callData,
        createdAt: new Date().toISOString()
      });
      return res.json({ success: true, call: saved });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }
};

export default callController;
