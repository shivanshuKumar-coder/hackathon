import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const ROLE_LABEL = { admin: 'Admin', staff: 'Internal staff', customer: 'Customer' };

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  return (
    <header className="navbar">
      <div className="who">
        <span className="avatar" aria-hidden="true">
          {user.name.charAt(0).toUpperCase()}
        </span>
        <span>{user.name}</span>
        <span className={`badge role-${user.role}`}>{ROLE_LABEL[user.role]}</span>
      </div>
      <button className="link" onClick={handleLogout}>
        Log out
      </button>
    </header>
  );
}
