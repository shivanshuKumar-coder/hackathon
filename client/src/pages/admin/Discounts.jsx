import CrudPage from '../../components/common/CrudPage.jsx';
import { discountService, productService } from '../../services/productService.js';
import { money } from '../../utils/format.js';

const PRODUCTS = { key: 'products', load: () => productService.list({ active: 1 }), label: (p) => p.name };

export default function Discounts() {
  return (
    <CrudPage
      title="Discounts"
      subtitle="Applied on the next invoice by themselves, and stop when they expire or run out."
      service={discountService}
      fields={[
        { name: 'name', label: 'Name', required: true },
        {
          name: 'discount_type',
          label: 'Type',
          type: 'select',
          required: true,
          default: 'percent',
          options: [
            { value: 'percent', label: 'Percentage' },
            { value: 'fixed', label: 'Fixed amount' },
          ],
        },
        { name: 'value', label: 'Value', type: 'number', required: true, min: 0 },
        {
          name: 'scope',
          label: 'Applies to',
          type: 'select',
          required: true,
          default: 'subscription',
          options: [
            { value: 'subscription', label: 'Whole subscription (attach it on the subscription)' },
            { value: 'product', label: 'Specific products (applies automatically)' },
          ],
        },
        {
          name: 'products',
          label: 'Products (for product discounts)',
          type: 'rows',
          addLabel: 'Add product',
          columns: [{ name: 'product_id', label: 'Product', type: 'select', optionsFrom: PRODUCTS }],
        },
        { name: 'min_purchase', label: 'Minimum purchase', type: 'number', min: 0, default: 0 },
        { name: 'min_quantity', label: 'Minimum quantity', type: 'number', min: 0, default: 0 },
        { name: 'start_date', label: 'Start date', type: 'date' },
        { name: 'end_date', label: 'End date', type: 'date' },
        { name: 'usage_limit', label: 'Usage limit', type: 'number', min: 1, step: 1, help: 'Leave empty for unlimited' },
        { name: 'is_active', label: 'Active', type: 'checkbox' },
      ]}
      columns={[
        { key: 'name', label: 'Name' },
        {
          key: 'value',
          label: 'Discount',
          render: (r) => (r.discount_type === 'percent' ? `${r.value}%` : money(r.value)),
        },
        {
          key: 'scope',
          label: 'Applies to',
          render: (r, l) =>
            r.scope === 'subscription'
              ? 'Subscription'
              : r.products
                  .map((p) => (l[PRODUCTS.key] ?? []).find((x) => x.id === p.product_id)?.name)
                  .filter(Boolean)
                  .join(', '),
        },
        {
          key: 'conditions',
          label: 'Conditions',
          render: (r) =>
            [r.min_purchase > 0 && `min ${money(r.min_purchase)}`, r.min_quantity > 0 && `min qty ${r.min_quantity}`]
              .filter(Boolean)
              .join(', ') || '—',
        },
        {
          key: 'dates',
          label: 'Valid',
          render: (r) => (r.start_date || r.end_date ? `${r.start_date || '…'} → ${r.end_date || '…'}` : 'Always'),
        },
        { key: 'used', label: 'Used', render: (r) => `${r.used_count}${r.usage_limit ? ` / ${r.usage_limit}` : ''}` },
        { key: 'is_active', label: 'Status', render: (r) => (r.is_active ? 'Active' : 'Inactive') },
      ]}
    />
  );
}
