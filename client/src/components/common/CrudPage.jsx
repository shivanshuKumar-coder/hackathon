import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { ErrorText, PageHeader } from '../ui/index.jsx';

// A list + form page for simple records, driven by a field config.
//
// service: { list, create, update, remove } from src/services
// fields: [{ name, label, type, required, options, optionsFrom, columns, default, help }]
//   type: text | textarea | number | date | checkbox | select | rows
//   options: [{ value, label }]  or  optionsFrom: { key, load: () => service.list(), label: (row) => string }
//   rows: a sub-table; `columns` uses the same field config.
// columns: [{ key, label, render(row, lookups) }]
export default function CrudPage({ title, subtitle, service, fields, columns, writeRoles = ['admin'], emptyText }) {
  const { user } = useAuth();
  const canWrite = writeRoles.includes(user.role);
  const [items, setItems] = useState([]);
  const [lookups, setLookups] = useState({});
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState('');
  const [listError, setListError] = useState('');
  const [search, setSearch] = useState('');

  const optionSources = useMemo(() => {
    const all = [];
    for (const f of fields) {
      if (f.optionsFrom) all.push(f.optionsFrom);
      for (const c of f.columns ?? []) if (c.optionsFrom) all.push(c.optionsFrom);
    }
    return all;
  }, [fields]);

  async function load() {
    try {
      const data = await service.list({ q: search });
      setItems(data.items);
      setListError('');
    } catch (err) {
      setListError(err.message);
    }
  }

  useEffect(() => {
    load();
  }, [service, search]);

  useEffect(() => {
    Promise.all(optionSources.map((s) => s.load().then((d) => [s.key, d.items]))).then((pairs) =>
      setLookups(Object.fromEntries(pairs)),
    );
  }, [optionSources]);

  function blank() {
    const v = {};
    for (const f of fields) v[f.name] = f.default ?? (f.type === 'rows' ? [] : f.type === 'checkbox' ? true : '');
    return v;
  }

  function startEdit(item) {
    setError('');
    if (!item) return setEditing(blank());
    const v = { id: item.id };
    for (const f of fields) {
      const raw = item[f.name];
      if (f.type === 'checkbox') v[f.name] = Boolean(raw);
      else if (f.type === 'rows') v[f.name] = (raw ?? []).map((r) => ({ ...r }));
      else v[f.name] = raw ?? '';
    }
    setEditing(v);
  }

  async function save(e) {
    e.preventDefault();
    setError('');
    try {
      const body = { ...editing };
      if (editing.id) await service.update(editing.id, body);
      else await service.create(body);
      setEditing(null);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function remove() {
    if (!window.confirm('Delete this record?')) return;
    try {
      await service.remove(editing.id);
      setEditing(null);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="page">
      <PageHeader title={title} subtitle={subtitle}>
        <input className="search" placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)} />
        {canWrite && (
          <button className="primary" onClick={() => startEdit(null)}>
            New
          </button>
        )}
      </PageHeader>

      <div className={editing ? 'grid-2 reverse' : ''}>
        <section className="card">
          <ErrorText>{listError}</ErrorText>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  {columns.map((c) => (
                    <th key={c.key}>{c.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className={canWrite ? 'clickable' : ''} onClick={() => canWrite && startEdit(item)}>
                    {columns.map((c) => (
                      <td key={c.key}>{c.render ? c.render(item, lookups) : item[c.key]}</td>
                    ))}
                  </tr>
                ))}
                {!items.length && (
                  <tr>
                    <td colSpan={columns.length} className="muted">
                      {emptyText || 'Nothing here yet.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {editing && (
          <section className="card">
            <h2>{editing.id ? `Edit ${title.replace(/s$/, '').toLowerCase()}` : `New ${title.replace(/s$/, '').toLowerCase()}`}</h2>
            <form onSubmit={save}>
              {fields.map((f) => (
                <FieldInput
                  key={f.name}
                  field={f}
                  value={editing[f.name]}
                  lookups={lookups}
                  onChange={(v) => setEditing({ ...editing, [f.name]: v })}
                />
              ))}
              <ErrorText>{error}</ErrorText>
              <div className="form-actions">
                <button className="primary">Save</button>
                <button type="button" onClick={() => setEditing(null)}>
                  Cancel
                </button>
                {editing.id && (
                  <button type="button" className="danger" onClick={remove}>
                    Delete
                  </button>
                )}
              </div>
            </form>
          </section>
        )}
      </div>
    </div>
  );
}

function optionsFor(field, lookups) {
  if (field.options) return field.options;
  if (field.optionsFrom) {
    return (lookups[field.optionsFrom.key] ?? []).map((r) => ({ value: r.id, label: field.optionsFrom.label(r) }));
  }
  return [];
}

export function FieldInput({ field, value, onChange, lookups, compact }) {
  const input = (() => {
    switch (field.type) {
      case 'textarea':
        return <textarea rows={3} value={value ?? ''} onChange={(e) => onChange(e.target.value)} />;
      case 'number':
        return (
          <input type="number" step={field.step ?? 'any'} min={field.min} value={value ?? ''} required={field.required} onChange={(e) => onChange(e.target.value)} />
        );
      case 'date':
        return <input type="date" value={value ?? ''} required={field.required} onChange={(e) => onChange(e.target.value)} />;
      case 'checkbox':
        return <input type="checkbox" checked={Boolean(value)} onChange={(e) => onChange(e.target.checked)} />;
      case 'select':
        return (
          <select value={value ?? ''} required={field.required} onChange={(e) => onChange(e.target.value)}>
            <option value="">{field.placeholder ?? '—'}</option>
            {optionsFor(field, lookups).map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        );
      case 'rows':
        return <RowsInput field={field} rows={value ?? []} onChange={onChange} lookups={lookups} />;
      default:
        return <input value={value ?? ''} required={field.required} onChange={(e) => onChange(e.target.value)} />;
    }
  })();

  if (compact) return input;
  if (field.type === 'checkbox') {
    return (
      <label className="check">
        {input} {field.label}
      </label>
    );
  }
  return (
    <label>
      {field.label}
      {input}
      {field.help && <span className="muted small">{field.help}</span>}
    </label>
  );
}

function RowsInput({ field, rows, onChange, lookups }) {
  const update = (i, key, v) => onChange(rows.map((r, j) => (j === i ? { ...r, [key]: v } : r)));
  const add = () => onChange([...rows, Object.fromEntries(field.columns.map((c) => [c.name, c.default ?? '']))]);
  const remove = (i) => onChange(rows.filter((_, j) => j !== i));

  return (
    <div className="rows-input">
      {rows.length > 0 && (
        <table>
          <thead>
            <tr>
              {field.columns.map((c) => (
                <th key={c.name}>{c.label}</th>
              ))}
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={row.id ?? `new-${i}`}>
                {field.columns.map((c) => (
                  <td key={c.name}>
                    <FieldInput compact field={c} value={row[c.name]} lookups={lookups} onChange={(v) => update(i, c.name, v)} />
                  </td>
                ))}
                <td>
                  <button type="button" className="link" onClick={() => remove(i)}>
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <button type="button" onClick={add}>
        + {field.addLabel ?? 'Add row'}
      </button>
    </div>
  );
}
