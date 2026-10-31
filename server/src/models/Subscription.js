import mongoose from 'mongoose';
import { childSchema, makeSchema } from '../config/db.js';
import { BILLING_PERIODS } from '../utils/dates.js';

export const SUBSCRIPTION_STATUSES = ['draft', 'quotation', 'confirmed', 'active', 'paused', 'closed'];

// Customer and plan names are copied onto the subscription so lists and searches
// need no joins and stay fast with thousands of rows.
const subscriptionSchema = makeSchema({
  number: { type: String, unique: true, sparse: true },
  customer_id: { type: Number, required: true },
  customer_name: String,
  customer_email: String,
  plan_id: { type: Number, required: true },
  plan_name: String,
  billing_period: { type: String, enum: BILLING_PERIODS },
  template_id: { type: Number, default: null },
  discount_id: { type: Number, default: null },
  quantity: { type: Number, default: 1 },
  start_date: { type: String, required: true },
  expiry_date: { type: String, default: null },
  payment_terms_days: { type: Number, default: 0 },
  status: { type: String, enum: SUBSCRIPTION_STATUSES, default: 'draft' },
  quotation_valid_until: { type: String, default: null },
  periods_billed: { type: Number, default: 0 },
  next_invoice_date: { type: String, default: null },
  recurring_subtotal: { type: Number, default: 0 },
  recurring_total: { type: Number, default: 0 },
  notes: { type: String, default: null },
  created_by: { type: Number, default: null },
  closed_at: { type: Date, default: null },
  lines: [
    childSchema({
      is_plan: { type: Boolean, default: false },
      product_id: { type: Number, default: null },
      variant_id: { type: Number, default: null },
      description: { type: String, required: true },
      quantity: { type: Number, required: true },
      unit_price: { type: Number, required: true },
      tax_rate: { type: Number, default: 0 },
      amount: { type: Number, required: true },
    }),
  ],
});
subscriptionSchema.index({ status: 1, next_invoice_date: 1 });
subscriptionSchema.index({ customer_id: 1 });
subscriptionSchema.index({ plan_id: 1 });
subscriptionSchema.index({ 'lines.product_id': 1 });

export const Subscription = mongoose.model('Subscription', subscriptionSchema);
