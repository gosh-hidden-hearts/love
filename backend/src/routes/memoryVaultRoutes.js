import { Router } from 'express';
import multer from 'multer';
import memoryVaultController from '../controllers/memoryVaultController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }
});

const router = Router();

router.get('/', authenticateToken, memoryVaultController.getMemories);
router.post('/upload', authenticateToken, upload.single('file'), memoryVaultController.uploadMemory);
router.delete('/:memoryId', authenticateToken, memoryVaultController.deleteMemory);

export default router;
