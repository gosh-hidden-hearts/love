import { Router } from 'express';
import conversationController from '../controllers/conversationController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/', authenticateToken, conversationController.getConversations);
router.post('/', authenticateToken, conversationController.createConversation);
router.post('/group', authenticateToken, conversationController.createGroup);

export default router;
