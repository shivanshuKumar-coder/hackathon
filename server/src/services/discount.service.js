import { Discount } from '../models/Discount.js';
import { round2 } from '../utils/calculateAmount.js';

// Active, inside its dates, and not used up.
export function discountUsable(d, date) {
  return (
    d &&
    d.is_active &&
    (!d.start_date || d.start_date <= date) &&
    (!d.end_date || d.end_date >= date) &&
    (d.usage_limit == null || d.used_count < d.usage_limit)
  );
}

export const discountValue = (d, base) =>
  round2(d.discount_type === 'percent' ? (base * d.value) / 100 : Math.min(d.value, base));

// Sets discount_amount / discount_name on priced lines ({ product_id, quantity, base }):
// the best product discount per line first, then the subscription's own discount
// spread over the lines. Returns the ids of the discounts that were used.
export async function applyDiscounts(lines, subscriptionDiscountId, date) {
  const used = new Set();

  const productIds = lines.map((l) => l.product_id).filter(Boolean);
  const productDiscounts = productIds.length
    ? (await Discount.find({ scope: 'product', 'products.product_id': { $in: productIds } }).lean()).filter((d) =>
        discountUsable(d, date),
      )
    : [];

  for (const line of lines) {
    if (!line.product_id) continue;
    let best = null;
    for (const d of productDiscounts) {
      if (!d.products.some((p) => p.product_id === line.product_id)) continue;
      if (line.quantity < d.min_quantity || line.base < d.min_purchase) continue;
      const amount = discountValue(d, line.base);
      if (!best || amount > best.amount) best = { d, amount };
    }
    if (best && best.amount > 0) {
      line.discount_amount = best.amount;
      line.discount_name = best.d.name;
      used.add(best.d._id);
    }
  }

  if (subscriptionDiscountId) {
    const d = await Discount.findById(subscriptionDiscountId).lean();
    const remaining = round2(lines.reduce((s, l) => s + l.base - l.discount_amount, 0));
    const totalQty = lines.reduce((s, l) => s + l.quantity, 0);
    if (discountUsable(d, date) && remaining > 0 && remaining >= d.min_purchase && totalQty >= d.min_quantity) {
      const amount = discountValue(d, remaining);
      let left = amount;
      lines.forEach((line, i) => {
        const lineRemaining = line.base - line.discount_amount;
        const share = i === lines.length - 1 ? left : round2((amount * lineRemaining) / remaining);
        line.discount_amount = round2(line.discount_amount + share);
        line.discount_name = line.discount_name ? `${line.discount_name}, ${d.name}` : d.name;
        left = round2(left - share);
      });
      used.add(d._id);
    }
  }

  return [...used];
}

export function consumeDiscounts(ids) {
  if (!ids.length) return null;
  return Discount.updateMany({ _id: { $in: ids } }, { $inc: { used_count: 1 } });
}

// Gives back the uses taken by a cancelled invoice.
export function releaseDiscounts(ids) {
  if (!ids.length) return null;
  return Discount.updateMany({ _id: { $in: ids }, used_count: { $gt: 0 } }, { $inc: { used_count: -1 } });
}
