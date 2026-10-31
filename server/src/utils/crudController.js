import { nextId, plain } from '../config/db.js';
import { clean } from '../middlewares/validate.middleware.js';
import { contains, fail } from './http.js';

// list / get / create / update / remove handlers for a Mongoose model.
//
// children: embedded rows sent and received as an array on the parent:
//   { key: 'variants', spec: {...}, refs: { product_id: Product } }
// Child rows keep their id when it is sent back, so links to them survive edits.
// refs: { tax_id: Tax } checks that referenced records exist.
// inUse(id): returns a message when the record must not be deleted.
export function crudController({ model, spec, children = [], refs = {}, inUse, sort = { name: 1 }, searchField = 'name', validate }) {
  async function checkRefs(data, refMap) {
    for (const [key, Ref] of Object.entries(refMap)) {
      if (data[key] != null && !(await Ref.exists({ _id: data[key] }))) {
        fail(400, `${key.replace(/_id$/, '').replace(/_/g, ' ')} not found`);
      }
    }
  }

  async function getOne(id) {
    const doc = await model.findById(id).lean();
    if (!doc) fail(404, 'Not found');
    return doc;
  }

  async function save(id, body) {
    const data = clean(body, spec);
    await validate?.(data, body);
    await checkRefs(data, refs);
    const existing = id ? await getOne(id) : null;

    for (const c of children) {
      const rows = body[c.key];
      if (rows === undefined) continue;
      if (!Array.isArray(rows)) fail(400, `${c.key} must be a list`);
      const oldIds = new Set((existing?.[c.key] ?? []).map((r) => r._id));
      const cleaned = [];
      for (const row of rows) {
        const childData = clean(row, c.spec);
        await checkRefs(childData, c.refs ?? {});
        const keepId = row.id != null && oldIds.has(Number(row.id));
        cleaned.push({ _id: keepId ? Number(row.id) : await nextId(`${model.collection.name}.${c.key}`), ...childData });
      }
      data[c.key] = cleaned;
    }

    if (existing) {
      await model.updateOne({ _id: id }, { $set: data }, { runValidators: true });
      return id;
    }
    const newId = await nextId(model.collection.name);
    await model.create({ _id: newId, ...data });
    return newId;
  }

  return {
    async list(req, res) {
      const filter = {};
      if (req.query.active === '1' && 'is_active' in spec) filter.is_active = true;
      if (req.query.q) filter[searchField] = contains(req.query.q);
      const items = await model.find(filter).sort(sort).limit(1000).lean();
      res.json({ items: plain(items) });
    },

    async get(req, res) {
      res.json({ item: plain(await getOne(Number(req.params.id))) });
    },

    async create(req, res) {
      const id = await save(null, req.body ?? {});
      res.status(201).json({ item: plain(await getOne(id)) });
    },

    async update(req, res) {
      const id = await save(Number(req.params.id), req.body ?? {});
      res.json({ item: plain(await getOne(id)) });
    },

    async remove(req, res) {
      const id = Number(req.params.id);
      await getOne(id);
      const reason = await inUse?.(id);
      if (reason) fail(409, `${reason} Mark it inactive instead of deleting it.`);
      await model.deleteOne({ _id: id });
      res.json({ ok: true });
    },
  };
}
