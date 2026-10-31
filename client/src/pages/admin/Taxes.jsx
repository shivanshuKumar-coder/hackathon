import CrudPage from '../../components/common/CrudPage.jsx';
import { taxService } from '../../services/productService.js';

const activeColumn = { key: 'is_active', label: 'Status', render: (r) => (r.is_active ? 'Active' : 'Inactive') };

export default function Taxes() {
  return (
    <CrudPage
      title="Taxes"
      subtitle="Tax rules. Invoices calculate tax from the rule set on each product or plan."
      service={taxService}
      fields={[
        { name: 'name', label: 'Name', required: true },
        { name: 'rate', label: 'Rate (%)', type: 'number', required: true, min: 0 },
        { name: 'is_active', label: 'Active', type: 'checkbox' },
      ]}
      columns={[
        { key: 'name', label: 'Name' },
        { key: 'rate', label: 'Rate', render: (r) => `${r.rate}%` },
        activeColumn,
      ]}
    />
  );
}
