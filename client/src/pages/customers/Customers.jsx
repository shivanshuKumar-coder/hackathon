import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PasswordChecklist from '../../components/common/PasswordChecklist.jsx';
import { ErrorText, PageHeader } from '../../components/ui/index.jsx';
import { useFetch } from '../../hooks/useFetch.js';
import { customerService } from '../../services/subscriptionService.js';
import { isStrongPassword } from '../../utils/passwordRules.js';

const EMPTY = { name: '', email: '', password: '' };

export default function Customers() {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [form, setForm] = useState(null);
  const [error, setError] = useState('');
  const { data, error: loadError, reload } = useFetch(() => customerService.list({ q, limit: 200 }), q);

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  async function save(e) {
    e.preventDefault();
    setError('');
    if (!isStrongPassword(form.password)) return setError('Password does not meet all the rules');
    try {
      const { item } = await customerService.create(form);
      setForm(null);
      reload();
      navigate(`/customers/${item.id}`);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="page">
      <PageHeader title="Customers" subtitle="Everyone who buys from Brightloop.">
        <input className="search" placeholder="Search name or email…" value={q} onChange={(e) => setQ(e.target.value)} />
        {!form && (
          <button className="primary" onClick={() => setForm(EMPTY)}>
            New customer
          </button>
        )}
      </PageHeader>

      <div className={form ? 'grid-2 reverse' : ''}>
        <section className="card">
          <ErrorText>{loadError}</ErrorText>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Status</th>
                  <th>Since</th>
                </tr>
              </thead>
              <tbody>
                {data?.items.map((c) => (
                  <tr key={c.id} className="clickable" onClick={() => navigate(`/customers/${c.id}`)}>
                    <td>{c.name}</td>
                    <td>{c.email}</td>
                    <td>{c.isActive ? 'Active' : 'Disabled'}</td>
                    <td>{new Date(c.createdAt).toLocaleDateString('en-IN')}</td>
                  </tr>
                ))}
                {data && !data.items.length && (
                  <tr>
                    <td colSpan={4} className="muted">
                      No customers found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {data && data.items.length >= 200 && <p className="muted small">Showing the first 200. Search to narrow down.</p>}
        </section>

        {form && (
          <section className="card">
            <h2>New customer</h2>
            <form onSubmit={save}>
              <label>
                Full name
                <input value={form.name} onChange={set('name')} required />
              </label>
              <label>
                Email
                <input type="email" value={form.email} onChange={set('email')} required />
              </label>
              <label>
                Temporary password
                <input type="password" value={form.password} onChange={set('password')} required />
              </label>
              <PasswordChecklist password={form.password} />
              <ErrorText>{error}</ErrorText>
              <div className="form-actions">
                <button className="primary">Create customer</button>
                <button type="button" onClick={() => setForm(null)}>
                  Cancel
                </button>
              </div>
            </form>
          </section>
        )}
      </div>
    </div>
  );
}
