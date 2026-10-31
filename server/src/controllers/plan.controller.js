import { Plan } from '../models/Plan.js';
import { QuotationTemplate } from '../models/QuotationTemplate.js';
import { Subscription } from '../models/Subscription.js';
import { Tax } from '../models/Tax.js';
import { crudController } from '../utils/crudController.js';
import { BILLING_PERIODS } from '../utils/dates.js';
import { fail } from '../utils/http.js';

export const planController = crudController({
  model: Plan,
  refs: { tax_id: Tax },
  spec: {
    name: { type: 'string', required: true, max: 200 },
    price: { type: 'number', required: true, min: 0 },
    billing_period: { type: 'enum', values: BILLING_PERIODS, required: true },
    min_quantity: { type: 'int', min: 1, default: 1, label: 'minimum quantity' },
    start_date: { type: 'date' },
    end_date: { type: 'date' },
    tax_id: { type: 'int' },
    auto_close: { type: 'bool', default: 0 },
    closable: { type: 'bool', default: 1 },
    pausable: { type: 'bool', default: 0 },
    renewable: { type: 'bool', default: 1 },
    is_active: { type: 'bool', default: 1 },
  },
  validate(data) {
    if (data.start_date && data.end_date && data.end_date < data.start_date) {
      fail(400, 'End date must be on or after the start date');
    }
  },
  async inUse(id) {
    if ((await Subscription.exists({ plan_id: id })) || (await QuotationTemplate.exists({ plan_id: id }))) {
      return 'This plan is used by a subscription or template.';
    }
  },
});
