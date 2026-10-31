// Same rules as server/src/lib/validation.js, used for the live checklist.
export const PASSWORD_RULES = [
  { label: 'More than 8 characters', test: (p) => p.length > 8 },
  { label: 'An uppercase letter', test: (p) => /[A-Z]/.test(p) },
  { label: 'A lowercase letter', test: (p) => /[a-z]/.test(p) },
  { label: 'A special character', test: (p) => /[^A-Za-z0-9]/.test(p) },
];

export const isStrongPassword = (p) => PASSWORD_RULES.every((r) => r.test(p));
