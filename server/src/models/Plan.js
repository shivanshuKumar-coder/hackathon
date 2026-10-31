import mongoose from 'mongoose';
import { makeSchema } from '../config/db.js';
import { BILLING_PERIODS } from '../utils/dates.js';

export const Plan = mongoose.model(
  'Plan',
  makeSchema({
    name: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    billing_period: { type: String, enum: BILLING_PERIODS, required: true },
    min_quantity: { type: Number, default: 1, min: 1 },
    start_date: { type: String, default: null },
    end_date: { type: String, default: null },
    tax_id: { type: Number, default: null },
    // What a subscription on this plan may do, decided plan by plan.
    auto_close: { type: Boolean, default: false },
    closable: { type: Boolean, default: true },
    pausable: { type: Boolean, default: false },
    renewable: { type: Boolean, default: true },
    is_active: { type: Boolean, default: true },
  }),
);
