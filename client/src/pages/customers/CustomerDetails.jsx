import { Link, useNavigate, useParams } from 'react-router-dom';
import { ErrorText, PageHeader, Stat, StatusBadge } from '../../components/ui/index.jsx';
import { useFetch } from '../../hooks/useFetch.js';
import { customerService } from '../../services/subscriptionService.js';
import { money, periodUnit } from '../../utils/format.js';

export default function CustomerDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data, error } = useFetch(() => customerService.get(id), id);
  const c = data?.item;

  if (error) return <ErrorText>{error}</ErrorText>;
  if (!c) return <div className="muted">Loading…</div>;

  return (
    <div className="page">
      <PageHeader title={c.name} subtitle={c.email}>
        <Link className="button" to="/invoices" state={{ filter: `customer_id=${c.id}` }}>
          Invoices
        </Link>
        <Link className="button primary" to="/subscriptions/new">
          New subscription
        </Link>
      </PageHeader>

      <div className="stats">
        <Stat title="Subscriptions" value={c.subscriptions.length} />
        <Stat title="Invoiced" value={money(c.invoiced)} />
        <Stat title="Paid" value={money(c.paid)} tone="good" />
        <Stat title="Amount due" value={money(c.amount_due)} hint={`${c.unpaid_invoices} unpaid invoices`} tone={c.amount_due ? 'warn' : undefined} />
      </div>

      <section className="card">
        <h2>Subscriptions</h2>
        {c.subscriptions.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Number</th>
                  <th>Plan</th>
                  <th>Start</th>
                  <th>Expiry</th>
                  <th className="num">Recurring</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {c.subscriptions.map((s) => (
                  <tr key={s.id} className="clickable" onClick={() => navigate(`/subscriptions/${s.id}`)}>
                    <td>{s.number}</td>
                    <td>{s.plan_name}</td>
                    <td>{s.start_date}</td>
                    <td>{s.expiry_date || '—'}</td>
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
        ) : (
          <p className="muted">No subscriptions yet.</p>
        )}
      </section>
    </div>
  );
}
