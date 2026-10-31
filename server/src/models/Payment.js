import mongoose from 'mongoose';
import { makeSchema } from '../config/db.js';

export const PAYMENT_METHODS = ['cash', 'bank_transfer', 'card', 'upi', 'cheque', 'other'];

const paymentSchema = makeSchema({
  invoice_id: { type: Number, required: true, index: true },
  invoice_number: String,
  customer_id: Number,
  customer_name: String,
  method: { type: String, enum: PAYMENT_METHODS, required: true },
  amount: { type: Number, required: true, min: 0.01 },
  payment_date: { type: String, required: true, index: true },
  note: { type: String, default: null },
  created_by: { type: Number, default: null },
});

export const Payment = mongoose.model('Payment', paymentSchema);
