import { Subscription } from './Subscription.js';

// A quotation is a subscription in the "quotation" status (Draft → Quotation → Confirmed → …),
// so it lives in the subscriptions collection and keeps its number when accepted.
export const QUOTATION_FILTER = { status: 'quotation' };

export function findQuotations(filter = {}, projection) {
  return Subscription.find({ ...filter, ...QUOTATION_FILTER }, projection);
}

export function countQuotations(filter = {}) {
  return Subscription.countDocuments({ ...filter, ...QUOTATION_FILTER });
}
