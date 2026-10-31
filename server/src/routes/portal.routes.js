import { Router } from 'express';
import * as portal from '../controllers/portal.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { requireRole } from '../middlewares/role.middleware.js';

// Customer portal: own subscriptions and invoices only.
const router = Router();
router.use(requireAuth, requireRole('customer'));
router.get('/summary', portal.summary);
router.get('/subscriptions', portal.mySubscriptions);
router.get('/subscriptions/:id', portal.mySubscription);
router.post('/subscriptions/:id/actions', portal.subscriptionAction);
router.get('/invoices', portal.myInvoices);
router.get('/invoices/:id', portal.myInvoice);
export default router;
