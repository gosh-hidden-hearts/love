import db from '../repositories/databaseRepository.js';

export const callController = {
  async getCallHistory(req, res) {
    try {
      const calls = await db.getCallHistory(req.user.id);
      return res.json({ success: true, calls });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  },

  async logCall(req, res) {
    try {
      const { callerId, receiverId, callType, callStatus, durationSeconds } = req.body;
      const uid = req.user.id;
      if (callerId !== uid && receiverId !== uid) {
        return res.status(403).json({
          success: false,
          message: 'Forbidden: Call log must involve the authenticated user.'
        });
      }

      const saved = await db.saveCallLog({
        callerId,
        receiverId,
        callType,
        callStatus,
        durationSeconds
      });
      return res.json({ success: true, call: saved });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }
};

export default callController;
