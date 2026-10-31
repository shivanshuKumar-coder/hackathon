import { nextId, plain } from '../config/db.js';
import { Invoice } from '../models/Invoice.js';
import { PAYMENT_METHODS, Payment } from '../models/Payment.js';
import { clean } from '../middlewares/validate.middleware.js';
import { round2 } from '../utils/calculateAmount.js';
import { today } from '../utils/dates.js';
import { contains, fail, pageParams } from '../utils/http.js';

const PAYMENT_SPEC = {
  invoice_id: { type: 'int', required: true },
  method: { type: 'enum', values: PAYMENT_METHODS, required: true },
  amount: { type: 'number', required: true, min: 0.01 },
  payment_date: { type: 'date', required: true },
  note: { type: 'string', max: 500 },
};

// Recomputes amount_paid from the payments and flips the invoice between Confirmed and Paid.
async function syncInvoice(invoiceId) {
  const [sum] = await Payment.aggregate([{ $match: { invoice_id: invoiceId } }, { $group: { _id: null, s: { $sum: '$amount' } } }]);
  const paid = round2(sum?.s ?? 0);
  const inv = await Invoice.findById(invoiceId).lean();
  const fullyPaid = paid >= inv.total - 0.005;
  await Invoice.updateOne(
    { _id: invoiceId, status: { $in: ['confirmed', 'paid'] } },
    { $set: { amount_paid: paid, status: fullyPaid ? 'paid' : 'confirmed', paid_at: fullyPaid ? inv.paid_at ?? new Date() : null } },
  );
}

export async function listPayments(query) {
  const { limit, offset, page, pageSize } = pageParams(query);
  const filter = {};
  if (query.method) filter.method = String(query.method);
  if (query.from || query.to) {
    filter.payment_date = {};
    if (query.from) filter.payment_date.$gte = String(query.from);
    if (query.to) filter.payment_date.$lte = String(query.to);
  }
  if (query.q) {
    const re = contains(query.q);
    filter.$or = [{ invoice_number: re }, { customer_name: re }];
  }

  const [summary, items] = await Promise.all([
    Payment.aggregate([{ $match: filter }, { $group: { _id: null, n: { $sum: 1 }, sum: { $sum: '$amount' } } }]),
    Payment.find(filter).sort({ payment_date: -1, _id: -1 }).skip(offset).limit(limit).lean(),
  ]);
  return { items: plain(items), total: summary[0]?.n ?? 0, totalAmount: round2(summary[0]?.sum ?? 0), page, pageSize };
}

export async function recordPayment(body, userId) {
  const data = clean(body, PAYMENT_SPEC);
  data.amount = round2(data.amount);
  if (data.payment_date > today()) fail(400, 'Payment date cannot be in the future');

  const inv = await Invoice.findById(data.invoice_id).lean();
  if (!inv) fail(404, 'Invoice not found');
  if (inv.status === 'draft') fail(400, 'Confirm the invoice before recording a payment');
  if (inv.status === 'cancelled') fail(400, 'This invoice is cancelled');
  if (inv.status === 'paid') fail(400, 'This invoice is already fully paid');

  // Atomic check-and-add: the payment only goes in if it still fits in what is due,
  // so two people recording at once cannot overpay the invoice.
  const reserved = await Invoice.findOneAndUpdate(
    { _id: inv._id, status: 'confirmed', $expr: { $lte: [{ $add: ['$amount_paid', data.amount] }, { $add: ['$total', 0.005] }] } },
    { $inc: { amount_paid: data.amount } },
    { returnDocument: 'after' },
  ).lean();
  if (!reserved) fail(400, `Amount is more than the ${round2(inv.total - inv.amount_paid).toFixed(2)} still due`);

  const payment = await Payment.create({
    _id: await nextId('payments'),
    ...data,
    invoice_number: inv.number,
    customer_id: inv.customer_id,
    customer_name: inv.customer_name,
    created_by: userId,
  });
  await syncInvoice(inv._id);
  return plain(payment.toObject());
}

export async function deletePayment(id) {
  const payment = await Payment.findByIdAndDelete(id).lean();
  if (!payment) fail(404, 'Payment not found');
  await syncInvoice(payment.invoice_id);
}
