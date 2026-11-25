import db from '../repositories/databaseRepository.js';

export const settingsController = {
  async getSettings(req, res) {
    try {
      const { userId } = req.params;
      const settings = await db.getUserSettings(userId);
      return res.json({ success: true, settings });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  },

  async updateSettings(req, res) {
    try {
      const { userId } = req.params;
      const newSettings = req.body;
      const updated = await db.updateUserSettings(userId, newSettings);
      return res.json({ success: true, settings: updated, message: 'Settings saved.' });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  },

  async verifyPasscode(req, res) {
    try {
      const { userId } = req.params;
      const { passcode } = req.body;
      const isValid = await db.verifyUserPasscode(userId, passcode);
      return res.json({ success: isValid, valid: isValid });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }
};

export default settingsController;
