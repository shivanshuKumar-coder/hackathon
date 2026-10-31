import bcrypt from 'bcryptjs';
import { config } from '../config/env.js';
import { nextId } from '../config/db.js';
import { User } from '../models/User.js';
import { normalizeEmail, validateNewUser } from '../utils/validation.js';

const BCRYPT_ROUNDS = 10;

export class EmailTakenError extends Error {
  constructor() {
    super('An account with this email already exists');
  }
}

// Shape sent to the client. Never includes the password hash.
export function publicUser(row) {
  if (!row) return null;
  return {
    id: row._id,
    name: row.name,
    email: row.email,
    role: row.role,
    isActive: Boolean(row.is_active),
    createdAt: row.created_at,
  };
}

export function findUserByEmail(email) {
  return User.findOne({ email: normalizeEmail(email) }).lean();
}

export function findUserById(id) {
  return User.findById(id).lean();
}

export async function createUser({ name, email, password, role }) {
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  try {
    const doc = await User.create({
      _id: await nextId('users'),
      name: name.trim(),
      email: normalizeEmail(email),
      password_hash: passwordHash,
      role,
    });
    return doc.toObject();
  } catch (err) {
    if (err.code === 11000) throw new EmailTakenError();
    throw err;
  }
}

export async function setPassword(userId, password) {
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  await User.updateOne({ _id: userId }, { $set: { password_hash: passwordHash } });
}

export function checkPassword(user, password) {
  return bcrypt.compare(password, user.password_hash);
}

// Creates the first admin from ADMIN_EMAIL / ADMIN_PASSWORD if no admin exists yet.
export async function ensureAdmin() {
  if (await User.exists({ role: 'admin' })) return;

  const { name, email, password } = config.admin;
  if (!email || !password) {
    console.warn('[seed] No admin exists. Set ADMIN_EMAIL and ADMIN_PASSWORD in server/.env to create one.');
    return;
  }
  const error = validateNewUser({ name, email, password });
  if (error) {
    console.warn(`[seed] Admin not created: ${error}`);
    return;
  }
  await createUser({ name, email, password, role: 'admin' });
  console.log(`[seed] Admin account created for ${email}`);
}
