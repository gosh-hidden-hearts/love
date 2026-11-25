import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import statusController from '../controllers/statusController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.join(__dirname, '../../uploads');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, `status_${Date.now()}${path.extname(file.originalname)}`)
});
const upload = multer({ storage });

const router = Router();

router.get('/', authenticateToken, statusController.getStatuses);
router.post('/', authenticateToken, upload.single('media'), statusController.createStatus);
router.post('/:statusId/view', authenticateToken, statusController.markViewed);
router.delete('/:statusId', authenticateToken, statusController.deleteStatus);

export default router;
