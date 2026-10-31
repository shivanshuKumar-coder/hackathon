import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ErrorText, PageHeader, Pager, StatusBadge } from '../../components/ui/index.jsx';
import { useFetch } from '../../hooks/useFetch.js';
import { invoiceService } from '../../services/invoiceService.js';
import { portalService } from '../../services/subscriptionService.js';
import { money } from '../../utils/format.js';

const FILTERS = [
  { key: '', label: 'All' },
  { key: 'status=draft', label: 'Draft' },
  { key: 'unpaid=1', label: 'Outstanding' },
  { key: 'overdue=1', label: 'Overdue' },
  { key: 'status=paid', label: 'Paid' },
  { key: 'status=cancelled', label: 'Cancelled' },
];

// Used by staff (/invoices) and customers (/portal/invoices).
export default function Invoices({ portal = false }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [filter, setFilter] = useState(location.state?.filter ?? '');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const params = { ...Object.fromEntries(new URLSearchParams(filter)), page, q };
  const base = portal ? '/portal/invoices' : '/invoices';
  const { data, error: loadError, reload } = useFetch(
    () => (portal ? portalService.invoices(params) : invoiceService.list(params)),
    `${portal}-${JSON.stringify(params)}`,
  );

  async function run(call, describe) {
    setError('');
    setMessage('');
    try {
      const result = await call();
      setMessage(describe(result));
      reload();
    } catch (err) {
      setError(err.message);
    }
  }

  const filters = portal ? FILTERS.filter((f) => !f.key.includes('draft')) : FILTERS;

  return (
    <div className="page">
      <PageHeader title="Invoices" subtitle={portal ? 'Your invoices.' : 'Created automatically from subscriptions on each billing date.'}>
        {!portal && (
          <>
            <button onClick={() => run(invoiceService.runBilling, (r) => `Billing run: ${r.created} invoices created, ${r.activated} subscriptions activated, ${r.closed} closed.`)}>
              Run billing now
            </button>
            <button className="primary" onClick={() => run(invoiceService.confirmDrafts, (r) => `${r.confirmed} draft invoices confirmed.`)}>
              Confirm all drafts
            </button>
          </>
        )}
      </PageHeader>

      {message && <p className="success">{message}</p>}
      <ErrorText>{error || loadError}</ErrorText>

      <div className="filters">
        <input
          className="search"
          placeholder={portal ? 'Search invoice number…' : 'Search number or customer…'}
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
        />
        <div className="chips">
          {filters.map((f) => (
            <button
              key={f.key || 'all'}
              className={`chip ${filter === f.key ? 'on' : ''}`}
              onClick={() => {
                setFilter(f.key);
                setPage(1);
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <section className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Number</th>
                {!portal && <th>Customer</th>}
                <th>Subscription</th>
                <th>Date</th>
                <th>Due</th>
                <th className="num">Total</th>
                <th className="num">Paid</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {data?.items.map((i) => (
                <tr key={i.id} className="clickable" onClick={() => navigate(`${base}/${i.id}`)}>
                  <td>{i.number}</td>
                  {!portal && <td>{i.customer_name}</td>}
                  <td>{i.subscription_number}</td>
                  <td>{i.invoice_date}</td>
                  <td>{i.due_date}</td>
                  <td className="num">{money(i.total)}</td>
                  <td className="num">{money(i.amount_paid)}</td>
                  <td>
                    <StatusBadge status={i.status} overdue={i.is_overdue} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {data && <Pager page={data.page} pageSize={data.pageSize} total={data.total} onPage={setPage} />}
      </section>
    </div>
  );
}
