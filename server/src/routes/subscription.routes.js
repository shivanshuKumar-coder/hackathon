import { Router } from 'express';
import * as subs from '../controllers/subscription.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { requireRole } from '../middlewares/role.middleware.js';

// Admin and internal staff manage subscriptions. Customers use /api/portal.
const router = Router();
router.use(requireAuth, requireRole('admin', 'staff'));
router.get('/', subs.listSubscriptions);
router.get('/:id', subs.getSubscription);
router.post('/', subs.create);
router.put('/:id', subs.update);
router.delete('/:id', subs.remove);
router.post('/:id/actions', subs.action);
router.post('/:id/invoice', subs.invoiceNow);
export default router;
