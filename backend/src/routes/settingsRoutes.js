import { Router } from 'express';
import settingsController from '../controllers/settingsController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/:userId', authenticateToken, settingsController.getSettings);
router.put('/:userId', authenticateToken, settingsController.updateSettings);
router.post('/:userId/verify-passcode', authenticateToken, settingsController.verifyPasscode);

export default router;
