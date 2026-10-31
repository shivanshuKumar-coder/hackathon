import mongoose from 'mongoose';
import { makeSchema } from '../config/db.js';

export const Tax = mongoose.model(
  'Tax',
  makeSchema({
    name: { type: String, required: true },
    rate: { type: Number, required: true, min: 0, max: 100 },
    is_active: { type: Boolean, default: true },
  }),
);
