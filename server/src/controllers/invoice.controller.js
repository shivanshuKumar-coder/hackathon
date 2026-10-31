import { runBillingJob } from '../jobs/billing.job.js';
import {
  cancelInvoice,
  confirmDrafts,
  confirmInvoice,
  getInvoiceDetail,
  listInvoices,
  sendInvoice,
} from '../services/invoice.service.js';

export async function list(req, res) {
  res.json(await listInvoices(req.query));
}

export async function get(req, res) {
  res.json({ item: await getInvoiceDetail(Number(req.params.id)) });
}

// Billing day: create every invoice that is due, then close expired subscriptions.
export async function runBilling(req, res) {
  res.json(await runBillingJob());
}

export async function confirmAllDrafts(req, res) {
  res.json({ confirmed: await confirmDrafts() });
}

export async function confirm(req, res) {
  const id = Number(req.params.id);
  await confirmInvoice(id);
  res.json({ item: await getInvoiceDetail(id) });
}

export async function cancel(req, res) {
  const id = Number(req.params.id);
  await cancelInvoice(id);
  res.json({ item: await getInvoiceDetail(id) });
}

export async function send(req, res) {
  const id = Number(req.params.id);
  await sendInvoice(id);
  res.json({ item: await getInvoiceDetail(id) });
}
