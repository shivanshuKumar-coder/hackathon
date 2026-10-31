import CrudPage from '../../components/common/CrudPage.jsx';
import { planService, templateService } from '../../services/planService.js';
import { productService } from '../../services/productService.js';

const PRODUCTS = { key: 'products', load: () => productService.list({ active: 1 }), label: (p) => p.name };
const PLANS = { key: 'plans', load: () => planService.list({ active: 1 }), label: (p) => `${p.name} (${p.billing_period})` };

const activeColumn = { key: 'is_active', label: 'Status', render: (r) => (r.is_active ? 'Active' : 'Inactive') };

export default function Templates() {
  return (
    <CrudPage
      title="Quotation templates"
      subtitle="Ready-made offers: a plan plus product lines, valid for a set number of days."
      service={templateService}
      writeRoles={['admin', 'staff']}
      fields={[
        { name: 'name', label: 'Name', required: true },
        { name: 'plan_id', label: 'Plan', type: 'select', required: true, optionsFrom: PLANS },
        { name: 'validity_days', label: 'Valid for (days)', type: 'number', min: 1, step: 1, default: 30 },
        { name: 'notes', label: 'Notes', type: 'textarea' },
        {
          name: 'lines',
          label: 'Product lines',
          type: 'rows',
          addLabel: 'Add product',
          columns: [
            { name: 'product_id', label: 'Product', type: 'select', optionsFrom: PRODUCTS },
            { name: 'quantity', label: 'Qty', type: 'number', default: 1 },
          ],
        },
        { name: 'is_active', label: 'Active', type: 'checkbox' },
      ]}
      columns={[
        { key: 'name', label: 'Name' },
        {
          key: 'plan_id',
          label: 'Plan',
          render: (r, l) => (l[PLANS.key] ?? []).find((p) => p.id === r.plan_id)?.name ?? '—',
        },
        { key: 'validity_days', label: 'Valid for', render: (r) => `${r.validity_days} days` },
        { key: 'lines', label: 'Lines', render: (r) => r.lines.length },
        activeColumn,
      ]}
    />
  );
}
