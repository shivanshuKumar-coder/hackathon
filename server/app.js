import cookieParser from 'cookie-parser';
import express from 'express';
import { errorHandler, notFound } from './middlewares/error.middleware.js';
import authRoutes from './routes/auth.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import discountRoutes from './routes/discount.routes.js';
import invoiceRoutes from './routes/invoice.routes.js';
import paymentRoutes from './routes/payment.routes.js';
import planRoutes from './routes/plan.routes.js';
import portalRoutes from './routes/portal.routes.js';
import productRoutes from './routes/product.routes.js';
import { quotationsRouter, templatesRouter } from './routes/quotation.routes.js';
import subscriptionRoutes from './routes/subscription.routes.js';
import taxRoutes from './routes/tax.routes.js';
import { customersRouter, usersRouter } from './routes/user.routes.js';

export const app = express();

app.disable('x-powered-by');
app.use(express.json({ limit: '100kb' }));
app.use(cookieParser());

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.use('/api/auth', authRoutes);
app.use('/api/users', usersRouter);
app.use('/api/customers', customersRouter);
app.use('/api/catalog/products', productRoutes);
app.use('/api/catalog/plans', planRoutes);
app.use('/api/catalog/taxes', taxRoutes);
app.use('/api/catalog/templates', templatesRouter);
app.use('/api/quotations', quotationsRouter);
app.use('/api/discounts', discountRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/reports', dashboardRoutes);
app.use('/api/portal', portalRoutes);

app.use('/api', notFound);
app.use(errorHandler);
