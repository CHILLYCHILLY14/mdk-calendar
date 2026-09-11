// Tiny stand-in for Wix Data used by the local dev server (persists to dev/db.json)
import fs from 'fs';
const FILE = new URL('./db.json', import.meta.url);
let db = {};
try { db = JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch { db = {}; }
const persist = () => fs.writeFileSync(FILE, JSON.stringify(db, null, 1));
const coll = (n) => (db[n] = db[n] || {});
const clone = (x) => (x == null ? x : JSON.parse(JSON.stringify(x)));
class Query {
  constructor(name) { this.name = name; this.filters = []; this.lim = 50; }
  gt(f, v) { this.filters.push((i) => i[f] > v); return this; }
  ne(f, v) { this.filters.push((i) => i[f] !== v); return this; }
  eq(f, v) { this.filters.push((i) => i[f] === v); return this; }
  limit(n) { this.lim = n; return this; }
  async find() {
    const all = Object.values(coll(this.name)).filter((i) => this.filters.every((f) => f(i)));
    const page = (off) => {
      const items = clone(all.slice(off, off + this.lim));
      return { items, hasNext: () => off + this.lim < all.length, next: async () => page(off + this.lim) };
    };
    return page(0);
  }
}
export default {
  query: (n) => new Query(n),
  async get(n, id) { return clone(coll(n)[id]) || null; },
  async save(n, item) { const now = new Date().toISOString(); const c = coll(n); item = clone(item); item._id = item._id || Math.random().toString(36).slice(2); item._createdDate = (c[item._id] && c[item._id]._createdDate) || now; item._updatedDate = now; c[item._id] = item; persist(); return clone(item); },
  async update(n, item) { const c = coll(n); if (!c[item._id]) throw new Error('not found'); c[item._id] = clone(item); persist(); return clone(item); },
  async insert(n, item) { return this.save(n, item); }
};
