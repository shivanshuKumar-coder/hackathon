import { Router } from 'express';
import * as payments from '../controllers/payment.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { requireRole } from '../middlewares/role.middleware.js';

const router = Router();
router.use(requireAuth, requireRole('admin', 'staff'));
router.get('/', payments.list);
router.post('/', payments.create);
router.delete('/:id', requireRole('admin'), payments.remove);
export default router;
