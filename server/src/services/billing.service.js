import { nextId } from '../config/db.js';
import { Invoice } from '../models/Invoice.js';
import { Plan } from '../models/Plan.js';
import { Subscription } from '../models/Subscription.js';
import { lineAmount, lineTotals, round2 } from '../utils/calculateAmount.js';
import { addDays, addPeriod, today } from '../utils/dates.js';
import { generateInvoiceNumber } from '../utils/generateInvoiceNumber.js';
import { applyDiscounts, consumeDiscounts } from './discount.service.js';

// Prices the invoice lines: discounts first (see discount.service), then tax on what is left.
export async function priceInvoice(sub, subLines, date) {
  const lines = subLines.map((l) => ({
    description: l.description,
    product_id: l.product_id,
    quantity: l.quantity,
    unit_price: l.unit_price,
    tax_rate: l.tax_rate,
    base: lineAmount(l.quantity, l.unit_price),
    discount_amount: 0,
    discount_name: null,
  }));

  const discountIds = await applyDiscounts(lines, sub.discount_id, date);
  for (const line of lines) Object.assign(line, lineTotals(line.base, line.discount_amount, line.tax_rate));

  return {
    lines,
    subtotal: round2(lines.reduce((s, l) => s + l.base, 0)),
    discount_total: round2(lines.reduce((s, l) => s + l.discount_amount, 0)),
    tax_total: round2(lines.reduce((s, l) => s + l.tax_amount, 0)),
    total: round2(lines.reduce((s, l) => s + l.total, 0)),
    discountIds,
  };
}

// Bills the next period of one subscription. Returns the new invoice id, or null if
// nothing is due. `force` bills the next period even if its start date is in the future.
// Two guards make double billing impossible: the period counter only moves forward from
// the value we read, and invoices are unique per (subscription, period start).
export async function billNextPeriod(subscriptionId, { force = false } = {}) {
  const sub = await Subscription.findById(subscriptionId).lean();
  if (!sub || sub.status !== 'active') return null;
  const plan = await Plan.findById(sub.plan_id).lean();
  const now = today();

  const periodStart = addPeriod(sub.start_date, plan.billing_period, sub.periods_billed);
  if (!force && periodStart > now) return null;
  if (sub.expiry_date && periodStart > sub.expiry_date) return null;

  let periodEnd = addDays(addPeriod(sub.start_date, plan.billing_period, sub.periods_billed + 1), -1);
  if (sub.expiry_date && periodEnd > sub.expiry_date) periodEnd = sub.expiry_date;

  const billed = sub.periods_billed + 1;
  const claimed = await Subscription.updateOne(
    { _id: sub._id, status: 'active', periods_billed: sub.periods_billed },
    { $set: { periods_billed: billed, next_invoice_date: addPeriod(sub.start_date, plan.billing_period, billed) } },
  );
  if (!claimed.modifiedCount) return null;

  const subLines = [...sub.lines].sort((a, b) => Number(b.is_plan) - Number(a.is_plan) || a._id - b._id);
  const priced = await priceInvoice(sub, subLines, now);
  const invoiceDate = periodStart > now ? now : periodStart;
  const invoiceId = await nextId('invoices');
  const firstLine = await nextId('invoices.lines', priced.lines.length);

  try {
    await Invoice.create({
      _id: invoiceId,
      number: generateInvoiceNumber(invoiceId),
      subscription_id: sub._id,
      subscription_number: sub.number,
      customer_id: sub.customer_id,
      customer_name: sub.customer_name,
      customer_email: sub.customer_email,
      period_start: periodStart,
      period_end: periodEnd,
      invoice_date: invoiceDate,
      due_date: addDays(invoiceDate, sub.payment_terms_days),
      subtotal: priced.subtotal,
      discount_total: priced.discount_total,
      tax_total: priced.tax_total,
      total: priced.total,
      discount_ids: priced.discountIds,
      lines: priced.lines.map((l, i) => ({
        _id: firstLine - priced.lines.length + 1 + i,
        description: l.description,
        quantity: l.quantity,
        unit_price: l.unit_price,
        discount_amount: l.discount_amount,
        discount_name: l.discount_name,
        tax_rate: l.tax_rate,
        tax_amount: l.tax_amount,
        total: l.total,
      })),
    });
  } catch (err) {
    if (err.code === 11000) return null; // this period already has an invoice
    // Give the period back so the next run retries it.
    await Subscription.updateOne(
      { _id: sub._id, periods_billed: billed },
      { $set: { periods_billed: sub.periods_billed, next_invoice_date: periodStart } },
    );
    throw err;
  }

  await consumeDiscounts(priced.discountIds);
  return invoiceId;
}

// Billing day: activates confirmed subscriptions that have started and creates every invoice that is due.
export async function runBilling() {
  const now = today();

  // Native driver call: an update pipeline copies start_date into next_invoice_date.
  const activated = (
    await Subscription.collection.updateMany({ status: 'confirmed', start_date: { $lte: now } }, [
      { $set: { status: 'active', periods_billed: 0, next_invoice_date: '$start_date' } },
    ])
  ).modifiedCount;

  const due = await Subscription.find({ status: 'active', next_invoice_date: { $lte: now } }, { _id: 1 }).lean();

  let created = 0;
  for (const { _id } of due) {
    // Catch up on missed periods, with a safety cap.
    for (let i = 0; i < 400; i++) {
      const before = (await Subscription.findById(_id, { periods_billed: 1 }).lean()).periods_billed;
      if (await billNextPeriod(_id)) created++;
      const after = (await Subscription.findById(_id, { periods_billed: 1 }).lean()).periods_billed;
      if (after === before) break;
    }
  }
  return { activated, created };
}
