import { useState } from 'react';
import PasswordChecklist from '../../components/common/PasswordChecklist.jsx';
import { ErrorText, PageHeader } from '../../components/ui/index.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { authService } from '../../services/authService.js';
import { isStrongPassword } from '../../utils/passwordRules.js';

const EMPTY = { current: '', next: '', confirm: '' };

export default function MyProfile() {
  const { user } = useAuth();
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  async function changePassword(e) {
    e.preventDefault();
    setError('');
    setMessage('');
    if (!isStrongPassword(form.next)) return setError('New password does not meet all the rules');
    if (form.next !== form.confirm) return setError('New passwords do not match');
    try {
      const data = await authService.changePassword(form.current, form.next);
      setMessage(data.message);
      setForm(EMPTY);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="page">
      <PageHeader title="My profile" subtitle="Your account details." />
      <div className="grid-2">
        <section className="card">
          <h2>Account</h2>
          <dl className="details">
            <dt>Name</dt>
            <dd>{user.name}</dd>
            <dt>Email</dt>
            <dd>{user.email}</dd>
            <dt>Sign-in</dt>
            <dd>{[user.hasPassword && 'Email and password', user.hasGoogle && 'Google'].filter(Boolean).join(', ')}</dd>
            <dt>Member since</dt>
            <dd>{user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-IN') : '—'}</dd>
          </dl>
        </section>
        <section className="card">
          <h2>{user.hasPassword ? 'Change password' : 'Set a password'}</h2>
          {!user.hasPassword && <p className="muted small">You signed in with Google. Set a password to also log in with your email.</p>}
          <form onSubmit={changePassword}>
            {user.hasPassword && (
              <label>
                Current password
                <input type="password" value={form.current} onChange={set('current')} required />
              </label>
            )}
            <label>
              New password
              <input type="password" value={form.next} onChange={set('next')} required />
            </label>
            <PasswordChecklist password={form.next} />
            <label>
              Confirm new password
              <input type="password" value={form.confirm} onChange={set('confirm')} required />
            </label>
            <ErrorText>{error}</ErrorText>
            {message && <p className="success">{message}</p>}
            <div className="form-actions">
              <button className="primary">Update password</button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
