import { NavLink } from 'react-router-dom';
import logo from '../assets/logo.svg';
import { useAuth } from '../context/AuthContext.jsx';

// Menu per role.
const WORK = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/subscriptions', label: 'Subscriptions' },
  { to: '/quotations', label: 'Quotations' },
  { to: '/invoices', label: 'Invoices' },
  { to: '/payments', label: 'Payments' },
  { to: '/customers', label: 'Customers' },
  { to: '/templates', label: 'Templates' },
];

const SETUP = [
  { to: '/products', label: 'Products' },
  { to: '/plans', label: 'Plans' },
  { to: '/taxes', label: 'Taxes' },
  { to: '/discounts', label: 'Discounts' },
  { to: '/staff', label: 'Staff' },
];

const PORTAL = [
  { to: '/portal', label: 'My subscriptions', end: true },
  { to: '/portal/invoices', label: 'My invoices' },
  { to: '/portal/profile', label: 'My profile' },
];

function Section({ title, items }) {
  return (
    <div className="side-section">
      {title && <div className="side-title">{title}</div>}
      {items.map((item) => (
        <NavLink key={item.to} to={item.to} end={item.end}>
          {item.label}
        </NavLink>
      ))}
    </div>
  );
}

export default function Sidebar() {
  const { user } = useAuth();
  return (
    <aside className="sidebar">
      <div className="brand">
        <img src={logo} alt="" width="28" height="28" />
        Brightloop
      </div>
      <nav>
        {user.role === 'customer' ? (
          <Section items={PORTAL} />
        ) : (
          <>
            <Section title="Work" items={WORK} />
            {user.role === 'admin' && <Section title="Setup" items={SETUP} />}
          </>
        )}
      </nav>
    </aside>
  );
}
