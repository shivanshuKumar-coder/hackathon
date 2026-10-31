import { Router } from 'express';
import { listQuotations, templateController as t } from '../controllers/quotation.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { requireRole } from '../middlewares/role.middleware.js';

// /api/catalog/templates: quotation templates, managed by admin and staff
export const templatesRouter = Router();
templatesRouter.use(requireAuth, requireRole('admin', 'staff'));
templatesRouter.get('/', t.list);
templatesRouter.get('/:id', t.get);
templatesRouter.post('/', t.create);
templatesRouter.put('/:id', t.update);
templatesRouter.delete('/:id', t.remove);

// /api/quotations: open quotations
export const quotationsRouter = Router();
quotationsRouter.use(requireAuth, requireRole('admin', 'staff'));
quotationsRouter.get('/', listQuotations);
