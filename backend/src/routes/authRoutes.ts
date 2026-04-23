import { Router } from 'express';
import * as authController from '../controllers/authController';
import { requireAuth } from '../middleware/auth';
import { avatarUpload } from '../middleware/upload';

const router = Router();

router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/me', requireAuth, authController.me);
router.post(
  '/me/avatar',
  requireAuth,
  avatarUpload.single('avatar'),
  authController.uploadAvatar,
);

export default router;
