import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { findUserById, publicUser } from '../services/user.service.js';

export const AUTH_COOKIE = 'token';

export function signToken(user) {
  return jwt.sign({ sub: String(user._id ?? user.id), role: user.role }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  });
}

export function setAuthCookie(res, user) {
  res.cookie(AUTH_COOKIE, signToken(user), {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.isProduction,
    maxAge: 24 * 60 * 60 * 1000,
  });
}

export function clearAuthCookie(res) {
  res.clearCookie(AUTH_COOKIE, { httpOnly: true, sameSite: 'lax', secure: config.isProduction });
}

function readToken(req) {
  const header = req.get('authorization');
  if (header?.startsWith('Bearer ')) return header.slice(7);
  return req.cookies?.[AUTH_COOKIE];
}

// Requires a logged-in, active user. Sets req.user = { id, name, email, role, ... }.
// The user is re-read from the database so role changes and deactivation apply immediately.
export async function requireAuth(req, res, next) {
  const token = readToken(req);
  if (!token) return res.status(401).json({ error: 'Not logged in' });

  let payload;
  try {
    payload = jwt.verify(token, config.jwtSecret);
  } catch {
    return res.status(401).json({ error: 'Session expired, please log in again' });
  }

  const userId = Number(payload.sub);
  const user = Number.isInteger(userId) ? await findUserById(userId) : null;
  if (!user || !user.is_active) {
    return res.status(401).json({ error: 'Account not found or disabled' });
  }

  req.user = publicUser(user);
  next();
}
