import { Router } from 'express';
import { authController } from '../controllers/authController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.post('/refresh-token', authController.refreshToken);
router.post('/logout', authMiddleware, authController.logout);
router.get('/me', authMiddleware, authController.me);

export default router;
