import { Plan } from '../models/Plan.js';
import { Product } from '../models/Product.js';
import { Tax } from '../models/Tax.js';
import { crudController } from '../utils/crudController.js';

export const taxController = crudController({
  model: Tax,
  spec: {
    name: { type: 'string', required: true, max: 100 },
    rate: { type: 'number', required: true, min: 0, max: 100, label: 'tax rate' },
    is_active: { type: 'bool', default: 1 },
  },
  async inUse(id) {
    if ((await Product.exists({ tax_id: id })) || (await Plan.exists({ tax_id: id }))) {
      return 'This tax is used by a product or plan.';
    }
  },
});
