import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import * as auth from '../controllers/auth.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Too many attempts, please try again in a few minutes' },
});

const router = Router();
router.post('/signup', authLimiter, auth.signup);
router.post('/login', authLimiter, auth.login);
router.post('/logout', auth.logout);
router.get('/me', requireAuth, auth.me);
router.post('/change-password', requireAuth, authLimiter, auth.changePassword);
router.post('/forgot-password', authLimiter, auth.forgotPassword);
router.post('/reset-password', authLimiter, auth.resetPassword);
export default router;
