import { Router } from 'express';
import * as invoices from '../controllers/invoice.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { requireRole } from '../middlewares/role.middleware.js';

const router = Router();
router.use(requireAuth, requireRole('admin', 'staff'));
router.get('/', invoices.list);
router.post('/run-billing', invoices.runBilling);
router.post('/confirm-drafts', invoices.confirmAllDrafts);
router.get('/:id', invoices.get);
router.post('/:id/confirm', invoices.confirm);
router.post('/:id/cancel', invoices.cancel);
router.post('/:id/send', invoices.send);
export default router;
