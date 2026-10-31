import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ErrorText, PageHeader, Stat } from '../../components/ui/index.jsx';
import { useFetch } from '../../hooks/useFetch.js';
import { reportService } from '../../services/invoiceService.js';
import { label, money } from '../../utils/format.js';

const monthName = (ym) => new Date(`${ym}-01T00:00:00`).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });

function Bars({ rows, valueKey, labelKey, format = money, labelFormat = (x) => x }) {
  const max = Math.max(1, ...rows.map((r) => r[valueKey]));
  if (!rows.length) return <p className="muted">No data for this period.</p>;
  return (
    <div className="bars">
      {rows.map((r) => (
        <div key={r[labelKey]} className="bar-row">
          <span className="bar-label">{labelFormat(r[labelKey])}</span>
          <div className="bar-track">
            <div className="bar" style={{ width: `${(r[valueKey] / max) * 100}%` }} />
          </div>
          <span className="bar-value">{format(r[valueKey])}</span>
        </div>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [range, setRange] = useState({ from: '', to: '' });
  const { data, error } = useFetch(() => reportService.summary(range), JSON.stringify(range));

  const subStatuses = ['active', 'paused', 'confirmed', 'quotation', 'draft', 'closed'];

  return (
    <div className="page">
      <PageHeader title="Dashboard" subtitle="Subscriptions, revenue, payments and overdue invoices at a glance.">
        <label className="inline-label">
          From <input type="date" value={range.from} onChange={(e) => setRange({ ...range, from: e.target.value })} />
        </label>
        <label className="inline-label">
          To <input type="date" value={range.to} onChange={(e) => setRange({ ...range, to: e.target.value })} />
        </label>
      </PageHeader>
      <ErrorText>{error}</ErrorText>

      {data && (
        <>
          <p className="muted small">
            Showing revenue from {data.range.from} to {data.range.to}
          </p>
          <div className="stats">
            <Stat title="Active subscriptions" value={data.subscriptions.active.toLocaleString('en-IN')} hint={`MRR ${money(data.mrr)}`} />
            <Stat title="Revenue received" value={money(data.revenue.amount)} hint={`${data.revenue.count} payments`} tone="good" />
            <Stat title="Invoiced" value={money(data.invoiced.amount)} hint={`${data.invoiced.count} invoices`} />
            <Stat title="Outstanding" value={money(data.outstanding.amount)} hint={`${data.outstanding.count} unpaid invoices`} tone="warn" />
            <Stat title="Overdue" value={money(data.overdue.amount)} hint={`${data.overdue.count} invoices past due`} tone="bad" />
          </div>

          <div className="grid-2 even">
            <section className="card">
              <h2>Revenue by month</h2>
              <Bars rows={data.revenueByMonth} valueKey="amount" labelKey="month" labelFormat={monthName} />
            </section>
            <section className="card">
              <h2>Subscriptions by status</h2>
              <Bars
                rows={subStatuses.map((s) => ({ status: s, n: data.subscriptions.byStatus[s] ?? 0 }))}
                valueKey="n"
                labelKey="status"
                format={(n) => n.toLocaleString('en-IN')}
                labelFormat={label}
              />
            </section>
            <section className="card">
              <h2>Payments by method</h2>
              <Bars rows={data.revenueByMethod} valueKey="amount" labelKey="method" labelFormat={label} />
            </section>
            <section className="card">
              <div className="row-between">
                <h2>Oldest overdue invoices</h2>
                <Link to="/invoices" state={{ filter: 'overdue=1' }}>
                  View all
                </Link>
              </div>
              {data.overdueInvoices.length ? (
                <table>
                  <tbody>
                    {data.overdueInvoices.map((i) => (
                      <tr key={i.id} className="clickable" onClick={() => navigate(`/invoices/${i.id}`)}>
                        <td>{i.number}</td>
                        <td>{i.customer_name}</td>
                        <td className="muted">due {i.due_date}</td>
                        <td className="num">{money(i.amount_due)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="muted">Nothing overdue.</p>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
}
