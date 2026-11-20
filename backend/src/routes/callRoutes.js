import { Router } from 'express';
import callController from '../controllers/callController.js';

const router = Router();

router.get('/history', callController.getCallHistory);
router.post('/log', callController.logCall);

export default router;
