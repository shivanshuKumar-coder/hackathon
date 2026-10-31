import { plain } from '../config/db.js';
import { Invoice } from '../models/Invoice.js';
import { Subscription } from '../models/Subscription.js';
import { getInvoiceDetail, listInvoices } from '../services/invoice.service.js';
import { applyAction, getSubscriptionDetail } from '../services/subscription.service.js';
import { round2 } from '../utils/calculateAmount.js';
import { fail } from '../utils/http.js';

// Customer portal: a customer only ever sees their own subscriptions and invoices.

async function ownSubscription(req) {
  const sub = await getSubscriptionDetail(Number(req.params.id), 'customer');
  if (sub.customer_id !== req.user.id || sub.status === 'draft') fail(404, 'Subscription not found');
  return sub;
}

export async function summary(req, res) {
  const [subs, due] = await Promise.all([
    Subscription.countDocuments({ customer_id: req.user.id, status: { $in: ['active', 'paused'] } }),
    Invoice.aggregate([
      { $match: { customer_id: req.user.id, status: 'confirmed' } },
      { $group: { _id: null, n: { $sum: 1 }, sum: { $sum: { $subtract: ['$total', '$amount_paid'] } } } },
    ]),
  ]);
  res.json({ activeSubscriptions: subs, unpaidInvoices: due[0]?.n ?? 0, amountDue: round2(due[0]?.sum ?? 0) });
}

export async function mySubscriptions(req, res) {
  const items = await Subscription.find(
    { customer_id: req.user.id, status: { $ne: 'draft' } },
    {
      number: 1, status: 1, start_date: 1, expiry_date: 1, next_invoice_date: 1, recurring_total: 1,
      quotation_valid_until: 1, plan_name: 1, billing_period: 1,
    },
  )
    .sort({ _id: -1 })
    .lean();
  res.json({ items: plain(items) });
}

export async function mySubscription(req, res) {
  res.json({ item: await ownSubscription(req) });
}

export async function subscriptionAction(req, res) {
  const sub = await ownSubscription(req);
  await applyAction(sub.id, req.body?.action, 'customer');
  res.json({ item: await getSubscriptionDetail(sub.id, 'customer') });
}

export async function myInvoices(req, res) {
  res.json(await listInvoices(req.query, { customer_id: req.user.id, status: { $ne: 'draft' } }));
}

export async function myInvoice(req, res) {
  const inv = await getInvoiceDetail(Number(req.params.id));
  if (inv.customer_id !== req.user.id || inv.status === 'draft') fail(404, 'Invoice not found');
  res.json({ item: inv });
}
