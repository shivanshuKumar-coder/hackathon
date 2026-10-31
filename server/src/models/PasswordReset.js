import mongoose from 'mongoose';
import { makeSchema } from '../config/db.js';

// Only the SHA-256 of the emailed token is stored.
export const PasswordReset = mongoose.model(
  'PasswordReset',
  makeSchema({
    user_id: { type: Number, required: true, index: true },
    token_hash: { type: String, required: true, unique: true },
    expires_at: { type: Number, required: true },
  }),
);
