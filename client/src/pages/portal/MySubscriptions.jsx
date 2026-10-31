import { useNavigate } from 'react-router-dom';
import { ErrorText, PageHeader, Stat, StatusBadge } from '../../components/ui/index.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useFetch } from '../../hooks/useFetch.js';
import { portalService } from '../../services/subscriptionService.js';
import { money } from '../../utils/format.js';

// Customer portal home: only this customer's own subscriptions.
export default function MySubscriptions() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const summary = useFetch(portalService.summary, 'summary').data;
  const { data, error } = useFetch(portalService.subscriptions, 'subscriptions');

  return (
    <div className="page">
      <PageHeader title={`Hi ${user.name}`} subtitle="Your subscriptions and invoices, without emailing anyone." />

      {summary && (
        <div className="stats">
          <Stat title="Active subscriptions" value={summary.activeSubscriptions} />
          <Stat title="Unpaid invoices" value={summary.unpaidInvoices} tone={summary.unpaidInvoices ? 'warn' : undefined} />
          <Stat title="Amount due" value={money(summary.amountDue)} tone={summary.amountDue ? 'warn' : 'good'} />
        </div>
      )}

      <section className="card">
        <h2>My subscriptions</h2>
        <ErrorText>{error}</ErrorText>
        {data?.items.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Number</th>
                  <th>Plan</th>
                  <th>Start</th>
                  <th>Expiry</th>
                  <th>Next invoice</th>
                  <th className="num">Recurring</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((s) => (
                  <tr key={s.id} className="clickable" onClick={() => navigate(`/portal/subscriptions/${s.id}`)}>
                    <td>{s.number}</td>
                    <td>{s.plan_name}</td>
                    <td>{s.start_date}</td>
                    <td>{s.expiry_date || '—'}</td>
                    <td>{s.status === 'active' ? s.next_invoice_date : '—'}</td>
                    <td className="num">{money(s.recurring_total)}</td>
                    <td>
                      <StatusBadge status={s.status} />
                      {s.status === 'quotation' && <div className="muted small">Awaiting your acceptance</div>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          data && <p className="muted">You have no subscriptions yet.</p>
        )}
      </section>
    </div>
  );
}
