import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { METHODS } from '../../components/common/PaymentPanel.jsx';
import { ErrorText, PageHeader, Pager } from '../../components/ui/index.jsx';
import { useFetch } from '../../hooks/useFetch.js';
import { paymentService } from '../../services/paymentService.js';
import { label, money } from '../../utils/format.js';

export default function Payments() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState({ method: '', from: '', to: '', q: '' });
  const [page, setPage] = useState(1);

  const params = { ...filters, page };
  const { data, error } = useFetch(() => paymentService.list(params), JSON.stringify(params));

  const set = (key) => (e) => {
    setFilters({ ...filters, [key]: e.target.value });
    setPage(1);
  };

  return (
    <div className="page">
      <PageHeader title="Payments" subtitle="Money received, matched to its invoice." />

      <div className="filters">
        <input className="search" placeholder="Invoice or customer…" value={filters.q} onChange={set('q')} />
        <select value={filters.method} onChange={set('method')}>
          <option value="">All methods</option>
          {METHODS.map((m) => (
            <option key={m} value={m}>
              {label(m)}
            </option>
          ))}
        </select>
        <label className="inline-label">
          From <input type="date" value={filters.from} onChange={set('from')} />
        </label>
        <label className="inline-label">
          To <input type="date" value={filters.to} onChange={set('to')} />
        </label>
        {data && (
          <span className="pill">
            {data.total} payments · {money(data.totalAmount)}
          </span>
        )}
      </div>

      <section className="card">
        <ErrorText>{error}</ErrorText>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Invoice</th>
                <th>Customer</th>
                <th>Method</th>
                <th>Note</th>
                <th className="num">Amount</th>
              </tr>
            </thead>
            <tbody>
              {data?.items.map((p) => (
                <tr key={p.id} className="clickable" onClick={() => navigate(`/invoices/${p.invoice_id}`)}>
                  <td>{p.payment_date}</td>
                  <td>{p.invoice_number}</td>
                  <td>{p.customer_name}</td>
                  <td>{label(p.method)}</td>
                  <td>{p.note || '—'}</td>
                  <td className="num">{money(p.amount)}</td>
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
