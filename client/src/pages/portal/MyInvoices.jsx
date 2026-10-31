import Invoices from '../invoices/Invoices.jsx';

// The customer's own invoices (drafts are never shown to customers).
export default function MyInvoices() {
  return <Invoices portal />;
}
