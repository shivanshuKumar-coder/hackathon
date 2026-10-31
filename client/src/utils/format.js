const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 });
export const money = (n) => inr.format(Number(n) || 0);

const SPECIAL = { upi: 'UPI' };
export const label = (s) => (s ? SPECIAL[s] ?? s.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase()) : '');

// 'monthly' → 'month', 'daily' → 'day'
export const periodUnit = (period) => ({ daily: 'day', weekly: 'week', monthly: 'month', yearly: 'year' })[period] ?? period;

export const todayStr = () => new Date().toLocaleDateString('en-CA');
