import { Discount } from '../models/Discount.js';
import { Product } from '../models/Product.js';
import { QuotationTemplate } from '../models/QuotationTemplate.js';
import { Subscription } from '../models/Subscription.js';
import { Tax } from '../models/Tax.js';
import { crudController } from '../utils/crudController.js';

export const productController = crudController({
  model: Product,
  refs: { tax_id: Tax },
  spec: {
    name: { type: 'string', required: true, max: 200 },
    product_type: { type: 'enum', values: ['service', 'goods'], default: 'service', label: 'type' },
    sales_price: { type: 'number', required: true, min: 0 },
    cost_price: { type: 'number', min: 0, default: 0 },
    tax_id: { type: 'int' },
    notes: { type: 'string', max: 2000 },
    is_active: { type: 'bool', default: 1 },
  },
  children: [
    {
      key: 'variants',
      spec: {
        attribute: { type: 'string', required: true, max: 100 },
        value: { type: 'string', required: true, max: 100 },
        extra_price: { type: 'number', default: 0 },
      },
    },
  ],
  async inUse(id) {
    if (
      (await Subscription.exists({ 'lines.product_id': id })) ||
      (await QuotationTemplate.exists({ 'lines.product_id': id })) ||
      (await Discount.exists({ 'products.product_id': id }))
    ) {
      return 'This product is used by a subscription, template or discount.';
    }
  },
});
