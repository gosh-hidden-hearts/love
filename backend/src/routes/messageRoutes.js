import { Router } from 'express';
import multer from 'multer';
import messageController from '../controllers/messageController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }
});

const router = Router();

router.get('/:conversationId', authenticateToken, messageController.getMessages);
router.post('/', authenticateToken, messageController.sendMessage);
router.post('/upload', authenticateToken, upload.single('file'), messageController.uploadAttachment);
router.post('/:messageId/reaction', authenticateToken, messageController.reactToMessage);
router.delete('/:messageId', authenticateToken, messageController.deleteMessage);

export default router;
