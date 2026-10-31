import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import PaymentPanel from '../../components/common/PaymentPanel.jsx';
import { ErrorText, PageHeader, StatusBadge } from '../../components/ui/index.jsx';
import { useFetch } from '../../hooks/useFetch.js';
import { invoiceService } from '../../services/invoiceService.js';
import { portalService } from '../../services/subscriptionService.js';
import { money } from '../../utils/format.js';

// Used by staff (/invoices/:id) and customers (/portal/invoices/:id).
export default function InvoiceDetails({ portal = false }) {
  const { id } = useParams();
  const load = portal ? portalService.getInvoice : invoiceService.get;
  const { data, error: loadError, reload } = useFetch(() => load(id), `${portal}-${id}`);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const inv = data?.item;

  async function action(name) {
    setError('');
    setNotice('');
    if (name === 'cancel' && !window.confirm('Cancel this invoice?')) return;
    try {
      await invoiceService[name](id);
      if (name === 'send') setNotice(`Invoice emailed to ${inv.customer_email}.`);
      reload();
    } catch (err) {
      setError(err.message);
    }
  }

  if (loadError) return <ErrorText>{loadError}</ErrorText>;
  if (!inv) return <div className="muted">Loading…</div>;

  return (
    <div className="page">
      <PageHeader title={`Invoice ${inv.number}`} subtitle={`${inv.customer_name} · ${inv.subscription_number}`}>
        {!portal && inv.status === 'draft' && (
          <button className="primary" onClick={() => action('confirm')}>
            Confirm
          </button>
        )}
        {!portal && ['confirmed', 'paid'].includes(inv.status) && <button onClick={() => action('send')}>Send</button>}
        <button onClick={() => window.print()}>Print</button>
        {!portal && ['draft', 'confirmed'].includes(inv.status) && inv.amount_paid === 0 && (
          <button className="danger" onClick={() => action('cancel')}>
            Cancel
          </button>
        )}
      </PageHeader>

      {notice && <p className="success no-print">{notice}</p>}
      <ErrorText>{error}</ErrorText>

      <section className="card invoice">
        <div className="invoice-head">
          <div>
            <div className="brand">Brightloop Software</div>
            <div className="muted small">Subscription invoice</div>
          </div>
          <div className="right">
            <h2>{inv.number}</h2>
            <StatusBadge status={inv.status} overdue={inv.is_overdue} />
          </div>
        </div>

        <div className="invoice-meta">
          <div>
            <span className="muted small">Bill to</span>
            <strong>{inv.customer_name}</strong>
            <span>{inv.customer_email}</span>
          </div>
          <div>
            <span className="muted small">Subscription</span>
            {portal ? (
              <Link to={`/portal/subscriptions/${inv.subscription_id}`}>{inv.subscription_number}</Link>
            ) : (
              <Link to={`/subscriptions/${inv.subscription_id}`}>{inv.subscription_number}</Link>
            )}
            <span>
              {inv.period_start} → {inv.period_end}
            </span>
          </div>
          <div>
            <span className="muted small">Invoice date</span>
            <span>{inv.invoice_date}</span>
            <span className="muted small">Due date</span>
            <span>{inv.due_date}</span>
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Description</th>
                <th className="num">Qty</th>
                <th className="num">Unit price</th>
                <th className="num">Discount</th>
                <th className="num">Tax</th>
                <th className="num">Total</th>
              </tr>
            </thead>
            <tbody>
              {inv.lines.map((l) => (
                <tr key={l.id}>
                  <td>
                    {l.description}
                    {l.discount_name && <div className="muted small">{l.discount_name}</div>}
                  </td>
                  <td className="num">{l.quantity}</td>
                  <td className="num">{money(l.unit_price)}</td>
                  <td className="num">{l.discount_amount ? `−${money(l.discount_amount)}` : '—'}</td>
                  <td className="num">
                    {money(l.tax_amount)} <span className="muted small">({l.tax_rate}%)</span>
                  </td>
                  <td className="num">{money(l.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="totals">
          <span className="muted">Subtotal</span>
          <span>{money(inv.subtotal)}</span>
          {inv.discount_total > 0 && (
            <>
              <span className="muted">Discount</span>
              <span>−{money(inv.discount_total)}</span>
            </>
          )}
          <span className="muted">Tax</span>
          <span>{money(inv.tax_total)}</span>
          <span>Total</span>
          <strong>{money(inv.total)}</strong>
          <span className="muted">Paid</span>
          <span>{money(inv.amount_paid)}</span>
          <span>Amount due</span>
          <strong>{money(inv.amount_due)}</strong>
        </div>
      </section>

      <PaymentPanel invoice={inv} canRecord={!portal} onChange={reload} />
    </div>
  );
}
