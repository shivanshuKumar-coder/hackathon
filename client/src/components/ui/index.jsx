import { label } from '../../utils/format.js';

export function StatusBadge({ status, overdue }) {
  if (overdue) return <span className="badge st-overdue">Overdue</span>;
  return <span className={`badge st-${status}`}>{label(status)}</span>;
}

export function Pager({ page, pageSize, total, onPage }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <div className="pager">
      <span className="muted">
        {total ? `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)} of ${total}` : 'No results'}
      </span>
      <button disabled={page <= 1} onClick={() => onPage(page - 1)}>
        Previous
      </button>
      <button disabled={page >= pages} onClick={() => onPage(page + 1)}>
        Next
      </button>
    </div>
  );
}

export function PageHeader({ title, subtitle, children }) {
  return (
    <div className="page-header">
      <div>
        <h1>{title}</h1>
        {subtitle && <p className="muted">{subtitle}</p>}
      </div>
      <div className="actions">{children}</div>
    </div>
  );
}

export function ErrorText({ children }) {
  return children ? <p className="error">{children}</p> : null;
}

export function Stat({ title, value, hint, tone }) {
  return (
    <div className={`card stat ${tone ? `tone-${tone}` : ''}`}>
      <span className="muted">{title}</span>
      <strong>{value}</strong>
      {hint && <span className="muted small">{hint}</span>}
    </div>
  );
}
