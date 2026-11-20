import { Router } from 'express';
import settingsController from '../controllers/settingsController.js';

const router = Router();

router.get('/:userId', settingsController.getSettings);
router.put('/:userId', settingsController.updateSettings);
router.post('/:userId/verify-passcode', settingsController.verifyPasscode);

export default router;
