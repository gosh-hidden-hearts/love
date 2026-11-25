import { Router } from 'express';
import userController from '../controllers/userController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/search', authenticateToken, userController.searchUsers);
router.get('/profile/:userId', authenticateToken, userController.getProfile);
router.put('/profile/:userId', authenticateToken, userController.updateProfile);

// Contact Management
router.get('/contacts', authenticateToken, userController.getContacts);
router.post('/contacts', authenticateToken, userController.addContact);
router.put('/contacts/:contactUserId', authenticateToken, userController.updateContact);
router.delete('/contacts/:contactUserId', authenticateToken, userController.removeContact);

// Blocked Users Management
router.get('/blocked', authenticateToken, userController.getBlockedUsers);
router.post('/block', authenticateToken, userController.blockUser);
router.post('/unblock', authenticateToken, userController.unblockUser);

// End-to-End Encryption (E2EE) Public Keys
router.post('/public-key', authenticateToken, userController.savePublicKey);
router.get('/:userId/public-key', authenticateToken, userController.getPublicKey);

export default router;
