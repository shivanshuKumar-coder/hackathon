import { Router } from 'express';
import * as users from '../controllers/user.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { requireRole } from '../middlewares/role.middleware.js';

// /api/users: admin only
export const usersRouter = Router();
usersRouter.use(requireAuth, requireRole('admin'));
usersRouter.get('/', users.listUsers);
usersRouter.post('/staff', users.createStaff);
usersRouter.patch('/:id/status', users.setStatus);

// /api/customers: admin and staff
export const customersRouter = Router();
customersRouter.use(requireAuth, requireRole('admin', 'staff'));
customersRouter.get('/', users.listCustomers);
customersRouter.post('/', users.createCustomer);
customersRouter.get('/:id', users.getCustomer);
