import { Router } from 'express';
import userController from '../controllers/userController.js';

const router = Router();

router.get('/search', userController.searchUsers);
router.get('/profile/:userId', userController.getProfile);
router.put('/profile/:userId', userController.updateProfile);

export default router;
