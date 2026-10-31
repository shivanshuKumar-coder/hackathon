import { useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { paymentService } from '../../services/paymentService.js';
import { label, money, todayStr } from '../../utils/format.js';
import { ErrorText } from '../ui/index.jsx';

export const METHODS = ['bank_transfer', 'upi', 'card', 'cash', 'cheque', 'other'];

// Payments recorded against one invoice, plus the form to record a new one.
export default function PaymentPanel({ invoice, canRecord, onChange }) {
  const { user } = useAuth();
  const [form, setForm] = useState(null);
  const [error, setError] = useState('');

  const open = () => {
    setError('');
    setForm({ method: 'bank_transfer', amount: invoice.amount_due, payment_date: todayStr(), note: '' });
  };

  async function save(e) {
    e.preventDefault();
    setError('');
    try {
      await paymentService.create({ ...form, invoice_id: invoice.id });
      setForm(null);
      onChange();
    } catch (err) {
      setError(err.message);
    }
  }

  async function remove(p) {
    if (!window.confirm(`Remove the ${money(p.amount)} payment?`)) return;
    try {
      await paymentService.remove(p.id);
      onChange();
    } catch (err) {
      setError(err.message);
    }
  }

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });
  const canPay = canRecord && invoice.status === 'confirmed';

  return (
    <section className="card no-print">
      <div className="row-between">
        <h2>Payments</h2>
        {canPay && !form && (
          <button className="primary" onClick={open}>
            Record payment
          </button>
        )}
      </div>

      {canRecord && invoice.status === 'draft' && <p className="muted">Confirm the invoice to start recording payments.</p>}

      {form && (
        <form className="form-grid payment-form" onSubmit={save}>
          <label>
            Method
            <select value={form.method} onChange={set('method')}>
              {METHODS.map((m) => (
                <option key={m} value={m}>
                  {label(m)}
                </option>
              ))}
            </select>
          </label>
          <label>
            Amount
            <input type="number" min="0.01" step="0.01" max={invoice.amount_due} value={form.amount} onChange={set('amount')} required />
          </label>
          <label>
            Date
            <input type="date" max={todayStr()} value={form.payment_date} onChange={set('payment_date')} required />
          </label>
          <label>
            Note
            <input value={form.note} onChange={set('note')} placeholder="Reference, cheque no., …" />
          </label>
          <div className="form-actions">
            <button className="primary">Save payment</button>
            <button type="button" onClick={() => setForm(null)}>
              Cancel
            </button>
          </div>
        </form>
      )}
      <ErrorText>{error}</ErrorText>

      {invoice.payments.length ? (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Method</th>
                <th>Note</th>
                <th className="num">Amount</th>
                {user.role === 'admin' && <th />}
              </tr>
            </thead>
            <tbody>
              {invoice.payments.map((p) => (
                <tr key={p.id}>
                  <td>{p.payment_date}</td>
                  <td>{label(p.method)}</td>
                  <td>{p.note || '—'}</td>
                  <td className="num">{money(p.amount)}</td>
                  {user.role === 'admin' && (
                    <td>
                      <button className="link" onClick={() => remove(p)}>
                        Remove
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="muted">No payments yet.</p>
      )}
    </section>
  );
}
