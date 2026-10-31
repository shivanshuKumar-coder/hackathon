import { useEffect, useState } from 'react';
import PasswordChecklist from '../../components/common/PasswordChecklist.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { userService } from '../../services/subscriptionService.js';
import { isStrongPassword } from '../../utils/passwordRules.js';

const EMPTY = { name: '', email: '', password: '' };

export default function Staff() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState([]);
  const [roleFilter, setRoleFilter] = useState('');
  const [form, setForm] = useState(EMPTY);
  const [formError, setFormError] = useState('');
  const [notice, setNotice] = useState('');
  const [loadError, setLoadError] = useState('');

  async function load() {
    try {
      const data = await userService.list({ role: roleFilter });
      setUsers(data.users);
      setLoadError('');
    } catch (err) {
      setLoadError(err.message);
    }
  }

  useEffect(() => {
    load();
  }, [roleFilter]);

  async function addStaff(e) {
    e.preventDefault();
    setFormError('');
    setNotice('');
    if (!isStrongPassword(form.password)) return setFormError('Password does not meet all the rules');
    try {
      const data = await userService.createStaff(form);
      setForm(EMPTY);
      setNotice(`${data.user.name} was added as staff.`);
      load();
    } catch (err) {
      setFormError(err.message);
    }
  }

  async function toggleActive(u) {
    try {
      await userService.setActive(u.id, !u.isActive);
      load();
    } catch (err) {
      setLoadError(err.message);
    }
  }

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  return (
    <div className="page">
      <h1>Staff &amp; users</h1>
      <p className="muted">Only the admin can add internal staff. Customers create their own accounts.</p>

      <div className="grid-2">
        <section className="card">
          <h2>Add staff member</h2>
          <form onSubmit={addStaff}>
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
            {formError && <p className="error">{formError}</p>}
            {notice && <p className="success">{notice}</p>}
            <button className="primary">Add staff</button>
          </form>
        </section>

        <section className="card">
          <div className="row-between">
            <h2>All users</h2>
            <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
              <option value="">All roles</option>
              <option value="admin">Admin</option>
              <option value="staff">Staff</option>
              <option value="customer">Customer</option>
            </select>
          </div>
          {loadError && <p className="error">{loadError}</p>}
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>{u.name}</td>
                    <td>{u.email}</td>
                    <td>
                      <span className={`badge role-${u.role}`}>{u.role}</span>
                    </td>
                    <td>{u.isActive ? 'Active' : 'Disabled'}</td>
                    <td>
                      {u.id !== me.id && (
                        <button className="link" onClick={() => toggleActive(u)}>
                          {u.isActive ? 'Disable' : 'Enable'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {!users.length && (
                  <tr>
                    <td colSpan={5} className="muted">
                      No users yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
