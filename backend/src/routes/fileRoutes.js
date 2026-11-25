import { Router } from 'express';
import fileController from '../controllers/fileController.js';

const router = Router();

// Stream file inline (for <img src="...">, <video src="...">, <audio src="...">, documents)
router.get('/stream/:nodeId', fileController.streamFile);

// Download file as attachment
router.get('/download/:nodeId', fileController.downloadFile);

// Metadata lookup
router.get('/info/:nodeId', fileController.getFileInfo);

// MEGA status
router.get('/status', fileController.getStorageStatus);

export default router;
