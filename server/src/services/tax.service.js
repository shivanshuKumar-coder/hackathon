import { Tax } from '../models/Tax.js';

// Rate (%) of the tax rule set on a product or plan; 0 when none is set.
export async function taxRate(taxId) {
  if (!taxId) return 0;
  return (await Tax.findById(taxId).lean())?.rate ?? 0;
}
