import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ErrorText, PageHeader, Pager, StatusBadge } from '../../components/ui/index.jsx';
import { useFetch } from '../../hooks/useFetch.js';
import { subscriptionService } from '../../services/subscriptionService.js';
import { label, money, periodUnit } from '../../utils/format.js';

const STATUSES = ['draft', 'quotation', 'confirmed', 'active', 'paused', 'closed'];

export default function SubscriptionList() {
  const navigate = useNavigate();
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const params = { page, pageSize: 20, status, q };
  const { data, error } = useFetch(() => subscriptionService.list(params), JSON.stringify(params));

  return (
    <div className="page">
      <PageHeader title="Subscriptions" subtitle="Every subscription and where it stands.">
        <Link className="button primary" to="/subscriptions/new">
          New subscription
        </Link>
      </PageHeader>

      <div className="filters">
        <input
          className="search"
          placeholder="Search number or customer…"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
        />
        <div className="chips">
          {['', ...STATUSES].map((s) => (
            <button
              key={s || 'all'}
              className={`chip ${status === s ? 'on' : ''}`}
              onClick={() => {
                setStatus(s);
                setPage(1);
              }}
            >
              {s ? label(s) : 'All'}
            </button>
          ))}
        </div>
      </div>

      <section className="card">
        <ErrorText>{error}</ErrorText>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Number</th>
                <th>Customer</th>
                <th>Plan</th>
                <th>Start</th>
                <th>Expiry</th>
                <th>Next invoice</th>
                <th className="num">Recurring</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {data?.items.map((s) => (
                <tr key={s.id} className="clickable" onClick={() => navigate(`/subscriptions/${s.id}`)}>
                  <td>{s.number}</td>
                  <td>{s.customer_name}</td>
                  <td>{s.plan_name}</td>
                  <td>{s.start_date}</td>
                  <td>{s.expiry_date || '—'}</td>
                  <td>{['active'].includes(s.status) ? s.next_invoice_date : '—'}</td>
                  <td className="num">
                    {money(s.recurring_total)} <span className="muted small">/ {periodUnit(s.billing_period)}</span>
                  </td>
                  <td>
                    <StatusBadge status={s.status} />
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
