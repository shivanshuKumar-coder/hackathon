import mongoose from 'mongoose';
import { config } from './env.js';

const Counter = mongoose.model(
  'Counter',
  new mongoose.Schema({ _id: String, seq: { type: Number, default: 0 } }, { versionKey: false }),
);

// Numeric ids keep URLs short (/subscriptions/42) and readable numbers (SUB/00042).
// Reserves `count` ids and returns the last one; a batch is (last - count + 1) … last.
export async function nextId(name, count = 1) {
  const c = await Counter.findOneAndUpdate(
    { _id: name },
    { $inc: { seq: count } },
    { upsert: true, returnDocument: 'after' },
  ).lean();
  return c.seq;
}

// Schema with a numeric _id and a created_at timestamp.
export function makeSchema(fields, options = {}) {
  return new mongoose.Schema(
    { _id: Number, ...fields },
    { versionKey: false, timestamps: { createdAt: 'created_at', updatedAt: false }, ...options },
  );
}

// Embedded rows (variants, lines…) also get numeric ids.
export function childSchema(fields) {
  return new mongoose.Schema({ _id: Number, ...fields }, { versionKey: false });
}

// Lean document → API object: `_id` becomes `id`, also inside embedded arrays.
export function plain(doc) {
  if (Array.isArray(doc)) return doc.map(plain);
  if (!doc || typeof doc !== 'object' || doc instanceof Date) return doc;
  const out = {};
  for (const [key, value] of Object.entries(doc)) {
    if (key === '_id') out.id = value;
    else if (Array.isArray(value)) out[key] = value.map((v) => (v && typeof v === 'object' && !(v instanceof Date) ? plain(v) : v));
    else out[key] = value;
  }
  return out;
}

export async function connectDb() {
  mongoose.set('strictQuery', true);
  await mongoose.connect(config.mongoUri);
  await Promise.all(Object.values(mongoose.models).map((m) => m.createIndexes()));
}

export function disconnectDb() {
  return mongoose.disconnect();
}
