import { plain } from '../config/db.js';
import { Invoice } from '../models/Invoice.js';
import { Subscription } from '../models/Subscription.js';
import { User } from '../models/User.js';
import { EmailTakenError, createUser, findUserById, publicUser } from '../services/user.service.js';
import { round2 } from '../utils/calculateAmount.js';
import { contains, fail } from '../utils/http.js';
import { ROLES, validateNewUser } from '../utils/validation.js';

async function createWithRole(req, res, role, key) {
  const { name, email, password } = req.body ?? {};
  const error = validateNewUser({ name, email, password });
  if (error) return res.status(400).json({ error });

  try {
    const user = await createUser({ name, email, password, role });
    res.status(201).json({ [key]: publicUser(user) });
  } catch (err) {
    if (err instanceof EmailTakenError) return res.status(409).json({ error: err.message });
    throw err;
  }
}

// ---- Admin: users and staff ----

export async function listUsers(req, res) {
  const { role } = req.query;
  if (role && !ROLES.includes(role)) return res.status(400).json({ error: 'Unknown role' });
  const rows = await User.find(role ? { role } : {}).sort({ created_at: -1 }).limit(500).lean();
  res.json({ users: rows.map(publicUser) });
}

// Only the admin can add a new member of staff.
export function createStaff(req, res) {
  return createWithRole(req, res, 'staff', 'user');
}

export async function setStatus(req, res) {
  const id = Number(req.params.id);
  const { isActive } = req.body ?? {};
  if (typeof isActive !== 'boolean') return res.status(400).json({ error: 'isActive must be true or false' });
  if (id === req.user.id) return res.status(400).json({ error: 'You cannot disable your own account' });

  const user = await findUserById(id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  await User.updateOne({ _id: id }, { $set: { is_active: isActive } });
  res.json({ user: publicUser(await findUserById(id)) });
}

// ---- Admin and staff: customers ----

export async function listCustomers(req, res) {
  const filter = { role: 'customer' };
  if (req.query.q) filter.$or = [{ name: contains(req.query.q) }, { email: contains(req.query.q) }];
  const rows = await User.find(filter).sort({ name: 1 }).limit(Number(req.query.limit) > 0 ? Math.min(Number(req.query.limit), 500) : 50).lean();
  res.json({ items: rows.map(publicUser) });
}

// Staff can open an account for a customer who has not signed up yet.
export function createCustomer(req, res) {
  return createWithRole(req, res, 'customer', 'item');
}

// One customer with their subscriptions and what they owe.
export async function getCustomer(req, res) {
  const id = Number(req.params.id);
  const user = await User.findOne({ _id: id, role: 'customer' }).lean();
  if (!user) fail(404, 'Customer not found');

  const [subscriptions, owed] = await Promise.all([
    Subscription.find({ customer_id: id }, { number: 1, status: 1, plan_name: 1, billing_period: 1, start_date: 1, expiry_date: 1, recurring_total: 1 })
      .sort({ _id: -1 })
      .lean(),
    Invoice.aggregate([
      { $match: { customer_id: id, status: { $in: ['confirmed', 'paid'] } } },
      {
        $group: {
          _id: null,
          invoiced: { $sum: '$total' },
          paid: { $sum: '$amount_paid' },
          unpaid: { $sum: { $cond: [{ $eq: ['$status', 'confirmed'] }, 1, 0] } },
        },
      },
    ]),
  ]);

  res.json({
    item: {
      ...publicUser(user),
      subscriptions: plain(subscriptions),
      invoiced: round2(owed[0]?.invoiced ?? 0),
      paid: round2(owed[0]?.paid ?? 0),
      amount_due: round2((owed[0]?.invoiced ?? 0) - (owed[0]?.paid ?? 0)),
      unpaid_invoices: owed[0]?.unpaid ?? 0,
    },
  });
}
