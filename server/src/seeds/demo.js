// Fills the database with demo data: catalog, customers, ~2000 subscriptions,
// a year of invoices and payments. Run with: npm run seed:demo
// Demo customer accounts all use the password Customer@123 (dev data only).
import bcrypt from 'bcryptjs';
import '../app.js';
import { connectDb, disconnectDb, nextId } from '../config/db.js';
import { runBillingJob } from '../jobs/billing.job.js';
import { Discount } from '../models/Discount.js';
import { Invoice } from '../models/Invoice.js';
import { Payment } from '../models/Payment.js';
import { Plan } from '../models/Plan.js';
import { Product } from '../models/Product.js';
import { QuotationTemplate } from '../models/QuotationTemplate.js';
import { Subscription } from '../models/Subscription.js';
import { Tax } from '../models/Tax.js';
import { User } from '../models/User.js';
import { ensureAdmin } from '../services/user.service.js';
import { round2 } from '../utils/calculateAmount.js';
import { addDays, addPeriod, today } from '../utils/dates.js';
import { generateSubscriptionNumber } from '../utils/generateSubscriptionNumber.js';

const CUSTOMERS = Number(process.env.DEMO_CUSTOMERS) || 300;
const SUBSCRIPTIONS = Number(process.env.DEMO_SUBSCRIPTIONS) || 2000;

await connectDb();
await ensureAdmin();
if (await Subscription.exists({})) {
  console.log('Demo data already present. Drop the database to start fresh.');
  await disconnectDb();
  process.exit(0);
}

let seed = 42;
const rand = () => (seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31;
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const now = today();

async function ids(name, count) {
  const last = await nextId(name, count);
  return Array.from({ length: count }, (_, i) => last - count + 1 + i);
}
const create = async (Model, data) => (await Model.create({ _id: await nextId(Model.collection.name), ...data }))._id;

console.time('seed');

const gst18 = await create(Tax, { name: 'GST 18%', rate: 18 });
const gst5 = await create(Tax, { name: 'GST 5%', rate: 5 });

const [odooId, standardId] = await ids('products.variants', 2);
const crm = await create(Product, {
  name: 'Brightloop CRM', product_type: 'service', sales_price: 1200, cost_price: 300, tax_id: gst18, notes: 'Core CRM seat',
  variants: [
    { _id: odooId, attribute: 'Brand', value: 'Odoo', extra_price: 560 },
    { _id: standardId, attribute: 'Brand', value: 'Standard', extra_price: 0 },
  ],
});
const storage = await create(Product, { name: 'Extra storage (100 GB)', product_type: 'service', sales_price: 250, cost_price: 40, tax_id: gst18 });
const support = await create(Product, { name: 'Priority support', product_type: 'service', sales_price: 900, cost_price: 200, tax_id: gst18 });
const kit = await create(Product, { name: 'Onboarding kit', product_type: 'goods', sales_price: 1500, cost_price: 700, tax_id: gst5 });
const products = [
  { id: crm, name: 'Brightloop CRM', price: 1200, tax: 18 },
  { id: storage, name: 'Extra storage (100 GB)', price: 250, tax: 18 },
  { id: support, name: 'Priority support', price: 900, tax: 18 },
  { id: kit, name: 'Onboarding kit', price: 1500, tax: 5 },
];

const monthly = await create(Plan, { name: 'Starter Monthly', price: 499, billing_period: 'monthly', min_quantity: 1, tax_id: gst18, pausable: true, closable: true, renewable: true });
const yearly = await create(Plan, { name: 'Business Yearly', price: 4999, billing_period: 'yearly', min_quantity: 5, tax_id: gst18, closable: false, renewable: true, auto_close: true });
const weekly = await create(Plan, { name: 'Trial Weekly', price: 99, billing_period: 'weekly', min_quantity: 1, tax_id: gst18, auto_close: true, closable: true });
const plans = [
  { id: monthly, name: 'Starter Monthly', period: 'monthly', price: 499, min: 1 },
  { id: monthly, name: 'Starter Monthly', period: 'monthly', price: 499, min: 1 },
  { id: yearly, name: 'Business Yearly', period: 'yearly', price: 4999, min: 5 },
  { id: weekly, name: 'Trial Weekly', period: 'weekly', price: 99, min: 1 },
];

const tplLines = await ids('quotationtemplates.lines', 2);
await create(QuotationTemplate, {
  name: 'Business bundle', plan_id: yearly, validity_days: 15, notes: 'CRM + support for growing teams',
  lines: [
    { _id: tplLines[0], product_id: crm, quantity: 5 },
    { _id: tplLines[1], product_id: support, quantity: 1 },
  ],
});

const seats = await create(Discount, { name: '10% off for 10+ seats', discount_type: 'percent', value: 10, scope: 'subscription', min_quantity: 10 });
await create(Discount, {
  name: 'Storage launch offer', discount_type: 'fixed', value: 50, scope: 'product', end_date: addDays(now, 60), usage_limit: 5000,
  products: [{ _id: await nextId('discounts.products'), product_id: storage }],
});

const hash = bcrypt.hashSync('Customer@123', 10);
const customerIds = await ids('users', CUSTOMERS);
const customers = customerIds.map((id, i) => ({ _id: id, name: `Customer ${i + 1}`, email: `customer${i + 1}@demo.test`, password_hash: hash, role: 'customer' }));
await User.insertMany(customers);

const statuses = ['active', 'active', 'active', 'active', 'active', 'paused', 'closed', 'confirmed', 'quotation', 'draft'];
const subIds = await ids('subscriptions', SUBSCRIPTIONS);
const lineIds = await ids('subscriptions.lines', SUBSCRIPTIONS * 2);
const subs = subIds.map((id, i) => {
  const plan = pick(plans);
  const status = pick(statuses);
  const customer = pick(customers);
  const quantity = plan.min + Math.floor(rand() * 12);
  const start = addDays(now, -Math.floor(rand() * 330));
  const expiry = plan.period === 'weekly' ? addPeriod(start, 'weekly', 8) : plan.period === 'yearly' ? addPeriod(start, 'yearly', 2) : null;
  const extra = pick(products);
  const lines = [
    { _id: lineIds[2 * i], is_plan: true, description: `${plan.name} (${plan.period})`, quantity, unit_price: plan.price, tax_rate: 18 },
    { _id: lineIds[2 * i + 1], is_plan: false, product_id: extra.id, description: extra.name, quantity: 1 + Math.floor(rand() * 3), unit_price: extra.price, tax_rate: extra.tax },
  ].map((l) => ({ ...l, amount: round2(l.quantity * l.unit_price) }));
  return {
    _id: id,
    number: generateSubscriptionNumber(id),
    customer_id: customer._id,
    customer_name: customer.name,
    customer_email: customer.email,
    plan_id: plan.id,
    plan_name: plan.name,
    billing_period: plan.period,
    discount_id: quantity >= 10 ? seats : null,
    quantity,
    start_date: status === 'confirmed' ? addDays(now, 1 + Math.floor(rand() * 20)) : start,
    expiry_date: expiry,
    payment_terms_days: pick([0, 15, 30]),
    // Paused and closed ones are billed up to now first, then get their real status back below.
    status: ['paused', 'closed'].includes(status) ? 'active' : status,
    seed_status: status,
    quotation_valid_until: status === 'quotation' ? addDays(now, 15) : null,
    next_invoice_date: ['active', 'paused', 'closed'].includes(status) ? start : null,
    lines,
    recurring_subtotal: round2(lines.reduce((s, l) => s + l.amount, 0)),
    recurring_total: round2(lines.reduce((s, l) => s + l.amount * (1 + l.tax_rate / 100), 0)),
  };
});
await Subscription.insertMany(subs.map(({ seed_status, ...s }) => s));

const result = await runBillingJob();
console.log('Invoices created:', result.created);
const restore = subs.filter((s) => ['paused', 'closed'].includes(s.seed_status));
await Subscription.bulkWrite(
  restore.map((s) => ({ updateOne: { filter: { _id: s._id }, update: { $set: { status: s.seed_status } } } })),
);

// Confirm all invoices, pay most of the older ones.
await Invoice.updateMany({}, { $set: { status: 'confirmed' } });
const methods = ['bank_transfer', 'upi', 'card', 'cash', 'cheque'];
const invoices = await Invoice.find({}, { total: 1, invoice_date: 1, due_date: 1, number: 1, customer_id: 1, customer_name: 1 }).lean();
const payments = [];
const updates = [];
for (const inv of invoices) {
  const r = rand();
  const recent = inv.due_date >= now;
  const base = { invoice_id: inv._id, invoice_number: inv.number, customer_id: inv.customer_id, customer_name: inv.customer_name, method: pick(methods) };
  if (r < (recent ? 0.35 : 0.85)) {
    let payDate = addDays(inv.invoice_date, Math.floor(rand() * 20));
    if (payDate > now) payDate = now;
    payments.push({ ...base, amount: inv.total, payment_date: payDate, note: 'Demo payment' });
    updates.push({ updateOne: { filter: { _id: inv._id }, update: { $set: { status: 'paid', amount_paid: inv.total, paid_at: new Date(payDate) } } } });
  } else if (r < 0.9 && inv.total > 0) {
    const part = round2(inv.total * 0.5);
    payments.push({ ...base, amount: part, payment_date: inv.invoice_date, note: 'Part payment' });
    updates.push({ updateOne: { filter: { _id: inv._id }, update: { $set: { amount_paid: part } } } });
  }
}
const paymentIds = await ids('payments', payments.length);
await Payment.insertMany(payments.map((p, i) => ({ _id: paymentIds[i], ...p })));
await Invoice.bulkWrite(updates);

console.timeEnd('seed');
console.log('Demo data ready.');
await disconnectDb();
