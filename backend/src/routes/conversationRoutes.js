import { Router } from 'express';
import conversationController from '../controllers/conversationController.js';

const router = Router();
router.get('/', conversationController.getConversations);

export default router;
