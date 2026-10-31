import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { config } from '../config/env.js';
import { nextId } from '../config/db.js';
import { clearAuthCookie, setAuthCookie } from '../middlewares/auth.middleware.js';
import { PasswordReset } from '../models/PasswordReset.js';
import { sendMail } from '../services/email.service.js';
import {
  EmailTakenError,
  checkPassword,
  createUser,
  findUserByEmail,
  findUserById,
  publicUser,
  setPassword,
} from '../services/user.service.js';
import { normalizeEmail, passwordErrors, validateNewUser } from '../utils/validation.js';

// Compared against when the email is unknown, so login takes the same time either way.
const DUMMY_HASH = bcrypt.hashSync('dummy-password-for-timing', 10);

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

// Public sign-up always creates a customer. Staff are created by the admin (see user.controller.js).
export async function signup(req, res) {
  const { name, email, password } = req.body ?? {};
  const error = validateNewUser({ name, email, password });
  if (error) return res.status(400).json({ error });

  try {
    const user = await createUser({ name, email, password, role: 'customer' });
    setAuthCookie(res, user);
    res.status(201).json({ user: publicUser(user) });
  } catch (err) {
    if (err instanceof EmailTakenError) return res.status(409).json({ error: err.message });
    throw err;
  }
}

export async function login(req, res) {
  const { email, password } = req.body ?? {};
  if (!email || typeof password !== 'string') {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const user = await findUserByEmail(email);
  const ok = user ? await checkPassword(user, password) : await bcrypt.compare(password, DUMMY_HASH);
  if (!user || !ok) return res.status(401).json({ error: 'Invalid email or password' });
  if (!user.is_active) return res.status(403).json({ error: 'This account has been disabled' });

  setAuthCookie(res, user);
  res.json({ user: publicUser(user) });
}

export function logout(req, res) {
  clearAuthCookie(res);
  res.json({ ok: true });
}

export function me(req, res) {
  res.json({ user: req.user });
}

export async function changePassword(req, res) {
  const { currentPassword, newPassword } = req.body ?? {};
  const user = await findUserById(req.user.id);
  if (typeof currentPassword !== 'string' || !(await checkPassword(user, currentPassword))) {
    return res.status(400).json({ error: 'Current password is not correct' });
  }
  const errors = passwordErrors(newPassword);
  if (errors.length) return res.status(400).json({ error: errors[0] });

  await setPassword(user._id, newPassword);
  res.json({ message: 'Password changed.' });
}

// Always answers the same way so the response does not reveal which emails are registered.
export async function forgotPassword(req, res) {
  const email = normalizeEmail(req.body?.email);
  const user = email ? await findUserByEmail(email) : null;

  if (user?.is_active) {
    const token = crypto.randomBytes(32).toString('hex');
    await PasswordReset.deleteMany({ user_id: user._id });
    await PasswordReset.create({
      _id: await nextId('password_resets'),
      user_id: user._id,
      token_hash: hashToken(token),
      expires_at: Date.now() + config.resetTokenMinutes * 60 * 1000,
    });

    const link = `${config.appUrl}/reset-password?token=${token}`;
    await sendMail({
      to: user.email,
      subject: 'Reset your Brightloop password',
      text:
        `Hi ${user.name},\n\nUse this link to reset your password. ` +
        `It is valid for ${config.resetTokenMinutes} minutes and can be used once:\n\n${link}\n\n` +
        `If you did not ask for this, you can ignore this email.`,
    });
  }

  res.json({ message: 'If that email is registered, a reset link has been sent to it.' });
}

export async function resetPassword(req, res) {
  const { token, password } = req.body ?? {};
  if (typeof token !== 'string' || !token) {
    return res.status(400).json({ error: 'Reset token is missing' });
  }
  const pwErrors = passwordErrors(password);
  if (pwErrors.length) return res.status(400).json({ error: pwErrors[0] });

  // Deleting the token as it is used makes the link single-use, even with two clicks at once.
  const reset = await PasswordReset.findOneAndDelete({ token_hash: hashToken(token), expires_at: { $gt: Date.now() } }).lean();
  if (!reset) return res.status(400).json({ error: 'This reset link is invalid or has expired' });

  await setPassword(reset.user_id, password);
  await PasswordReset.deleteMany({ user_id: reset.user_id });

  res.json({ message: 'Password updated. You can log in now.' });
}
