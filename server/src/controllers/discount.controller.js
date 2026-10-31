import { Discount } from '../models/Discount.js';
import { Invoice } from '../models/Invoice.js';
import { Product } from '../models/Product.js';
import { Subscription } from '../models/Subscription.js';
import { crudController } from '../utils/crudController.js';
import { fail } from '../utils/http.js';

export const discountController = crudController({
  model: Discount,
  sort: { _id: -1 },
  spec: {
    name: { type: 'string', required: true, max: 200 },
    discount_type: { type: 'enum', values: ['percent', 'fixed'], required: true, label: 'type' },
    value: { type: 'number', required: true, min: 0 },
    scope: { type: 'enum', values: ['subscription', 'product'], default: 'subscription', label: 'applies to' },
    min_purchase: { type: 'number', min: 0, default: 0, label: 'minimum purchase' },
    min_quantity: { type: 'number', min: 0, default: 0, label: 'minimum quantity' },
    start_date: { type: 'date' },
    end_date: { type: 'date' },
    usage_limit: { type: 'int', min: 1 },
    is_active: { type: 'bool', default: 1 },
  },
  children: [
    {
      key: 'products',
      refs: { product_id: Product },
      spec: { product_id: { type: 'int', required: true } },
    },
  ],
  validate(data, body) {
    if (data.discount_type === 'percent' && data.value > 100) fail(400, 'A percentage discount cannot be over 100');
    if (data.start_date && data.end_date && data.end_date < data.start_date) {
      fail(400, 'End date must be on or after the start date');
    }
    if (data.scope === 'product' && !(body.products ?? []).length) {
      fail(400, 'Pick at least one product for a product discount');
    }
    const ids = (body.products ?? []).map((p) => Number(p.product_id));
    if (new Set(ids).size !== ids.length) fail(400, 'A product is listed twice');
  },
  async inUse(id) {
    if ((await Subscription.exists({ discount_id: id })) || (await Invoice.exists({ discount_ids: id }))) {
      return 'This discount is attached to a subscription or was used on an invoice.';
    }
  },
});
