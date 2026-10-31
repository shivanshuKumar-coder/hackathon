import CrudPage from '../../components/common/CrudPage.jsx';
import { productService, taxService } from '../../services/productService.js';
import { label, money } from '../../utils/format.js';

const TAXES = { key: 'taxes', load: () => taxService.list({ active: 1 }), label: (t) => `${t.name} (${t.rate}%)` };

const activeColumn = { key: 'is_active', label: 'Status', render: (r) => (r.is_active ? 'Active' : 'Inactive') };
const taxName = (id, lookups) => {
  const t = (lookups[TAXES.key] ?? []).find((x) => x.id === id);
  return t ? t.name : '—';
};

export default function Products() {
  return (
    <CrudPage
      title="Products"
      subtitle="What Brightloop sells. Variants add to the sales price."
      service={productService}
      fields={[
        { name: 'name', label: 'Name', required: true },
        {
          name: 'product_type',
          label: 'Type',
          type: 'select',
          required: true,
          default: 'service',
          options: [
            { value: 'service', label: 'Service' },
            { value: 'goods', label: 'Goods' },
          ],
        },
        { name: 'sales_price', label: 'Sales price', type: 'number', required: true, min: 0 },
        { name: 'cost_price', label: 'Cost price', type: 'number', min: 0 },
        { name: 'tax_id', label: 'Tax', type: 'select', optionsFrom: TAXES, placeholder: 'No tax' },
        { name: 'notes', label: 'Notes', type: 'textarea' },
        {
          name: 'variants',
          label: 'Variants',
          type: 'rows',
          addLabel: 'Add variant',
          columns: [
            { name: 'attribute', label: 'Attribute', default: 'Brand' },
            { name: 'value', label: 'Value' },
            { name: 'extra_price', label: 'Extra price', type: 'number', default: 0 },
          ],
        },
        { name: 'is_active', label: 'Active', type: 'checkbox' },
      ]}
      columns={[
        { key: 'name', label: 'Name' },
        { key: 'product_type', label: 'Type', render: (r) => label(r.product_type) },
        { key: 'sales_price', label: 'Sales price', render: (r) => money(r.sales_price) },
        { key: 'cost_price', label: 'Cost price', render: (r) => money(r.cost_price) },
        { key: 'tax_id', label: 'Tax', render: (r, l) => taxName(r.tax_id, l) },
        {
          key: 'variants',
          label: 'Variants',
          render: (r) =>
            r.variants.map((v) => `${v.value} (+${money(v.extra_price)})`).join(', ') || '—',
        },
        activeColumn,
      ]}
    />
  );
}

const PERIODS = ['daily', 'weekly', 'monthly', 'yearly'].map((p) => ({ value: p, label: label(p) }));
