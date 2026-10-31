import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ErrorText, PageHeader, Pager } from '../../components/ui/index.jsx';
import { useFetch } from '../../hooks/useFetch.js';
import { quotationService } from '../../services/planService.js';
import { money, periodUnit } from '../../utils/format.js';

// Quotations sent to customers and waiting for them to accept.
export default function Quotations() {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [expiredOnly, setExpiredOnly] = useState(false);
  const [page, setPage] = useState(1);
  const params = { page, q, expired: expiredOnly ? 1 : '' };
  const { data, error } = useFetch(() => quotationService.list(params), JSON.stringify(params));

  return (
    <div className="page">
      <PageHeader title="Quotations" subtitle="Offers sent to customers, waiting to be accepted.">
        <Link className="button" to="/templates">
          Templates
        </Link>
        <Link className="button primary" to="/subscriptions/new">
          New quotation
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
        <label className="check">
          <input
            type="checkbox"
            checked={expiredOnly}
            onChange={(e) => {
              setExpiredOnly(e.target.checked);
              setPage(1);
            }}
          />
          Expired only
        </label>
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
                <th>Valid until</th>
                <th className="num">Recurring</th>
              </tr>
            </thead>
            <tbody>
              {data?.items.map((s) => (
                <tr key={s.id} className="clickable" onClick={() => navigate(`/subscriptions/${s.id}`)}>
                  <td>{s.number}</td>
                  <td>{s.customer_name}</td>
                  <td>{s.plan_name}</td>
                  <td>{s.start_date}</td>
                  <td>
                    {s.quotation_valid_until || '—'}
                    {s.is_expired && <span className="badge st-overdue left-gap">Expired</span>}
                  </td>
                  <td className="num">
                    {money(s.recurring_total)} <span className="muted small">/ {periodUnit(s.billing_period)}</span>
                  </td>
                </tr>
              ))}
              {data && !data.items.length && (
                <tr>
                  <td colSpan={6} className="muted">
                    No open quotations.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {data && <Pager page={data.page} pageSize={data.pageSize} total={data.total} onPage={setPage} />}
      </section>
    </div>
  );
}
