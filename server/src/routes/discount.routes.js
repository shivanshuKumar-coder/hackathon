import { Router } from 'express';
import { discountController } from '../controllers/discount.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { requireRole } from '../middlewares/role.middleware.js';

const read = requireRole('admin', 'staff');
const write = requireRole('admin');

const router = Router();
router.use(requireAuth);
router.get('/', read, discountController.list);
router.get('/:id', read, discountController.get);
router.post('/', write, discountController.create);
router.put('/:id', write, discountController.update);
router.delete('/:id', write, discountController.remove);
export default router;
