import { Router } from 'express';
import { authAdvancedController } from '../controllers/authAdvancedController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// Password reset (sin autenticación)
router.post('/forgot-password', authAdvancedController.forgotPassword);
router.post('/reset-password', authAdvancedController.resetPassword);

// Email verification
router.post('/verify-email', authAdvancedController.verifyEmail);

// 2FA (requiere autenticación)
router.post('/2fa/enable/step1', authMiddleware, authAdvancedController.enable2FAStep1);
router.post('/2fa/enable/step2', authMiddleware, authAdvancedController.enable2FAStep2);
router.post('/2fa/disable', authMiddleware, authAdvancedController.disable2FA);

// Sessions
router.get('/sessions', authMiddleware, authAdvancedController.getSessions);
router.post('/sessions/logout', authMiddleware, authAdvancedController.logoutSession);
router.post('/sessions/logout-all', authMiddleware, authAdvancedController.logoutAllSessions);

// Security events
router.get('/security-events', authMiddleware, authAdvancedController.getSecurityEvents);

export default router;
