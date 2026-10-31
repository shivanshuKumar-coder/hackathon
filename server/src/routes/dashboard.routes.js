import { Router } from 'express';
import { summary } from '../controllers/dashboard.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { requireRole } from '../middlewares/role.middleware.js';

const router = Router();
router.get('/summary', requireAuth, requireRole('admin', 'staff'), summary);
export default router;
