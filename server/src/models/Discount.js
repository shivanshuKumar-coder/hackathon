import mongoose from 'mongoose';
import { childSchema, makeSchema } from '../config/db.js';

const discountSchema = makeSchema({
  name: { type: String, required: true },
  discount_type: { type: String, enum: ['percent', 'fixed'], required: true },
  value: { type: Number, required: true, min: 0 },
  scope: { type: String, enum: ['subscription', 'product'], default: 'subscription' },
  min_purchase: { type: Number, default: 0 },
  min_quantity: { type: Number, default: 0 },
  start_date: { type: String, default: null },
  end_date: { type: String, default: null },
  usage_limit: { type: Number, default: null },
  used_count: { type: Number, default: 0 },
  is_active: { type: Boolean, default: true },
  products: [childSchema({ product_id: { type: Number, required: true } })],
});
discountSchema.index({ scope: 1, 'products.product_id': 1 });

export const Discount = mongoose.model('Discount', discountSchema);
