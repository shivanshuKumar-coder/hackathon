import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ErrorText, PageHeader, StatusBadge } from '../../components/ui/index.jsx';
import { useFetch } from '../../hooks/useFetch.js';
import { portalService, subscriptionService } from '../../services/subscriptionService.js';
import { money, periodUnit } from '../../utils/format.js';

const FLOW = ['draft', 'quotation', 'confirmed', 'active', 'closed'];

export function StatusFlow({ status }) {
  const current = status === 'paused' ? FLOW.indexOf('active') : FLOW.indexOf(status);
  return (
    <ol className="flow">
      {FLOW.map((s, i) => (
        <li key={s} className={i < current ? 'done' : i === current ? 'current' : ''}>
          {s === 'active' && status === 'paused' ? 'Paused' : s.charAt(0).toUpperCase() + s.slice(1)}
        </li>
      ))}
    </ol>
  );
}

// Used by staff (/subscriptions/:id) and customers (/portal/subscriptions/:id).
export default function SubscriptionDetails({ portal = false }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const load = portal ? portalService.getSubscription : subscriptionService.get;
  const { data, error: loadError, reload } = useFetch(() => load(id), `${portal}-${id}`);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const sub = data?.item;

  async function run(fn) {
    setError('');
    setBusy(true);
    try {
      await fn();
      reload();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const doAction = (action) => {
    if (action === 'close' && !window.confirm('Close this subscription? This cannot be undone.')) return;
    run(() => (portal ? portalService.action(id, action) : subscriptionService.action(id, action)));
  };

  const invoiceNow = () =>
    run(async () => {
      const { invoiceId } = await subscriptionService.invoiceNow(id);
      navigate(`/invoices/${invoiceId}`);
    });

  const remove = () =>
    run(async () => {
      if (!window.confirm('Delete this draft?')) return;
      await subscriptionService.remove(id);
      navigate('/subscriptions');
    });

  if (loadError) return <ErrorText>{loadError}</ErrorText>;
  if (!sub) return <div className="muted">Loading…</div>;

  return (
    <div className="page">
      <PageHeader title={sub.number} subtitle={`${sub.plan_name} · ${sub.customer_name}`}>
        {!portal && ['draft', 'quotation'].includes(sub.status) && (
          <Link className="button" to={`/subscriptions/${id}/edit`}>
            Edit
          </Link>
        )}
        {!portal && sub.status === 'draft' && (
          <button onClick={remove} disabled={busy}>
            Delete
          </button>
        )}
        {sub.actions.map((a) => (
          <button key={a.name} className={a.name === 'close' ? 'danger' : 'primary'} disabled={busy} onClick={() => doAction(a.name)}>
            {portal && a.name === 'confirm' ? 'Accept quotation' : a.label}
          </button>
        ))}
        {!portal && sub.status === 'active' && (
          <button onClick={invoiceNow} disabled={busy}>
            Create next invoice
          </button>
        )}
      </PageHeader>

      <StatusFlow status={sub.status} />
      <ErrorText>{error}</ErrorText>

      <div className="grid-2">
        <section className="card">
          <h2>Details</h2>
          <dl className="details">
            <dt>Status</dt>
            <dd>
              <StatusBadge status={sub.status} />
            </dd>
            <dt>Customer</dt>
            <dd>
              {sub.customer_name}
              <div className="muted small">{sub.customer_email}</div>
            </dd>
            <dt>Plan</dt>
            <dd>
              {sub.plan_name} ({sub.billing_period})
            </dd>
            <dt>Quantity</dt>
            <dd>{sub.quantity}</dd>
            <dt>Start date</dt>
            <dd>{sub.start_date}</dd>
            <dt>Expiry date</dt>
            <dd>{sub.expiry_date || 'No end date'}</dd>
            <dt>Payment terms</dt>
            <dd>{sub.payment_terms_days ? `${sub.payment_terms_days} days` : 'Immediate'}</dd>
            {sub.status === 'quotation' && (
              <>
                <dt>Quotation valid until</dt>
                <dd>{sub.quotation_valid_until}</dd>
              </>
            )}
            {sub.status === 'active' && (
              <>
                <dt>Next invoice</dt>
                <dd>{sub.next_invoice_date}</dd>
              </>
            )}
            {sub.discount_name && (
              <>
                <dt>Discount</dt>
                <dd>{sub.discount_name}</dd>
              </>
            )}
            {sub.template_name && (
              <>
                <dt>From template</dt>
                <dd>{sub.template_name}</dd>
              </>
            )}
            {sub.notes && (
              <>
                <dt>Notes</dt>
                <dd>{sub.notes}</dd>
              </>
            )}
          </dl>
        </section>

        <section className="card">
          <h2>Lines</h2>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th className="num">Qty</th>
                  <th className="num">Unit price</th>
                  <th className="num">Tax</th>
                  <th className="num">Amount</th>
                </tr>
              </thead>
              <tbody>
                {sub.lines.map((l) => (
                  <tr key={l.id}>
                    <td>{l.description}</td>
                    <td className="num">{l.quantity}</td>
                    <td className="num">{money(l.unit_price)}</td>
                    <td className="num">{l.tax_rate}%</td>
                    <td className="num">{money(l.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="totals">
            <span className="muted">Untaxed</span>
            <span>{money(sub.recurring_subtotal)}</span>
            <span className="muted">Total per {periodUnit(sub.billing_period)} incl. tax</span>
            <strong>{money(sub.recurring_total)}</strong>
          </div>
        </section>
      </div>

      <section className="card">
        <h2>Invoices</h2>
        {sub.invoices.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Number</th>
                  <th>Period</th>
                  <th>Due</th>
                  <th className="num">Total</th>
                  <th className="num">Paid</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {sub.invoices
                  .filter((i) => !portal || i.status !== 'draft')
                  .map((i) => (
                    <tr key={i.id} className="clickable" onClick={() => navigate(`${portal ? '/portal/invoices' : '/invoices'}/${i.id}`)}>
                      <td>{i.number}</td>
                      <td>
                        {i.period_start} → {i.period_end}
                      </td>
                      <td>{i.due_date}</td>
                      <td className="num">{money(i.total)}</td>
                      <td className="num">{money(i.amount_paid)}</td>
                      <td>
                        <StatusBadge status={i.status} />
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="muted">No invoices yet. They are created on each billing date once the subscription is active.</p>
        )}
      </section>
    </div>
  );
}
