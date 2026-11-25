import { Router } from 'express';
import userController from '../controllers/userController.js';
import { optionalAuth } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/search', userController.searchUsers);
router.get('/profile/:userId', userController.getProfile);
router.put('/profile/:userId', userController.updateProfile);

// Contact Management
router.get('/contacts', optionalAuth, userController.getContacts);
router.post('/contacts', optionalAuth, userController.addContact);
router.put('/contacts/:contactUserId', optionalAuth, userController.updateContact);
router.delete('/contacts/:contactUserId', optionalAuth, userController.removeContact);

// Blocked Users Management
router.get('/blocked', optionalAuth, userController.getBlockedUsers);
router.post('/block', optionalAuth, userController.blockUser);
router.post('/unblock', optionalAuth, userController.unblockUser);

// End-to-End Encryption (E2EE) Public Keys
router.post('/public-key', optionalAuth, userController.savePublicKey);
router.get('/:userId/public-key', userController.getPublicKey);

export default router;