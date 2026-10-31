import { plain } from '../config/db.js';
import { Plan } from '../models/Plan.js';
import { Product } from '../models/Product.js';
import { countQuotations, findQuotations } from '../models/Quotation.js';
import { QuotationTemplate } from '../models/QuotationTemplate.js';
import { Subscription } from '../models/Subscription.js';
import { crudController } from '../utils/crudController.js';
import { today } from '../utils/dates.js';
import { contains, fail, pageParams } from '../utils/http.js';

// Quotation templates: a plan plus product lines, valid for a set number of days.
export const templateController = crudController({
  model: QuotationTemplate,
  refs: { plan_id: Plan },
  spec: {
    name: { type: 'string', required: true, max: 200 },
    plan_id: { type: 'int', required: true },
    validity_days: { type: 'int', min: 1, max: 365, default: 30 },
    notes: { type: 'string', max: 2000 },
    is_active: { type: 'bool', default: 1 },
  },
  children: [
    {
      key: 'lines',
      refs: { product_id: Product },
      spec: {
        product_id: { type: 'int', required: true },
        variant_id: { type: 'int' },
        quantity: { type: 'number', min: 0.01, default: 1 },
      },
    },
  ],
  async validate(data, body) {
    for (const line of body.lines ?? []) {
      if (line.variant_id) {
        const ok = await Product.exists({ _id: Number(line.product_id), 'variants._id': Number(line.variant_id) });
        if (!ok) fail(400, 'A selected variant does not belong to its product');
      }
    }
  },
  async inUse(id) {
    if (await Subscription.exists({ template_id: id })) return 'This template was used for a subscription.';
  },
});

// Open quotations (subscriptions waiting for the customer), with their validity.
export async function listQuotations(req, res) {
  const { limit, offset, page, pageSize } = pageParams(req.query);
  const filter = {};
  if (req.query.q) {
    const re = contains(req.query.q);
    filter.$or = [{ number: re }, { customer_name: re }];
  }
  if (req.query.expired === '1') filter.quotation_valid_until = { $lt: today() };

  const [total, items] = await Promise.all([
    countQuotations(filter),
    findQuotations(filter, {
      number: 1, customer_name: 1, plan_name: 1, billing_period: 1, recurring_total: 1,
      start_date: 1, quotation_valid_until: 1, status: 1,
    })
      .sort({ _id: -1 })
      .skip(offset)
      .limit(limit)
      .lean(),
  ]);
  const now = today();
  res.json({
    items: plain(items).map((q) => ({ ...q, is_expired: Boolean(q.quotation_valid_until && q.quotation_valid_until < now) })),
    total,
    page,
    pageSize,
  });
}
