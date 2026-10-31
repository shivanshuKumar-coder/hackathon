import mongoose from 'mongoose';
import { childSchema, makeSchema } from '../config/db.js';

const invoiceSchema = makeSchema({
  number: { type: String, unique: true, sparse: true },
  subscription_id: { type: Number, required: true },
  subscription_number: String,
  customer_id: { type: Number, required: true },
  customer_name: String,
  customer_email: String,
  period_start: { type: String, required: true },
  period_end: { type: String, required: true },
  invoice_date: { type: String, required: true },
  due_date: { type: String, required: true },
  status: { type: String, enum: ['draft', 'confirmed', 'paid', 'cancelled'], default: 'draft' },
  subtotal: { type: Number, default: 0 },
  discount_total: { type: Number, default: 0 },
  tax_total: { type: Number, default: 0 },
  total: { type: Number, default: 0 },
  amount_paid: { type: Number, default: 0 },
  discount_ids: { type: [Number], default: [] },
  sent_at: { type: Date, default: null },
  paid_at: { type: Date, default: null },
  lines: [
    childSchema({
      description: { type: String, required: true },
      quantity: Number,
      unit_price: Number,
      discount_amount: { type: Number, default: 0 },
      discount_name: { type: String, default: null },
      tax_rate: { type: Number, default: 0 },
      tax_amount: { type: Number, default: 0 },
      total: Number,
    }),
  ],
});
// One invoice per subscription per period: billing can never charge a period twice.
invoiceSchema.index({ subscription_id: 1, period_start: 1 }, { unique: true });
invoiceSchema.index({ status: 1, due_date: 1 });
invoiceSchema.index({ customer_id: 1, status: 1 });
invoiceSchema.index({ invoice_date: 1 });

export const Invoice = mongoose.model('Invoice', invoiceSchema);
