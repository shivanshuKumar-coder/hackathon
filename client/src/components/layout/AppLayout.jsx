import { Outlet } from 'react-router-dom';
import Navbar from '../Navbar.jsx';
import Sidebar from '../Sidebar.jsx';

export default function AppLayout() {
  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-main">
        <Navbar />
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
