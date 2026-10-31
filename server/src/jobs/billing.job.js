import { runBilling } from '../services/billing.service.js';
import { runExpiryJob } from './expiry.job.js';

const HOUR = 60 * 60 * 1000;

// Bills everything due, then closes what has expired (so the last period is billed first).
export async function runBillingJob() {
  const billed = await runBilling();
  const expired = await runExpiryJob();
  return { ...billed, ...expired };
}

async function tick() {
  try {
    const result = await runBillingJob();
    if (result.created || result.closed || result.activated) console.log('[billing]', result);
  } catch (err) {
    console.error('[billing] failed:', err);
  }
}

// Runs on start and then every hour, so due invoices are never skipped.
export function startBillingJob() {
  tick();
  setInterval(tick, HOUR).unref();
}
