import { Router } from 'express';
import { productController } from '../controllers/product.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { requireRole } from '../middlewares/role.middleware.js';

const read = requireRole('admin', 'staff');
const write = requireRole('admin');

const router = Router();
router.use(requireAuth);
router.get('/', read, productController.list);
router.get('/:id', read, productController.get);
router.post('/', write, productController.create);
router.put('/:id', write, productController.update);
router.delete('/:id', write, productController.remove);
export default router;
