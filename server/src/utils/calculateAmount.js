export const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

export const lineAmount = (quantity, unitPrice) => round2(quantity * unitPrice);

// Recurring amount of a subscription, before discounts: untaxed and with tax.
export function subscriptionTotals(lines) {
  return {
    recurring_subtotal: round2(lines.reduce((s, l) => s + l.amount, 0)),
    recurring_total: round2(lines.reduce((s, l) => s + l.amount * (1 + l.tax_rate / 100), 0)),
  };
}

// Tax on what is left of a line after its discount.
export function lineTotals(base, discountAmount, taxRate) {
  const taxable = Math.max(0, base - discountAmount);
  const taxAmount = round2((taxable * taxRate) / 100);
  return { tax_amount: taxAmount, total: round2(taxable + taxAmount) };
}
