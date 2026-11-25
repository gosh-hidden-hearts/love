import db from '../repositories/databaseRepository.js';

export const settingsController = {
  async getSettings(req, res) {
    try {
      const { userId } = req.params;
      if (userId !== req.user.id && userId !== 'me') {
        return res.status(403).json({ success: false, message: 'Forbidden: Cannot access another user settings.' });
      }
      const settings = await db.getUserSettings(req.user.id);
      return res.json({ success: true, settings });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  },

  async updateSettings(req, res) {
    try {
      const { userId } = req.params;
      if (userId !== req.user.id && userId !== 'me') {
        return res.status(403).json({ success: false, message: 'Forbidden: Cannot update another user settings.' });
      }
      const updated = await db.updateUserSettings(req.user.id, req.body);
      return res.json({ success: true, settings: updated, message: 'Settings saved.' });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  },

  async verifyPasscode(req, res) {
    try {
      const { userId } = req.params;
      if (userId !== req.user.id && userId !== 'me') {
        return res.status(403).json({ success: false, message: 'Forbidden' });
      }
      const { passcode } = req.body;
      const isValid = await db.verifyUserPasscode(req.user.id, passcode);
      return res.json({ success: isValid, valid: isValid });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }
};

export default settingsController;
