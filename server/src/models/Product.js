import mongoose from 'mongoose';
import { childSchema, makeSchema } from '../config/db.js';

export const Product = mongoose.model(
  'Product',
  makeSchema({
    name: { type: String, required: true },
    product_type: { type: String, enum: ['service', 'goods'], default: 'service' },
    sales_price: { type: Number, required: true, min: 0 },
    cost_price: { type: Number, default: 0, min: 0 },
    tax_id: { type: Number, default: null },
    notes: { type: String, default: null },
    is_active: { type: Boolean, default: true },
    // e.g. { attribute: 'Brand', value: 'Odoo', extra_price: 560 }
    variants: [
      childSchema({
        attribute: { type: String, required: true },
        value: { type: String, required: true },
        extra_price: { type: Number, default: 0 },
      }),
    ],
  }),
);
