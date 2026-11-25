import { Router } from 'express';
import conversationController from '../controllers/conversationController.js';
import { optionalAuth } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/', optionalAuth, conversationController.getConversations);
router.post('/', optionalAuth, conversationController.createConversation);
router.post('/group', optionalAuth, conversationController.createGroup);

export default router;