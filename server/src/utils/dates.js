// Dates are stored as 'YYYY-MM-DD' strings. Math is done in UTC to avoid timezone drift.

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function parse(date) {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function format(dt) {
  return dt.toISOString().slice(0, 10);
}

export function isDate(value) {
  if (typeof value !== 'string' || !DATE_RE.test(value)) return false;
  return format(parse(value)) === value;
}

// Today in the server's local timezone.
export function today() {
  const now = new Date();
  const local = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  return format(local);
}

export function addDays(date, days) {
  const dt = parse(date);
  dt.setUTCDate(dt.getUTCDate() + days);
  return format(dt);
}

function addMonths(date, months) {
  const dt = parse(date);
  const day = dt.getUTCDate();
  dt.setUTCDate(1);
  dt.setUTCMonth(dt.getUTCMonth() + months);
  const lastDay = new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth() + 1, 0)).getUTCDate();
  dt.setUTCDate(Math.min(day, lastDay));
  return format(dt);
}

export const BILLING_PERIODS = ['daily', 'weekly', 'monthly', 'yearly'];

// Start of the n-th period after `date`. Always computed from the anchor date,
// so month-end dates do not drift (Jan 31 → Feb 28 → Mar 31).
export function addPeriod(date, period, n = 1) {
  switch (period) {
    case 'daily':
      return addDays(date, n);
    case 'weekly':
      return addDays(date, 7 * n);
    case 'monthly':
      return addMonths(date, n);
    case 'yearly':
      return addMonths(date, 12 * n);
    default:
      throw new Error(`Unknown billing period: ${period}`);
  }
}

// Multiplier that turns one period's amount into a monthly amount (for MRR).
export const MONTHLY_FACTOR = { daily: 30, weekly: 52 / 12, monthly: 1, yearly: 1 / 12 };
