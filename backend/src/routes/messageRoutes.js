import { Router } from 'express';
import multer from 'multer';
import messageController from '../controllers/messageController.js';
import { optionalAuth } from '../middleware/authMiddleware.js';

// Memory storage buffers file in memory for direct encrypted streaming to MEGA Cloud Storage
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB limit
});

const router = Router();

router.get('/:conversationId', optionalAuth, messageController.getMessages);
router.post('/', optionalAuth, messageController.sendMessage);
router.post('/upload', optionalAuth, upload.single('file'), messageController.uploadAttachment);
router.post('/:messageId/reaction', optionalAuth, messageController.reactToMessage);
router.delete('/:messageId', optionalAuth, messageController.deleteMessage);

export default router;
