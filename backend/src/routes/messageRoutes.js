import { Router } from 'express';
import messageController from '../controllers/messageController.js';

const router = Router();

router.get('/:conversationId', messageController.getMessages);
router.post('/', messageController.sendMessage);
router.post('/:messageId/reaction', messageController.reactToMessage);
router.delete('/:messageId', messageController.deleteMessage);

export default router;
