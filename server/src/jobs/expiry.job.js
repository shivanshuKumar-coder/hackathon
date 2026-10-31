import { closeExpiredSubscriptions } from '../services/subscription.service.js';

const HOUR = 60 * 60 * 1000;

// Closes subscriptions on auto-close plans once their expiry date has passed.
export async function runExpiryJob() {
  return { closed: await closeExpiredSubscriptions() };
}

export function startExpiryJob() {
  setInterval(() => runExpiryJob().catch((err) => console.error('[expiry] failed:', err)), HOUR).unref();
}
