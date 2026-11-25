import { Router } from 'express';
import authController from '../controllers/authController.js';

const router = Router();

router.post('/resolve-identifier', authController.resolveIdentifier);
router.post('/check-availability', authController.checkAvailability);
router.post('/send-otp', authController.sendOtp);
router.post('/verify-otp', authController.verifyOtp);
router.post('/login-otp', authController.loginWithOtp);
router.post('/reset-password', authController.resetPassword);
router.post('/sync-user', authController.syncUser);
router.post('/terms-accept', authController.recordTermsAcceptance);

export default router;