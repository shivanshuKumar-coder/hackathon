import { isDate } from '../utils/dates.js';
import { fail } from '../utils/http.js';

// Validates and cleans a request body against a field spec.
//   { name: { type: 'string', required: true, max: 200 },
//     price: { type: 'number', min: 0 },
//     period: { type: 'enum', values: ['monthly', 'yearly'] },
//     active: { type: 'bool', default: 1 } }
// Missing optional fields become `default` or null. Throws HttpError(400) on bad input.
export function clean(body, spec) {
  const out = {};
  for (const [key, rule] of Object.entries(spec)) {
    const label = rule.label || key.replace(/_id$/, '').replace(/_/g, ' ');
    let v = body?.[key];

    if (typeof v === 'string' && rule.type !== 'string') v = v.trim();
    if (v === undefined || v === null || v === '') {
      if (rule.required) fail(400, `${capitalize(label)} is required`);
      out[key] = rule.default ?? null;
      continue;
    }

    switch (rule.type) {
      case 'string':
        v = String(v).trim();
        if (rule.required && !v) fail(400, `${capitalize(label)} is required`);
        if (rule.max && v.length > rule.max) fail(400, `${capitalize(label)} is too long`);
        break;
      case 'number':
      case 'int':
        v = Number(v);
        if (!Number.isFinite(v)) fail(400, `${capitalize(label)} must be a number`);
        if (rule.type === 'int' && !Number.isInteger(v)) fail(400, `${capitalize(label)} must be a whole number`);
        if (rule.min !== undefined && v < rule.min) fail(400, `${capitalize(label)} must be at least ${rule.min}`);
        if (rule.max !== undefined && v > rule.max) fail(400, `${capitalize(label)} must be at most ${rule.max}`);
        break;
      case 'bool':
        v = v === true || v === 1 || v === '1' || v === 'true' ? 1 : 0;
        break;
      case 'date':
        if (!isDate(v)) fail(400, `${capitalize(label)} must be a valid date`);
        break;
      case 'enum':
        if (!rule.values.includes(v)) fail(400, `${capitalize(label)} must be one of: ${rule.values.join(', ')}`);
        break;
      default:
        throw new Error(`Unknown field type ${rule.type}`);
    }
    out[key] = v;
  }
  return out;
}

// Route middleware form: validate(spec) puts the cleaned body on req.data.
export const validate = (spec) => (req, res, next) => {
  req.data = clean(req.body ?? {}, spec);
  next();
};

const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);
