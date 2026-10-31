import { plain } from '../config/db.js';
import { Subscription } from '../models/Subscription.js';
import { billNextPeriod } from '../services/billing.service.js';
import {
  applyAction,
  createSubscription,
  getSubscriptionDetail,
  getSubscriptionRow,
  updateSubscription,
} from '../services/subscription.service.js';
import { contains, fail, pageParams } from '../utils/http.js';

export async function listSubscriptions(req, res) {
  const { limit, offset, page, pageSize } = pageParams(req.query);
  const filter = {};
  if (req.query.status) filter.status = String(req.query.status);
  if (req.query.customer_id) filter.customer_id = Number(req.query.customer_id);
  if (req.query.plan_id) filter.plan_id = Number(req.query.plan_id);
  if (req.query.q) {
    const re = contains(req.query.q);
    filter.$or = [{ number: re }, { customer_name: re }, { customer_email: re }];
  }

  const [total, items] = await Promise.all([
    Subscription.countDocuments(filter),
    Subscription.find(filter, {
      number: 1, status: 1, start_date: 1, expiry_date: 1, next_invoice_date: 1, recurring_total: 1,
      customer_name: 1, plan_name: 1, billing_period: 1,
    })
      .sort({ _id: -1 })
      .skip(offset)
      .limit(limit)
      .lean(),
  ]);
  res.json({ items: plain(items), total, page, pageSize });
}

export async function getSubscription(req, res) {
  res.json({ item: await getSubscriptionDetail(Number(req.params.id), req.user.role) });
}

export async function create(req, res) {
  const id = await createSubscription(req.body ?? {}, req.user.id);
  res.status(201).json({ item: await getSubscriptionDetail(id, req.user.role) });
}

export async function update(req, res) {
  const id = Number(req.params.id);
  await updateSubscription(id, req.body ?? {});
  res.json({ item: await getSubscriptionDetail(id, req.user.role) });
}

export async function remove(req, res) {
  const sub = await getSubscriptionRow(Number(req.params.id));
  if (sub.status !== 'draft') fail(400, 'Only drafts can be deleted. Close the subscription instead.');
  await Subscription.deleteOne({ _id: sub._id, status: 'draft' });
  res.json({ ok: true });
}

export async function action(req, res) {
  const id = Number(req.params.id);
  await applyAction(id, req.body?.action, req.user.role);
  res.json({ item: await getSubscriptionDetail(id, req.user.role) });
}

// Creates the invoice for the next period now, even if it is not due yet.
export async function invoiceNow(req, res) {
  const id = Number(req.params.id);
  const sub = await getSubscriptionRow(id);
  if (sub.status !== 'active') fail(400, 'Only active subscriptions can be invoiced');
  const invoiceId = await billNextPeriod(id, { force: true });
  if (!invoiceId) fail(400, 'Nothing left to bill: the subscription has reached its expiry date');
  res.status(201).json({ invoiceId });
}
