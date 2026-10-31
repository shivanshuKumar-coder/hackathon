import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import PasswordChecklist from '../../components/common/PasswordChecklist.jsx';
import AuthLayout from '../../components/layout/AuthLayout.jsx';
import { authService } from '../../services/authService.js';
import { isStrongPassword } from '../../utils/passwordRules.js';

export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    if (!isStrongPassword(password)) return setError('Password does not meet all the rules below');
    if (password !== confirm) return setError('Passwords do not match');
    setBusy(true);
    try {
      const data = await authService.resetPassword(token, password);
      setMessage(data.message);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (!token) {
    return (
      <AuthLayout title="Reset password">
        <p className="error">This reset link is missing its token. Please request a new one.</p>
        <div className="auth-links">
          <Link to="/forgot-password">Request a new link</Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Choose a new password">
      {message ? (
        <>
          <p className="success">{message}</p>
          <Link className="button primary" to="/login">
            Go to log in
          </Link>
        </>
      ) : (
        <form onSubmit={onSubmit}>
          <label>
            New password
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoFocus />
          </label>
          <PasswordChecklist password={password} />
          <label>
            Confirm new password
            <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
          </label>
          {error && <p className="error">{error}</p>}
          <button className="primary" disabled={busy}>
            {busy ? 'Saving…' : 'Update password'}
          </button>
        </form>
      )}
    </AuthLayout>
  );
}
