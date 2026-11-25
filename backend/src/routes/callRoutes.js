import { Router } from 'express';
import callController from '../controllers/callController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/history', authenticateToken, callController.getCallHistory);
router.post('/log', authenticateToken, callController.logCall);

export default router;
