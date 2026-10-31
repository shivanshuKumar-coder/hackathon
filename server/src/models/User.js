import mongoose from 'mongoose';
import { makeSchema } from '../config/db.js';
import { ROLES } from '../utils/validation.js';

export const User = mongoose.model(
  'User',
  makeSchema({
    name: { type: String, required: true },
    // Stored lowercased, so the unique index makes emails unique regardless of case.
    email: { type: String, required: true, unique: true },
    password_hash: { type: String, required: true },
    role: { type: String, enum: ROLES, required: true, index: true },
    is_active: { type: Boolean, default: true },
  }),
);
