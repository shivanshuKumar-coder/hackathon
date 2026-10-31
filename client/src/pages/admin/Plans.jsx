import CrudPage from '../../components/common/CrudPage.jsx';
import { planService } from '../../services/planService.js';
import { taxService } from '../../services/productService.js';
import { label, money } from '../../utils/format.js';

const TAXES = { key: 'taxes', load: () => taxService.list({ active: 1 }), label: (t) => `${t.name} (${t.rate}%)` };

const activeColumn = { key: 'is_active', label: 'Status', render: (r) => (r.is_active ? 'Active' : 'Inactive') };
const PERIODS = ['daily', 'weekly', 'monthly', 'yearly'].map((p) => ({ value: p, label: label(p) }));

export default function Plans() {
  return (
    <CrudPage
      title="Plans"
      subtitle="Price, billing period and what customers may do with a subscription on this plan."
      service={planService}
      fields={[
        { name: 'name', label: 'Name', required: true },
        { name: 'price', label: 'Price per period (per unit)', type: 'number', required: true, min: 0 },
        { name: 'billing_period', label: 'Billing period', type: 'select', required: true, default: 'monthly', options: PERIODS },
        { name: 'min_quantity', label: 'Minimum quantity', type: 'number', min: 1, step: 1, default: 1 },
        { name: 'start_date', label: 'Available from', type: 'date' },
        { name: 'end_date', label: 'Available until', type: 'date' },
        { name: 'tax_id', label: 'Tax', type: 'select', optionsFrom: TAXES, placeholder: 'No tax' },
        { name: 'auto_close', label: 'Close automatically at expiry', type: 'checkbox', default: false },
        { name: 'closable', label: 'Can be closed early', type: 'checkbox', default: true },
        { name: 'pausable', label: 'Can be paused', type: 'checkbox', default: false },
        { name: 'renewable', label: 'Can be renewed', type: 'checkbox', default: true },
        { name: 'is_active', label: 'Active', type: 'checkbox' },
      ]}
      columns={[
        { key: 'name', label: 'Name' },
        { key: 'price', label: 'Price', render: (r) => money(r.price) },
        { key: 'billing_period', label: 'Billing', render: (r) => label(r.billing_period) },
        { key: 'min_quantity', label: 'Min qty' },
        {
          key: 'dates',
          label: 'Available',
          render: (r) => (r.start_date || r.end_date ? `${r.start_date || '…'} → ${r.end_date || '…'}` : 'Always'),
        },
        {
          key: 'rules',
          label: 'Rules',
          render: (r) =>
            [r.auto_close && 'auto-close', r.closable && 'close early', r.pausable && 'pause', r.renewable && 'renew']
              .filter(Boolean)
              .join(', ') || '—',
        },
        activeColumn,
      ]}
    />
  );
}
