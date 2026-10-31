import { nextId, plain } from '../config/db.js';
import { clean } from '../middlewares/validate.middleware.js';
import { Discount } from '../models/Discount.js';
import { Invoice } from '../models/Invoice.js';
import { Plan } from '../models/Plan.js';
import { Product } from '../models/Product.js';
import { QuotationTemplate } from '../models/QuotationTemplate.js';
import { Subscription } from '../models/Subscription.js';
import { User } from '../models/User.js';
import { lineAmount, round2, subscriptionTotals } from '../utils/calculateAmount.js';
import { addDays, addPeriod, today } from '../utils/dates.js';
import { generateSubscriptionNumber } from '../utils/generateSubscriptionNumber.js';
import { fail } from '../utils/http.js';
import { sendMail } from './email.service.js';
import { taxRate } from './tax.service.js';

export const SUBSCRIPTION_SPEC = {
  customer_id: { type: 'int', required: true },
  plan_id: { type: 'int', required: true },
  template_id: { type: 'int' },
  discount_id: { type: 'int' },
  quantity: { type: 'number', min: 1, label: 'quantity' },
  start_date: { type: 'date', required: true },
  expiry_date: { type: 'date' },
  payment_terms_days: { type: 'int', min: 0, max: 365, default: 0, label: 'payment terms' },
  notes: { type: 'string', max: 2000 },
};

const LINE_SPEC = {
  product_id: { type: 'int' },
  variant_id: { type: 'int' },
  description: { type: 'string', max: 300 },
  quantity: { type: 'number', min: 0.01, default: 1 },
  unit_price: { type: 'number', min: 0 },
};

export async function getPlan(id) {
  const plan = await Plan.findById(id).lean();
  if (!plan) fail(400, 'Plan not found');
  return plan;
}

// Turns the request (or a quotation template) into priced subscription lines.
// The plan's own fee is always the first line: plan price × quantity (seats).
async function buildLines(data, plan, bodyLines) {
  let raw = Array.isArray(bodyLines) ? bodyLines.filter((l) => !l.is_plan) : [];
  if (!raw.length && data.template_id && bodyLines === undefined) {
    raw = (await QuotationTemplate.findById(data.template_id).lean())?.lines ?? [];
  }

  const lines = [];
  if (plan.price > 0) {
    lines.push({
      is_plan: true,
      product_id: null,
      variant_id: null,
      description: `${plan.name} (${plan.billing_period})`,
      quantity: data.quantity,
      unit_price: plan.price,
      tax_rate: await taxRate(plan.tax_id),
    });
  }

  for (const input of raw) {
    const line = clean(input, LINE_SPEC);
    if (line.product_id) {
      const product = await Product.findById(line.product_id).lean();
      if (!product || !product.is_active) fail(400, 'A selected product is not available');
      let variant = null;
      if (line.variant_id) {
        variant = product.variants.find((v) => v._id === line.variant_id);
        if (!variant) fail(400, `The selected variant does not belong to ${product.name}`);
      }
      lines.push({
        is_plan: false,
        product_id: product._id,
        variant_id: variant?._id ?? null,
        description: line.description || (variant ? `${product.name} (${variant.attribute}: ${variant.value})` : product.name),
        quantity: line.quantity,
        unit_price: line.unit_price ?? round2(product.sales_price + (variant?.extra_price ?? 0)),
        tax_rate: await taxRate(product.tax_id),
      });
    } else {
      if (!line.description) fail(400, 'Each line needs a product or a description');
      if (line.unit_price == null) fail(400, `Unit price is required for "${line.description}"`);
      lines.push({ is_plan: false, product_id: null, variant_id: null, ...line, tax_rate: 0 });
    }
  }

  if (!lines.length) fail(400, 'Add at least one product line (this plan has no price of its own)');
  const first = await nextId('subscriptions.lines', lines.length);
  lines.forEach((l, i) => {
    l._id = first - lines.length + 1 + i;
    l.amount = lineAmount(l.quantity, l.unit_price);
  });
  return lines;
}

async function validateSubscription(data, plan) {
  const customer = await User.findOne({ _id: data.customer_id, role: 'customer' }).lean();
  if (!customer) fail(400, 'Customer not found');
  if (!plan.is_active) fail(400, 'This plan is no longer offered');
  if (plan.start_date && data.start_date < plan.start_date) fail(400, `This plan is available from ${plan.start_date}`);
  if (plan.end_date && data.start_date > plan.end_date) fail(400, `This plan was available until ${plan.end_date}`);

  data.quantity = data.quantity ?? plan.min_quantity;
  if (data.quantity < plan.min_quantity) fail(400, `This plan needs a minimum quantity of ${plan.min_quantity}`);

  if (!data.expiry_date && plan.end_date) data.expiry_date = plan.end_date;
  if (data.expiry_date && data.expiry_date < data.start_date) fail(400, 'Expiry date must be after the start date');

  if (data.template_id && !(await QuotationTemplate.exists({ _id: data.template_id }))) {
    fail(400, 'Quotation template not found');
  }
  if (data.discount_id) {
    const d = await Discount.findById(data.discount_id).lean();
    if (!d) fail(400, 'Discount not found');
    if (d.scope !== 'subscription') fail(400, 'Only whole-subscription discounts can be attached here');
  }
  return customer;
}

export async function createSubscription(body, userId) {
  const data = clean(body, SUBSCRIPTION_SPEC);
  const plan = await getPlan(data.plan_id);
  const customer = await validateSubscription(data, plan);
  const lines = await buildLines(data, plan, body.lines);

  const id = await nextId('subscriptions');
  await Subscription.create({
    _id: id,
    number: generateSubscriptionNumber(id),
    ...data,
    customer_name: customer.name,
    customer_email: customer.email,
    plan_name: plan.name,
    billing_period: plan.billing_period,
    created_by: userId,
    lines,
    ...subscriptionTotals(lines),
  });
  return id;
}

export async function updateSubscription(id, body) {
  const sub = await getSubscriptionRow(id);
  if (!['draft', 'quotation'].includes(sub.status)) fail(400, 'Only draft or quotation subscriptions can be edited');

  const data = clean(body, SUBSCRIPTION_SPEC);
  const plan = await getPlan(data.plan_id);
  const customer = await validateSubscription(data, plan);
  const lines = await buildLines(data, plan, body.lines ?? []);

  // The status condition stops an edit racing with a confirm.
  const result = await Subscription.updateOne(
    { _id: id, status: { $in: ['draft', 'quotation'] } },
    {
      $set: {
        ...data,
        customer_name: customer.name,
        customer_email: customer.email,
        plan_name: plan.name,
        billing_period: plan.billing_period,
        lines,
        ...subscriptionTotals(lines),
      },
    },
  );
  if (!result.matchedCount) fail(409, 'This subscription changed status meanwhile. Reload and try again.');
}

export async function getSubscriptionRow(id) {
  const sub = await Subscription.findById(id).lean();
  if (!sub) fail(404, 'Subscription not found');
  return sub;
}

export async function getSubscriptionDetail(id, role) {
  const sub = await getSubscriptionRow(id);
  const plan = await getPlan(sub.plan_id);
  const [template, discount, invoices] = await Promise.all([
    sub.template_id ? QuotationTemplate.findById(sub.template_id, { name: 1 }).lean() : null,
    sub.discount_id ? Discount.findById(sub.discount_id, { name: 1 }).lean() : null,
    Invoice.find(
      { subscription_id: id },
      { number: 1, period_start: 1, period_end: 1, invoice_date: 1, due_date: 1, status: 1, total: 1, amount_paid: 1 },
    )
      .sort({ period_start: -1 })
      .lean(),
  ]);
  return {
    ...plain(sub),
    lines: plain([...sub.lines].sort((a, b) => Number(b.is_plan) - Number(a.is_plan) || a._id - b._id)),
    plan_price: plan.price,
    template_name: template?.name ?? null,
    discount_name: discount?.name ?? null,
    invoices: plain(invoices),
    actions: availableActions(sub, plan, role),
  };
}

// ---- Status flow: Draft → Quotation → Confirmed → Active → Closed (plus pause / renew) ----

const ACTIONS = {
  send: { from: ['draft'], label: 'Send quotation' },
  confirm: { from: ['draft', 'quotation'], label: 'Confirm' },
  to_draft: { from: ['quotation'], label: 'Back to draft' },
  activate: { from: ['confirmed'], label: 'Activate' },
  pause: { from: ['active'], plan: 'pausable', label: 'Pause' },
  resume: { from: ['paused'], label: 'Resume' },
  renew: { from: ['active', 'paused'], plan: 'renewable', label: 'Renew' },
  close: { from: ['draft', 'quotation', 'confirmed', 'active', 'paused'], label: 'Close' },
};

// What a customer may do on their own subscription in the portal.
const CUSTOMER_ACTIONS = ['confirm', 'pause', 'resume', 'close'];

function actionAllowed(name, sub, plan, role) {
  const a = ACTIONS[name];
  if (!a || !a.from.includes(sub.status)) return false;
  if (a.plan && !plan[a.plan]) return false;
  // "Closed early" only if the plan allows it; drafts and quotations can always be dropped.
  if (name === 'close' && ['active', 'paused'].includes(sub.status) && !plan.closable) return false;
  if (name === 'renew' && !sub.expiry_date) return false;
  if (role === 'customer') {
    if (!CUSTOMER_ACTIONS.includes(name)) return false;
    if (name === 'confirm' && sub.status !== 'quotation') return false;
  }
  return true;
}

export function availableActions(sub, plan, role) {
  return Object.keys(ACTIONS)
    .filter((name) => actionAllowed(name, sub, plan, role))
    .map((name) => ({ name, label: ACTIONS[name].label }));
}

export async function applyAction(id, action, role) {
  const sub = await getSubscriptionRow(id);
  const plan = await getPlan(sub.plan_id);
  if (!actionAllowed(action, sub, plan, role)) {
    fail(400, `You cannot ${action} this subscription (status: ${sub.status}) on its plan`);
  }

  const now = today();
  let set;
  let email = null;

  switch (action) {
    case 'send': {
      const validity = sub.template_id
        ? (await QuotationTemplate.findById(sub.template_id).lean())?.validity_days ?? 30
        : 30;
      const validUntil = addDays(now, validity);
      set = { status: 'quotation', quotation_valid_until: validUntil };
      email = { subject: `Quotation ${sub.number}`, text: `Your quotation ${sub.number} is ready. It is valid until ${validUntil}.` };
      break;
    }
    case 'confirm':
      if (sub.status === 'quotation' && sub.quotation_valid_until && sub.quotation_valid_until < now) {
        fail(400, 'This quotation has expired. Send it again to renew its validity.');
      }
      set = { status: 'confirmed' };
      break;
    case 'to_draft':
      set = { status: 'draft', quotation_valid_until: null };
      break;
    case 'activate':
      set = { status: 'active', periods_billed: 0, next_invoice_date: sub.start_date };
      break;
    case 'pause':
      set = { status: 'paused' };
      break;
    case 'resume': {
      // Periods that passed while paused are skipped, not billed later.
      let k = sub.periods_billed;
      while (addPeriod(sub.start_date, plan.billing_period, k) < now) k++;
      set = { status: 'active', periods_billed: k, next_invoice_date: addPeriod(sub.start_date, plan.billing_period, k) };
      break;
    }
    case 'renew':
      set = { expiry_date: addPeriod(sub.expiry_date, plan.billing_period, 1) };
      break;
    case 'close':
      set = { status: 'closed', closed_at: new Date() };
      break;
  }

  // Only applies if nobody changed the status in between (e.g. two clicks).
  const result = await Subscription.updateOne({ _id: id, status: sub.status }, { $set: set });
  if (!result.matchedCount) fail(409, 'This subscription changed meanwhile. Reload and try again.');

  if (email) {
    await sendMail({ to: sub.customer_email, ...email }).catch((err) => console.error('[mail] failed:', err.message));
  }
}

// Closes subscriptions whose plan closes them automatically once the expiry date has passed.
export async function closeExpiredSubscriptions() {
  const now = today();
  const autoClosePlans = (await Plan.find({ auto_close: true }, { _id: 1 }).lean()).map((p) => p._id);
  const result = await Subscription.updateMany(
    { status: { $in: ['active', 'paused'] }, expiry_date: { $ne: null, $lt: now }, plan_id: { $in: autoClosePlans } },
    { $set: { status: 'closed', closed_at: new Date() } },
  );
  return result.modifiedCount;
}
