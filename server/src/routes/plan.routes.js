import { Router } from 'express';
import { planController } from '../controllers/plan.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { requireRole } from '../middlewares/role.middleware.js';

const read = requireRole('admin', 'staff');
const write = requireRole('admin');

const router = Router();
router.use(requireAuth);
router.get('/', read, planController.list);
router.get('/:id', read, planController.get);
router.post('/', write, planController.create);
router.put('/:id', write, planController.update);
router.delete('/:id', write, planController.remove);
export default router;
