import { Router } from 'express';
import { taxController } from '../controllers/tax.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { requireRole } from '../middlewares/role.middleware.js';

const read = requireRole('admin', 'staff');
const write = requireRole('admin');

const router = Router();
router.use(requireAuth);
router.get('/', read, taxController.list);
router.get('/:id', read, taxController.get);
router.post('/', write, taxController.create);
router.put('/:id', write, taxController.update);
router.delete('/:id', write, taxController.remove);
export default router;
