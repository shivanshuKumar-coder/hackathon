import { deletePayment, listPayments, recordPayment } from '../services/payment.service.js';

export async function list(req, res) {
  res.json(await listPayments(req.query));
}

export async function create(req, res) {
  res.status(201).json({ item: await recordPayment(req.body ?? {}, req.user.id) });
}

// Removing a wrongly entered payment. Admin only (see payment.routes.js).
export async function remove(req, res) {
  await deletePayment(Number(req.params.id));
  res.json({ ok: true });
}
