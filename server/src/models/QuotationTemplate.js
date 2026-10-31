import mongoose from 'mongoose';
import { childSchema, makeSchema } from '../config/db.js';

export const QuotationTemplate = mongoose.model(
  'QuotationTemplate',
  makeSchema({
    name: { type: String, required: true },
    plan_id: { type: Number, required: true },
    validity_days: { type: Number, default: 30, min: 1 },
    notes: { type: String, default: null },
    is_active: { type: Boolean, default: true },
    lines: [
      childSchema({
        product_id: { type: Number, required: true },
        variant_id: { type: Number, default: null },
        quantity: { type: Number, default: 1 },
      }),
    ],
  }),
);
