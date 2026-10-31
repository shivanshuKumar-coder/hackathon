import { plain } from '../config/db.js';
import { Invoice } from '../models/Invoice.js';
import { Payment } from '../models/Payment.js';
import { Subscription } from '../models/Subscription.js';
import { round2 } from '../utils/calculateAmount.js';
import { MONTHLY_FACTOR, addDays, isDate, today } from '../utils/dates.js';
import { fail } from '../utils/http.js';

const countBy = (rows) => Object.fromEntries(rows.map((r) => [r._id, r.n]));
const sumOf = (rows) => ({ count: rows[0]?.n ?? 0, amount: round2(rows[0]?.sum ?? 0) });

// One call for the whole dashboard. The queries run in parallel on indexed fields,
// so it stays fast with thousands of subscriptions and invoices.
export async function summary(req, res) {
  const now = today();
  const from = req.query.from || `${now.slice(0, 8)}01`;
  const to = req.query.to || now;
  if (!isDate(from) || !isDate(to)) fail(400, 'Invalid date range');
  if (from > to) fail(400, '"From" must be before "to"');
  const sixMonthsAgo = `${addDays(`${now.slice(0, 8)}01`, -155).slice(0, 8)}01`;
  const due = { $subtract: ['$total', '$amount_paid'] };

  const [subsByStatus, mrrRows, revenue, invoiced, outstanding, overdue, invoicesByStatus, byMonth, byMethod, overdueInvoices] =
    await Promise.all([
      Subscription.aggregate([{ $group: { _id: '$status', n: { $sum: 1 } } }]),
      Subscription.aggregate([{ $match: { status: 'active' } }, { $group: { _id: '$billing_period', total: { $sum: '$recurring_total' } } }]),
      Payment.aggregate([{ $match: { payment_date: { $gte: from, $lte: to } } }, { $group: { _id: null, n: { $sum: 1 }, sum: { $sum: '$amount' } } }]),
      Invoice.aggregate([
        { $match: { status: { $ne: 'cancelled' }, invoice_date: { $gte: from, $lte: to } } },
        { $group: { _id: null, n: { $sum: 1 }, sum: { $sum: '$total' } } },
      ]),
      Invoice.aggregate([{ $match: { status: 'confirmed' } }, { $group: { _id: null, n: { $sum: 1 }, sum: { $sum: due } } }]),
      Invoice.aggregate([{ $match: { status: 'confirmed', due_date: { $lt: now } } }, { $group: { _id: null, n: { $sum: 1 }, sum: { $sum: due } } }]),
      Invoice.aggregate([{ $group: { _id: '$status', n: { $sum: 1 } } }]),
      Payment.aggregate([
        { $match: { payment_date: { $gte: sixMonthsAgo } } },
        { $group: { _id: { $substrBytes: ['$payment_date', 0, 7] }, amount: { $sum: '$amount' } } },
        { $sort: { _id: 1 } },
      ]),
      Payment.aggregate([
        { $match: { payment_date: { $gte: from, $lte: to } } },
        { $group: { _id: '$method', amount: { $sum: '$amount' } } },
        { $sort: { amount: -1 } },
      ]),
      Invoice.find({ status: 'confirmed', due_date: { $lt: now } }, { number: 1, due_date: 1, total: 1, amount_paid: 1, customer_name: 1 })
        .sort({ due_date: 1 })
        .limit(10)
        .lean(),
    ]);

  const byStatus = countBy(subsByStatus);
  res.json({
    range: { from, to },
    subscriptions: { byStatus, active: byStatus.active ?? 0 },
    mrr: round2(mrrRows.reduce((sum, r) => sum + r.total * (MONTHLY_FACTOR[r._id] ?? 0), 0)),
    revenue: sumOf(revenue),
    invoiced: sumOf(invoiced),
    outstanding: sumOf(outstanding),
    overdue: sumOf(overdue),
    invoicesByStatus: countBy(invoicesByStatus),
    revenueByMonth: byMonth.map((r) => ({ month: r._id, amount: round2(r.amount) })),
    revenueByMethod: byMethod.map((r) => ({ method: r._id, amount: round2(r.amount) })),
    overdueInvoices: plain(overdueInvoices).map((i) => ({ ...i, amount_due: round2(i.total - i.amount_paid) })),
  });
}
