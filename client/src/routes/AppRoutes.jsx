import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from '../components/ProtectedRoute.jsx';
import AppLayout from '../components/layout/AppLayout.jsx';
import { HOME_BY_ROLE, useAuth } from '../context/AuthContext.jsx';
import NotFound from '../pages/NotFound.jsx';
import Dashboard from '../pages/admin/Dashboard.jsx';
import Discounts from '../pages/admin/Discounts.jsx';
import Plans from '../pages/admin/Plans.jsx';
import Products from '../pages/admin/Products.jsx';
import Staff from '../pages/admin/Staff.jsx';
import Taxes from '../pages/admin/Taxes.jsx';
import ForgotPassword from '../pages/auth/ForgotPassword.jsx';
import Login from '../pages/auth/Login.jsx';
import Register from '../pages/auth/Register.jsx';
import ResetPassword from '../pages/auth/ResetPassword.jsx';
import CustomerDetails from '../pages/customers/CustomerDetails.jsx';
import Customers from '../pages/customers/Customers.jsx';
import InvoiceDetails from '../pages/invoices/InvoiceDetails.jsx';
import Invoices from '../pages/invoices/Invoices.jsx';
import Payments from '../pages/payments/Payments.jsx';
import MyInvoices from '../pages/portal/MyInvoices.jsx';
import MyProfile from '../pages/portal/MyProfile.jsx';
import MySubscriptions from '../pages/portal/MySubscriptions.jsx';
import Quotations from '../pages/quotations/Quotations.jsx';
import Templates from '../pages/quotations/Templates.jsx';
import CreateSubscription from '../pages/subscriptions/CreateSubscription.jsx';
import SubscriptionDetails from '../pages/subscriptions/SubscriptionDetails.jsx';
import SubscriptionList from '../pages/subscriptions/SubscriptionList.jsx';

function Home() {
  const { user, loading } = useAuth();
  if (loading) return <div className="center muted">Loading…</div>;
  return <Navigate to={user ? HOME_BY_ROLE[user.role] : '/login'} replace />;
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          {/* Admin only: setup */}
          <Route element={<ProtectedRoute roles={['admin']} />}>
            <Route path="/products" element={<Products />} />
            <Route path="/plans" element={<Plans />} />
            <Route path="/taxes" element={<Taxes />} />
            <Route path="/discounts" element={<Discounts />} />
            <Route path="/staff" element={<Staff />} />
          </Route>

          {/* Admin and internal staff: day-to-day work */}
          <Route element={<ProtectedRoute roles={['admin', 'staff']} />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/subscriptions" element={<SubscriptionList />} />
            <Route path="/subscriptions/new" element={<CreateSubscription />} />
            <Route path="/subscriptions/:id" element={<SubscriptionDetails />} />
            <Route path="/subscriptions/:id/edit" element={<CreateSubscription />} />
            <Route path="/quotations" element={<Quotations />} />
            <Route path="/templates" element={<Templates />} />
            <Route path="/invoices" element={<Invoices />} />
            <Route path="/invoices/:id" element={<InvoiceDetails />} />
            <Route path="/payments" element={<Payments />} />
            <Route path="/customers" element={<Customers />} />
            <Route path="/customers/:id" element={<CustomerDetails />} />
          </Route>

          {/* Customer portal: own data only */}
          <Route element={<ProtectedRoute roles={['customer']} />}>
            <Route path="/portal" element={<MySubscriptions />} />
            <Route path="/portal/subscriptions/:id" element={<SubscriptionDetails portal />} />
            <Route path="/portal/invoices" element={<MyInvoices />} />
            <Route path="/portal/invoices/:id" element={<InvoiceDetails portal />} />
            <Route path="/portal/profile" element={<MyProfile />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
