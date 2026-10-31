import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import PasswordChecklist from '../../components/common/PasswordChecklist.jsx';
import GoogleButton from '../../components/common/GoogleButton.jsx';
import AuthLayout from '../../components/layout/AuthLayout.jsx';
import { HOME_BY_ROLE, useAuth } from '../../context/AuthContext.jsx';
import { isStrongPassword } from '../../utils/passwordRules.js';

export default function Register() {
  const { user, signup } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={HOME_BY_ROLE[user.role]} replace />;

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    if (!isStrongPassword(form.password)) return setError('Password does not meet all the rules below');
    if (form.password !== form.confirm) return setError('Passwords do not match');
    setBusy(true);
    try {
      const u = await signup(form.name, form.email, form.password);
      navigate(HOME_BY_ROLE[u.role], { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthLayout title="Create your account" subtitle="See and manage your subscriptions and invoices in one place.">
      <form onSubmit={onSubmit}>
        <label>
          Full name
          <input value={form.name} onChange={set('name')} required autoFocus />
        </label>
        <label>
          Email
          <input type="email" value={form.email} onChange={set('email')} required />
        </label>
        <label>
          Password
          <input type="password" value={form.password} onChange={set('password')} required />
        </label>
        <PasswordChecklist password={form.password} />
        <label>
          Confirm password
          <input type="password" value={form.confirm} onChange={set('confirm')} required />
        </label>
        {error && <p className="error">{error}</p>}
        <button className="primary" disabled={busy}>
          {busy ? 'Creating account…' : 'Sign up'}
        </button>
      </form>
      <GoogleButton text="signup_with" />
      <div className="auth-links">
        <span>
          Already have an account? <Link to="/login">Log in</Link>
        </span>
      </div>
    </AuthLayout>
  );
}
