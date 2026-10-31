import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ErrorText, PageHeader } from '../../components/ui/index.jsx';
import { useFetch } from '../../hooks/useFetch.js';
import { planService, templateService } from '../../services/planService.js';
import { discountService, productService } from '../../services/productService.js';
import { customerService, subscriptionService } from '../../services/subscriptionService.js';
import { money, todayStr } from '../../utils/format.js';

const EMPTY = {
  customer_id: '',
  plan_id: '',
  template_id: '',
  discount_id: '',
  quantity: '',
  start_date: todayStr(),
  expiry_date: '',
  payment_terms_days: 0,
  notes: '',
  lines: [],
};

export default function CreateSubscription() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [newCustomer, setNewCustomer] = useState(null);

  const plans = useFetch(() => planService.list({ active: 1 }), 'plans').data?.items ?? [];
  const products = useFetch(() => productService.list({ active: 1 }), 'products').data?.items ?? [];
  const templates = useFetch(() => templateService.list({ active: 1 }), 'templates').data?.items ?? [];
  const discounts = (useFetch(() => discountService.list({ active: 1 }), 'discounts').data?.items ?? []).filter(
    (d) => d.scope === 'subscription',
  );
  const customersFetch = useFetch(() => customerService.list({ q: customerSearch }), customerSearch);
  const customers = customersFetch.data?.items ?? [];

  useEffect(() => {
    if (!id) return;
    subscriptionService.get(id).then(({ item }) =>
      setForm({
        customer_id: item.customer_id,
        plan_id: item.plan_id,
        template_id: item.template_id ?? '',
        discount_id: item.discount_id ?? '',
        quantity: item.quantity,
        start_date: item.start_date,
        expiry_date: item.expiry_date ?? '',
        payment_terms_days: item.payment_terms_days,
        notes: item.notes ?? '',
        lines: item.lines
          .filter((l) => !l.is_plan)
          .map((l) => ({ product_id: l.product_id ?? '', variant_id: l.variant_id ?? '', quantity: l.quantity, unit_price: l.unit_price, description: l.description })),
      }),
    );
  }, [id]);

  const plan = plans.find((p) => p.id === Number(form.plan_id));
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  function applyTemplate(templateId) {
    const tpl = templates.find((t) => t.id === Number(templateId));
    if (!tpl) return setForm({ ...form, template_id: '' });
    const tplPlan = plans.find((p) => p.id === tpl.plan_id);
    setForm({
      ...form,
      template_id: tpl.id,
      plan_id: tpl.plan_id,
      quantity: Math.max(Number(form.quantity) || 0, tplPlan?.min_quantity ?? 1),
      lines: tpl.lines.map((l) => ({ product_id: l.product_id, variant_id: l.variant_id ?? '', quantity: l.quantity, unit_price: '' })),
    });
  }

  const priceOf = (line) => {
    if (line.unit_price !== '' && line.unit_price != null) return Number(line.unit_price);
    const p = products.find((x) => x.id === Number(line.product_id));
    const v = p?.variants.find((x) => x.id === Number(line.variant_id));
    return p ? p.sales_price + (v?.extra_price ?? 0) : 0;
  };

  const preview = useMemo(() => {
    const planAmount = plan ? plan.price * (Number(form.quantity) || plan.min_quantity) : 0;
    const linesAmount = form.lines.reduce((s, l) => s + priceOf(l) * (Number(l.quantity) || 0), 0);
    return planAmount + linesAmount;
  }, [form, plan, products]);

  const updateLine = (i, patch) => setForm({ ...form, lines: form.lines.map((l, j) => (j === i ? { ...l, ...patch } : l)) });

  async function createCustomer(e) {
    e.preventDefault();
    setError('');
    try {
      const { item } = await customerService.create(newCustomer);
      setNewCustomer(null);
      setCustomerSearch(item.email);
      setForm({ ...form, customer_id: item.id });
    } catch (err) {
      setError(err.message);
    }
  }

  async function save(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    const body = {
      ...form,
      lines: form.lines.map((l) => ({ ...l, unit_price: l.unit_price === '' ? null : l.unit_price })),
    };
    try {
      const { item } = id ? await subscriptionService.update(id, body) : await subscriptionService.create(body);
      navigate(`/subscriptions/${item.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page">
      <PageHeader title={id ? 'Edit subscription' : 'New subscription'} subtitle="Start from a quotation template or build the lines yourself." />

      <form className="card form-wide" onSubmit={save}>
        <div className="form-grid">
          <label>
            Quotation template
            <select value={form.template_id} onChange={(e) => applyTemplate(e.target.value)}>
              <option value="">None</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            Customer
            <div className="inline">
              <input placeholder="Search customer…" value={customerSearch} onChange={(e) => setCustomerSearch(e.target.value)} />
              <select value={form.customer_id} onChange={set('customer_id')} required>
                <option value="">Select…</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.email})
                  </option>
                ))}
              </select>
            </div>
            <button type="button" className="link left" onClick={() => setNewCustomer({ name: '', email: '', password: '' })}>
              + New customer
            </button>
          </label>

          <label>
            Plan
            <select value={form.plan_id} onChange={set('plan_id')} required>
              <option value="">Select…</option>
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}: {money(p.price)} / {p.billing_period}
                </option>
              ))}
            </select>
          </label>

          <label>
            Quantity {plan && <span className="muted small">(minimum {plan.min_quantity})</span>}
            <input type="number" min={plan?.min_quantity ?? 1} step="1" value={form.quantity} placeholder={plan?.min_quantity ?? ''} onChange={set('quantity')} />
          </label>

          <label>
            Start date
            <input type="date" value={form.start_date} onChange={set('start_date')} required />
          </label>

          <label>
            Expiry date
            <input type="date" value={form.expiry_date} onChange={set('expiry_date')} />
          </label>

          <label>
            Payment terms
            <select value={form.payment_terms_days} onChange={set('payment_terms_days')}>
              <option value={0}>Immediate</option>
              <option value={7}>7 days</option>
              <option value={15}>15 days</option>
              <option value={30}>30 days</option>
              <option value={45}>45 days</option>
            </select>
          </label>

          <label>
            Discount
            <select value={form.discount_id} onChange={set('discount_id')}>
              <option value="">None</option>
              {discounts.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        {newCustomer && (
          <div className="subcard">
            <h3>New customer account</h3>
            <div className="form-grid">
              <input placeholder="Name" value={newCustomer.name} onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })} />
              <input placeholder="Email" type="email" value={newCustomer.email} onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })} />
              <input
                placeholder="Temporary password"
                type="password"
                value={newCustomer.password}
                onChange={(e) => setNewCustomer({ ...newCustomer, password: e.target.value })}
              />
            </div>
            <div className="form-actions">
              <button type="button" className="primary" onClick={createCustomer}>
                Create customer
              </button>
              <button type="button" onClick={() => setNewCustomer(null)}>
                Cancel
              </button>
            </div>
          </div>
        )}

        <h3>Lines</h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>Variant</th>
                <th className="num">Qty</th>
                <th className="num">Unit price</th>
                <th className="num">Amount</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {plan && plan.price > 0 && (
                <tr className="muted">
                  <td colSpan={2}>
                    {plan.name} (plan, {plan.billing_period})
                  </td>
                  <td className="num">{form.quantity || plan.min_quantity}</td>
                  <td className="num">{money(plan.price)}</td>
                  <td className="num">{money(plan.price * (Number(form.quantity) || plan.min_quantity))}</td>
                  <td />
                </tr>
              )}
              {form.lines.map((line, i) => {
                const product = products.find((p) => p.id === Number(line.product_id));
                return (
                  <tr key={i}>
                    <td>
                      <select value={line.product_id} onChange={(e) => updateLine(i, { product_id: e.target.value, variant_id: '', unit_price: '' })} required>
                        <option value="">Select…</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <select value={line.variant_id} onChange={(e) => updateLine(i, { variant_id: e.target.value, unit_price: '' })} disabled={!product?.variants.length}>
                        <option value="">—</option>
                        {product?.variants.map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.attribute}: {v.value} (+{money(v.extra_price)})
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="num">
                      <input className="narrow" type="number" min="0.01" step="any" value={line.quantity} onChange={(e) => updateLine(i, { quantity: e.target.value })} required />
                    </td>
                    <td className="num">
                      <input className="narrow" type="number" min="0" step="any" placeholder={priceOf({ ...line, unit_price: '' })} value={line.unit_price} onChange={(e) => updateLine(i, { unit_price: e.target.value })} />
                    </td>
                    <td className="num">{money(priceOf(line) * (Number(line.quantity) || 0))}</td>
                    <td>
                      <button type="button" className="link" onClick={() => setForm({ ...form, lines: form.lines.filter((_, j) => j !== i) })}>
                        Remove
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <button type="button" onClick={() => setForm({ ...form, lines: [...form.lines, { product_id: '', variant_id: '', quantity: 1, unit_price: '' }] })}>
          + Add product
        </button>

        <div className="totals">
          <span className="muted">Recurring amount before tax and discounts</span>
          <strong>{money(preview)}</strong>
        </div>

        <label>
          Notes
          <textarea rows={2} value={form.notes} onChange={set('notes')} />
        </label>

        <ErrorText>{error}</ErrorText>
        <div className="form-actions">
          <button className="primary" disabled={busy}>
            {busy ? 'Saving…' : 'Save'}
          </button>
          <button type="button" onClick={() => navigate(-1)}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
