const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const ROLES = ['admin', 'staff', 'customer'];

export function normalizeEmail(email) {
  return typeof email === 'string' ? email.trim().toLowerCase() : '';
}

export function isValidEmail(email) {
  return EMAIL_RE.test(email) && email.length <= 254;
}

// Rule from the problem statement: more than 8 characters,
// at least one uppercase, one lowercase and one special character.
export function passwordErrors(password) {
  if (typeof password !== 'string') return ['Password is required'];
  const errors = [];
  if (password.length <= 8) errors.push('Password must be more than 8 characters');
  if (password.length > 128) errors.push('Password must be at most 128 characters');
  if (!/[A-Z]/.test(password)) errors.push('Password must contain an uppercase letter');
  if (!/[a-z]/.test(password)) errors.push('Password must contain a lowercase letter');
  if (!/[^A-Za-z0-9]/.test(password)) errors.push('Password must contain a special character');
  return errors;
}

// Validates name/email/password for a new account. Returns an error message or null.
export function validateNewUser({ name, email, password }) {
  if (typeof name !== 'string' || !name.trim()) return 'Name is required';
  if (name.trim().length > 100) return 'Name is too long';
  if (!isValidEmail(normalizeEmail(email))) return 'A valid email is required';
  const pwErrors = passwordErrors(password);
  return pwErrors.length ? pwErrors[0] : null;
}
