import { plain } from '../config/db.js';
import { Invoice } from '../models/Invoice.js';
import { Payment } from '../models/Payment.js';
import { round2 } from '../utils/calculateAmount.js';
import { today } from '../utils/dates.js';
import { contains, fail, pageParams } from '../utils/http.js';
import { releaseDiscounts } from './discount.service.js';
import { sendMail } from './email.service.js';

export async function getInvoiceDetail(id) {
  const inv = await Invoice.findById(id).lean();
  if (!inv) fail(404, 'Invoice not found');
  const payments = await Payment.find({ invoice_id: id }).sort({ payment_date: 1, _id: 1 }).lean();
  return {
    ...plain(inv),
    payments: plain(payments),
    is_overdue: inv.status === 'confirmed' && inv.due_date < today(),
    amount_due: Math.max(0, round2(inv.total - inv.amount_paid)),
  };
}

// Filters shared by the staff list and the customer portal.
export async function listInvoices(query, baseFilter = {}) {
  const { limit, offset, page, pageSize } = pageParams(query);
  const now = today();
  const filter = { ...baseFilter };
  const and = [];
  if (query.status) and.push({ status: String(query.status) });
  if (query.overdue === '1') and.push({ status: 'confirmed', due_date: { $lt: now } });
  if (query.unpaid === '1') and.push({ status: 'confirmed' });
  if (query.customer_id) and.push({ customer_id: Number(query.customer_id) });
  if (query.from) and.push({ invoice_date: { $gte: String(query.from) } });
  if (query.to) and.push({ invoice_date: { $lte: String(query.to) } });
  if (query.q) {
    const re = contains(query.q);
    and.push({ $or: [{ number: re }, { customer_name: re }] });
  }
  if (and.length) filter.$and = [...(filter.$and ?? []), ...and];

  const [total, items] = await Promise.all([
    Invoice.countDocuments(filter),
    Invoice.find(filter, {
      number: 1, status: 1, invoice_date: 1, due_date: 1, total: 1, amount_paid: 1,
      customer_name: 1, subscription_number: 1,
    })
      .sort({ _id: -1 })
      .skip(offset)
      .limit(limit)
      .lean(),
  ]);
  return {
    items: plain(items).map((i) => ({ ...i, is_overdue: i.status === 'confirmed' && i.due_date < now })),
    total,
    page,
    pageSize,
  };
}

export async function confirmDrafts() {
  const result = await Invoice.updateMany({ status: 'draft' }, { $set: { status: 'confirmed' } });
  return result.modifiedCount;
}

export async function confirmInvoice(id) {
  const result = await Invoice.updateOne({ _id: id, status: 'draft' }, { $set: { status: 'confirmed' } });
  if (!result.matchedCount) {
    await getInvoiceDetail(id);
    fail(400, 'Only draft invoices can be confirmed');
  }
}

export async function cancelInvoice(id) {
  const inv = await getInvoiceDetail(id);
  if (!['draft', 'confirmed'].includes(inv.status)) fail(400, `A ${inv.status} invoice cannot be cancelled`);
  if (inv.amount_paid > 0) fail(400, 'This invoice has payments. Remove them before cancelling.');

  const result = await Invoice.updateOne(
    { _id: id, status: { $in: ['draft', 'confirmed'] }, amount_paid: 0 },
    { $set: { status: 'cancelled' } },
  );
  if (!result.modifiedCount) fail(409, 'This invoice changed meanwhile. Reload and try again.');
  await releaseDiscounts(inv.discount_ids);
}

export async function sendInvoice(id) {
  const inv = await getInvoiceDetail(id);
  if (!['confirmed', 'paid'].includes(inv.status)) fail(400, 'Confirm the invoice before sending it');
  await sendMail({
    to: inv.customer_email,
    subject: `Invoice ${inv.number}`,
    text:
      `Hi ${inv.customer_name},\n\nInvoice ${inv.number} for ${inv.subscription_number} ` +
      `(${inv.period_start} to ${inv.period_end}) is ready.\nTotal: ${inv.total.toFixed(2)}\n` +
      `Amount due: ${inv.amount_due.toFixed(2)} by ${inv.due_date}.\n\n` +
      `You can view it in your customer portal.`,
  });
  await Invoice.updateOne({ _id: id }, { $set: { sent_at: new Date() } });
}
