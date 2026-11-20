import { Router } from 'express';
import multer from 'multer';
import memoryVaultController from '../controllers/memoryVaultController.js';

// Memory storage keeps file in memory buffer so it can be streamed to MEGA
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB limit
});

const router = Router();

router.get('/', memoryVaultController.getMemories);
router.post('/upload', upload.single('file'), memoryVaultController.uploadMemory);
router.delete('/:memoryId', memoryVaultController.deleteMemory);

export default router;
