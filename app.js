/* ==========================================================================
   MDK Team Calendar — app
   Shared crew calendar: month / week / day / crew / list views, per-person
   colours and filters, five themes, recurring entries, offline cache and
   live sync through the Wix backend (wix-backend/http-functions.js).
   ========================================================================== */
const CFG = window.MDK_CALENDAR_CONFIG || {};
const APP_VERSION = '1.0.0';

/* ---------------- constants ---------------- */
const DEFAULT_PEOPLE = [
  ['Wally', '#e53935'], ['Dustin', '#1e88e5'], ['Kevin', '#43a047'], ['Joanne', '#d81b60'],
  ['Michael', '#fb8c00'], ['Justin', '#8e24aa'], ['Mike', '#00897b'], ['Cal', '#f9a825'],
  ['Scott', '#6d4c41'], ['Noah', '#3949ab'], ['Neill', '#00acc1'], ['Anthony', '#7cb342'], ['Josh', '#78909c']
].map(([name, color]) => ({ name, color, hidden: false }));

const TYPES = [
  { id: 'job', label: 'Job', color: '#2563eb' },
  { id: 'service', label: 'Service call', color: '#0891b2' },
  { id: 'quote', label: 'Quote / estimate', color: '#7c3aed' },
  { id: 'inspection', label: 'Inspection', color: '#d97706' },
  { id: 'meeting', label: 'Meeting', color: '#059669' },
  { id: 'training', label: 'Training', color: '#0d9488' },
  { id: 'vacation', label: 'Vacation', color: '#db2777', away: true },
  { id: 'off', label: 'Day off', color: '#64748b', away: true },
  { id: 'other', label: 'Other', color: '#475569' }
];
const TYPE = Object.fromEntries(TYPES.map((t) => [t.id, t]));

const THEMES = [
  { id: 'auto', label: 'Auto', pv: ['#ffffff', '#161920', '#1f2bd1', '#8093ff'] },
  { id: 'light', label: 'Light', pv: ['#f3f5fa', '#ffffff', '#1f2bd1', '#e1e5ee'] },
  { id: 'dark', label: 'Dark', pv: ['#0e1015', '#161920', '#8093ff', '#272c38'] },
  { id: 'mdk', label: 'MDK Night', pv: ['#050b14', '#0b1726', '#20d5ff', '#1b3450'] },
  { id: 'hivis', label: 'Hi-Vis', pv: ['#161616', '#202020', '#ffd400', '#ff8a00'] },
  { id: 'blueprint', label: 'Blueprint', pv: ['#e9f1fb', '#f7fbff', '#0b5cc2', '#c9dbef'] }
];
const VIEWS = [['month', 'Month'], ['week', 'Week'], ['day', 'Day'], ['crew', 'Crew'], ['list', 'List']];
const REPEATS = [['none', 'Does not repeat'], ['daily', 'Every day'], ['weekdays', 'Every weekday (Mon–Fri)'],
  ['weekly', 'Every week'], ['biweekly', 'Every 2 weeks'], ['monthly', 'Every month'], ['yearly', 'Every year']];

/* ---------------- tiny helpers ---------------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => (crypto.randomUUID ? crypto.randomUUID().replace(/-/g, '') : Date.now().toString(36) + Math.random().toString(36).slice(2, 12)).slice(0, 24);
const initials = (n) => String(n || '?').trim().split(/\s+/).map((p) => p[0]).join('').slice(0, 2).toUpperCase();
const store = {
  get(k, d) { try { const v = localStorage.getItem('mdkcal.' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem('mdkcal.' + k, JSON.stringify(v)); } catch { /* storage full or blocked */ } },
  del(k) { try { localStorage.removeItem('mdkcal.' + k); } catch {} }
};
const ICONS = {
  menu: '<path d="M3 6h18M3 12h18M3 18h18"/>',
  left: '<path d="M15 18l-6-6 6-6"/>',
  right: '<path d="M9 18l6-6-6-6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>',
  sliders: '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',
  x: '<path d="M18 6L6 18M6 6l12 12"/>',
  trash: '<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6"/>',
  copy: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
  pin: '<path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  repeat: '<path d="M17 2l4 4-4 4"/><path d="M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4"/><path d="M21 13v2a3 3 0 0 1-3 3H3"/>',
  users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>',
  printer: '<path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M6 14h12v8H6z"/>',
  cal: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  user: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  expand: '<path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>',
  refresh: '<path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.5 9a9 9 0 0 1 14.9-3.4L23 10M1 14l4.6 4.4A9 9 0 0 0 20.5 15"/>',
  lock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  bolt: '<path d="M13 2L3 14h9l-1 8 10-12h-9z"/>',
  link: '<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>',
  drop: '<path d="M12 2.7l5.7 5.6a8 8 0 1 1-11.4 0z"/>',
  note: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h5"/>'
};
const icon = (n) => `<svg class="i" viewBox="0 0 24 24" aria-hidden="true">${ICONS[n] || ''}</svg>`;

/* ---------------- dates (all local calendar dates as "YYYY-MM-DD") ---------------- */
const pad = (n) => String(n).padStart(2, '0');
const D = {
  parse(s) { const [y, m, d] = s.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d, 12)); },
  fmt(dt) { return dt.getUTCFullYear() + '-' + pad(dt.getUTCMonth() + 1) + '-' + pad(dt.getUTCDate()); },
  today() { const n = new Date(); return n.getFullYear() + '-' + pad(n.getMonth() + 1) + '-' + pad(n.getDate()); },
  add(s, n) { const d = D.parse(s); d.setUTCDate(d.getUTCDate() + n); return D.fmt(d); },
  diff(a, b) { return Math.round((D.parse(b) - D.parse(a)) / 864e5); },
  dow(s) { return D.parse(s).getUTCDay(); },
  make(y, m, d) { // m is 1-based; returns null when the day doesn't exist (e.g. Feb 30)
    const dt = new Date(Date.UTC(y, m - 1, d, 12));
    return dt.getUTCDate() === d ? D.fmt(dt) : null;
  },
  ym(s) { return s.slice(0, 7); },
  firstOfMonth(s) { return s.slice(0, 8) + '01'; },
  addMonths(s, n) {
    const [y, m, d] = s.split('-').map(Number);
    const t = new Date(Date.UTC(y, m - 1 + n, 1, 12));
    const last = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth() + 1, 0, 12)).getUTCDate();
    return D.fmt(new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), Math.min(d, last), 12)));
  },
  weekStart(s, ws) { const k = (D.dow(s) - ws + 7) % 7; return D.add(s, -k); },
  isWknd(s) { const w = D.dow(s); return w === 0 || w === 6; },
  label(s, opts) { return D.parse(s).toLocaleDateString('en-CA', Object.assign({ timeZone: 'UTC' }, opts)); },
  mins(t) { if (!t) return 0; const [h, m] = t.split(':').map(Number); return h * 60 + m; },
  hm(mins) { mins = Math.max(0, Math.min(24 * 60 - 1, mins)); return pad(Math.floor(mins / 60)) + ':' + pad(mins % 60); },
  time12(t) {
    if (!t) return '';
    let [h, m] = t.split(':').map(Number); const ap = h >= 12 ? 'p' : 'a'; h = h % 12 || 12;
    return h + (m ? ':' + pad(m) : '') + ap;
  },
  nowMins() { const n = new Date(); return n.getHours() * 60 + n.getMinutes(); }
};
const ago = (ms) => {
  if (!ms) return '';
  const s = Math.round((Date.now() - ms) / 1000);
  if (s < 45) return 'just now';
  if (s < 3600) return Math.round(s / 60) + ' min ago';
  if (s < 86400) return Math.round(s / 3600) + ' h ago';
  return new Date(ms).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' });
};

/* Ontario statutory holidays (+ Civic Holiday) */
const holidayCache = {};
function holidays(year) {
  if (holidayCache[year]) return holidayCache[year];
  const nth = (m, wd, n) => { let d = D.make(year, m, 1); while (D.dow(d) !== wd) d = D.add(d, 1); return D.add(d, 7 * (n - 1)); };
  const a = year % 19, b = Math.floor(year / 100), c = year % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25),
    g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4,
    l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451),
    em = Math.floor((h + l - 7 * m + 114) / 31), ed = ((h + l - 7 * m + 114) % 31) + 1;
  const easter = D.make(year, em, ed);
  let victoria = D.make(year, 5, 24); while (D.dow(victoria) !== 1) victoria = D.add(victoria, -1);
  const map = {};
  [[D.make(year, 1, 1), "New Year's Day"], [nth(2, 1, 3), 'Family Day'], [D.add(easter, -2), 'Good Friday'],
    [victoria, 'Victoria Day'], [D.make(year, 7, 1), 'Canada Day'], [nth(8, 1, 1), 'Civic Holiday'],
    [nth(9, 1, 1), 'Labour Day'], [nth(10, 1, 2), 'Thanksgiving'], [D.make(year, 12, 25), 'Christmas Day'],
    [D.make(year, 12, 26), 'Boxing Day']].forEach(([dt, n]) => { map[dt] = n; });
  return (holidayCache[year] = map);
}
const holidayOn = (s) => (S.local.holidays ? holidays(+s.slice(0, 4))[s] || '' : '');

/* ---------------- state ---------------- */
const S = {
  key: '',
  demo: false,
  me: store.get('me', ''),
  view: store.get('view', 'month'),
  date: D.today(),
  selected: D.today(),
  mini: null,
  filter: (() => { const f = store.get('filter', null); return Array.isArray(f) ? new Set(f) : null; })(),
  hiddenTypes: new Set(store.get('hiddenTypes', [])),
  search: '',
  listDays: 60,
  events: new Map(),
  settings: null,
  settingsUpdatedAt: 0,
  feedKey: '',
  since: 0,
  outbox: [],
  sync: { state: 'idle', last: 0, error: '' },
  local: Object.assign({ theme: 'auto', weekStart: 1, colorBy: 'person', solid: false, holidays: true, dayMode: 'people', workStart: 7, workEnd: 16 }, store.get('local', {}))
};
if (!VIEWS.some(([v]) => v === S.view)) S.view = 'month';

const people = () => ((S.settings && S.settings.people && S.settings.people.length) ? S.settings.people : DEFAULT_PEOPLE);
const activePeople = () => people().filter((p) => !p.hidden);
const personColor = (name) => { const p = people().find((x) => x.name === name); return p ? p.color : '#78909c'; };
const typeOf = (ev) => TYPE[ev.type] || TYPE.other;
const titleOf = (ev) => {
  if (ev.title) return ev.title;
  const ppl = ev.people || [];
  return typeOf(ev).label + (ppl.length && ppl.length <= 2 ? ' · ' + ppl.join(' & ') : '');
};
const isEveryone = (ppl) => { const a = activePeople(); return a.length > 2 && a.every((p) => (ppl || []).includes(p.name)); };
const isAway = (ev) => !!typeOf(ev).away;

/* Which people are shown (the "tabs"). null filter = everyone. */
const visiblePeople = () => { const all = activePeople(); return S.filter ? all.filter((p) => S.filter.has(p.name)) : all; };
function passesFilter(ev) {
  if (S.hiddenTypes.has(ev.type || 'other')) return false;
  if (S.filter && !(ev.people || []).some((p) => S.filter.has(p))) return false;
  if (S.search) {
    const q = S.search.toLowerCase();
    const hay = [ev.title, ev.location, ev.notes, typeOf(ev).label, (ev.people || []).join(' ')].join(' ').toLowerCase();
    if (!q.split(/\s+/).every((w) => hay.includes(w))) return false;
  }
  return true;
}
/* Colour for an event, in context of the current filter */
function colorOf(ev, forPerson) {
  if (ev.color) return ev.color;
  if (S.local.colorBy === 'type') return typeOf(ev).color;
  const ppl = ev.people || [];
  const p = forPerson || (S.filter ? ppl.find((x) => S.filter.has(x)) : null) || ppl[0];
  return p ? personColor(p) : typeOf(ev).color;
}

/* ---------------- recurrence ---------------- */
function expand(ev, from, to) {
  const span = Math.max(0, D.diff(ev.start, ev.end || ev.start));
  const r = ev.repeat || {};
  const out = [];
  const occ = (d) => ({ key: ev.id + '@' + d, ev, start: d, end: D.add(d, span), occ: d });
  if (!r.freq || r.freq === 'none') {
    if ((ev.end || ev.start) >= from && ev.start <= to) out.push(occ(ev.start));
    return out;
  }
  const until = r.until && r.until < to ? r.until : to;
  const ex = new Set(r.exdates || []);
  const lo = D.add(from, -span);
  const step = { daily: 1, weekdays: 1, weekly: 7, biweekly: 14 }[r.freq];
  let guard = 0;
  if (step) {
    let d = ev.start;
    if (d < lo) d = D.add(d, Math.floor(D.diff(d, lo) / step) * step);
    while (d <= until && guard++ < 1500) {
      if (!(r.freq === 'weekdays' && D.isWknd(d)) && !ex.has(d) && D.add(d, span) >= from) out.push(occ(d));
      d = D.add(d, step);
    }
  } else {
    const [y, m, day] = ev.start.split('-').map(Number);
    let n = 0;
    if (r.freq === 'monthly') { const [fy, fm] = lo.split('-').map(Number); n = Math.max(0, (fy - y) * 12 + (fm - m) - 1); }
    else { n = Math.max(0, +lo.slice(0, 4) - y - 1); }
    while (guard++ < 1500) {
      const cand = r.freq === 'monthly' ? D.make(y + Math.floor((m - 1 + n) / 12), ((m - 1 + n) % 12) + 1, day) : D.make(y + n, m, day);
      n++;
      if (!cand) continue;
      if (cand > until) break;
      if (!ex.has(cand) && D.add(cand, span) >= from) out.push(occ(cand));
    }
  }
  return out;
}
/* All visible occurrences overlapping [from, to], sorted */
function occurrences(from, to, { ignoreFilter = false } = {}) {
  const out = [];
  for (const ev of S.events.values()) {
    if (ev.deleted || (!ignoreFilter && !passesFilter(ev))) continue;
    out.push(...expand(ev, from, to));
  }
  return out.sort(sortOcc);
}
function sortOcc(a, b) {
  const ad = a.ev.allDay !== false, bd = b.ev.allDay !== false;
  if (a.start !== b.start) return a.start < b.start ? -1 : 1;
  if (ad !== bd) return ad ? -1 : 1;
  if (ad) { const sa = D.diff(a.start, a.end), sb = D.diff(b.start, b.end); if (sa !== sb) return sb - sa; }
  else if (a.ev.startTime !== b.ev.startTime) return a.ev.startTime < b.ev.startTime ? -1 : 1;
  return titleOf(a.ev).localeCompare(titleOf(b.ev));
}
const onDay = (list, d) => list.filter((o) => o.start <= d && o.end >= d);
const sortForDay = (list) => list.slice().sort((a, b) => {
  const ad = a.ev.allDay !== false, bd = b.ev.allDay !== false;
  if (ad !== bd) return ad ? -1 : 1;
  if (!ad && a.ev.startTime !== b.ev.startTime) return a.ev.startTime < b.ev.startTime ? -1 : 1;
  return sortOcc(a, b);
});

/* ---------------- persistence of cache ---------------- */
function saveCache() {
  if (S.demo) { store.set('demo', { events: [...S.events.values()], settings: S.settings }); return; }
  store.set('cache', { key: S.key, since: S.since, events: [...S.events.values()], settings: S.settings, settingsUpdatedAt: S.settingsUpdatedAt, feedKey: S.feedKey });
}
function loadCache() {
  const c = store.get('cache', null);
  if (c && c.key === S.key) {
    S.since = c.since || 0;
    (c.events || []).forEach((e) => S.events.set(e.id, e));
    S.settings = c.settings || null; S.settingsUpdatedAt = c.settingsUpdatedAt || 0; S.feedKey = c.feedKey || '';
  }
  S.outbox = store.get('outbox', []).filter((o) => o.k === S.key);
}
const saveOutbox = () => store.set('outbox', S.outbox);
const pendingIds = () => new Set(S.outbox.map((o) => (o.event ? o.event.id : o.id)).filter(Boolean));

/* ---------------- server API ---------------- */
class ApiError extends Error { constructor(msg, code) { super(msg); this.code = code; } }
async function api(action, payload = {}) {
  if (S.demo) return demoApi(action, payload);
  let res;
  try {
    res = await fetch(CFG.API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=UTF-8' }, // "simple" request: no CORS pre-flight
      body: JSON.stringify(Object.assign({ key: S.key, by: S.me || '', action }, payload)),
      cache: 'no-store'
    });
  } catch (e) { throw new ApiError('Network unavailable', 0); }
  let data = {};
  try { data = await res.json(); } catch {}
  if (data && data.conflict) return data;
  if (!res.ok) throw new ApiError(data.error || 'Server error ' + res.status, res.status);
  return data;
}

/* Demo mode: everything stays on this device */
function demoApi(action, p) {
  const now = Date.now();
  if (action === 'sync') return Promise.resolve({ serverTime: now, events: [], feedKey: '' });
  if (action === 'save') { const e = Object.assign({}, p.event, { updatedAt: now, updatedBy: S.me }); return Promise.resolve({ event: e }); }
  if (action === 'delete') return Promise.resolve({ ok: true });
  if (action === 'saveSettings') return Promise.resolve({ settings: p.settings, settingsUpdatedAt: now });
  return Promise.resolve({ ok: true });
}
function seedDemo() {
  const saved = store.get('demo', null);
  if (saved && saved.events) { saved.events.forEach((e) => S.events.set(e.id, e)); S.settings = saved.settings || null; return; }
  const ws = D.weekStart(D.today(), 1);
  const mk = (o) => Object.assign({ id: uid(), type: 'job', people: [], allDay: true, startTime: '', endTime: '', location: '', notes: '', repeat: { freq: 'none', until: '', exdates: [] }, createdBy: 'Kevin', createdAt: Date.now(), updatedAt: Date.now(), updatedBy: 'Kevin' }, o);
  [
    mk({ title: 'Safety tailgate meeting', type: 'meeting', people: activePeople().map((p) => p.name), start: ws, end: ws, allDay: false, startTime: '07:00', endTime: '07:30', location: 'MDK shop', repeat: { freq: 'weekly', until: '', exdates: [] } }),
    mk({ title: 'Smith reno — 200A panel upgrade', people: ['Dustin', 'Cal'], start: ws, end: D.add(ws, 2), location: '1420 Altona Rd, Pickering', notes: 'Hydro disconnect booked for Tuesday 8am.' }),
    mk({ title: 'Service call — breaker tripping', type: 'service', people: ['Mike'], start: D.add(ws, 1), end: D.add(ws, 1), allDay: false, startTime: '09:00', endTime: '11:00', location: '88 Kingston Rd, Ajax' }),
    mk({ title: 'ESA inspection — Brock St', type: 'inspection', people: ['Kevin', 'Scott'], start: D.add(ws, 2), end: D.add(ws, 2), allDay: false, startTime: '13:00', endTime: '14:00', location: 'Brock St, Whitby' }),
    mk({ title: 'Warehouse lighting quote', type: 'quote', people: ['Kevin', 'Joanne'], start: D.add(ws, 3), end: D.add(ws, 3), allDay: false, startTime: '10:00', endTime: '11:30', location: 'Ajax' }),
    mk({ title: '', type: 'vacation', people: ['Wally'], start: D.add(ws, 3), end: D.add(ws, 8) }),
    mk({ title: 'EV charger install', people: ['Noah', 'Anthony'], start: D.add(ws, 4), end: D.add(ws, 4), allDay: false, startTime: '07:30', endTime: '15:30', location: 'Courtice' }),
    mk({ title: 'New build rough-in', people: ['Justin', 'Josh', 'Michael'], start: D.add(ws, 7), end: D.add(ws, 11), location: 'Seaton, Pickering', repeat: { freq: 'none', until: '', exdates: [] } }),
    mk({ title: 'WHMIS refresher', type: 'training', people: ['Neill', 'Josh'], start: D.add(ws, 9), end: D.add(ws, 9), allDay: false, startTime: '12:30', endTime: '15:00' }),
    mk({ title: '', type: 'off', people: ['Cal'], start: D.add(ws, 11), end: D.add(ws, 11) })
  ].forEach((e) => S.events.set(e.id, e));
  saveCache();
}

/* ---------------- sync engine ---------------- */
let syncing = false, syncAgain = false, pollTimer = null, failCount = 0;
function setSync(state, error) { S.sync.state = state; if (error !== undefined) S.sync.error = error; paintSync(); }

function queue(op) {
  op.k = S.key;
  if (op.op === 'save') {
    const i = S.outbox.findIndex((o) => o.op === 'save' && o.event.id === op.event.id);
    if (i >= 0) { op.base = S.outbox[i].base; S.outbox[i] = op; } else S.outbox.push(op);
  } else S.outbox.push(op);
  saveOutbox();
  sync();
}

async function flushOutbox() {
  while (S.outbox.length) {
    const op = S.outbox[0];
    if (op.op === 'save') {
      const r = await api('save', { event: op.event, baseUpdatedAt: op.base || 0, force: !!op.force });
      S.outbox.shift(); saveOutbox();
      if (r.conflict) { S.events.set(r.current.id, r.current); conflictPrompt(op.event, r.current); continue; }
      S.events.set(r.event.id, r.event);
    } else if (op.op === 'delete') {
      await api('delete', { id: op.id });
      S.outbox.shift(); saveOutbox();
    } else if (op.op === 'settings') {
      const r = await api('saveSettings', { settings: op.settings });
      S.outbox.shift(); saveOutbox();
      S.settings = r.settings; S.settingsUpdatedAt = r.settingsUpdatedAt;
    } else { S.outbox.shift(); saveOutbox(); }
  }
}

async function sync() {
  if (!S.key && !S.demo) return;
  if (syncing) { syncAgain = true; return; }
  syncing = true;
  setSync(S.outbox.length ? 'saving' : 'syncing');
  try {
    const hadOutbox = S.outbox.length > 0;
    await flushOutbox();
    if (hadOutbox) renderAll();
    if (!S.demo) {
      const r = await api('sync', { since: S.since });
      const pend = pendingIds();
      let changed = false;
      if (!S.since) { // full load: replace everything not pending
        for (const id of [...S.events.keys()]) if (!pend.has(id)) S.events.delete(id);
        changed = true;
      }
      (r.events || []).forEach((ev) => {
        if (pend.has(ev.id)) return;
        const cur = S.events.get(ev.id);
        if (ev.deleted) { if (cur) { S.events.delete(ev.id); changed = true; } return; }
        if (!cur || cur.updatedAt !== ev.updatedAt) { S.events.set(ev.id, ev); changed = true; }
      });
      if (r.settings !== undefined && (r.settingsUpdatedAt || 0) >= S.settingsUpdatedAt && !S.outbox.some((o) => o.op === 'settings')) {
        if (JSON.stringify(r.settings) !== JSON.stringify(S.settings)) changed = true;
        S.settings = r.settings; S.settingsUpdatedAt = r.settingsUpdatedAt || 0;
      }
      if (r.feedKey) S.feedKey = r.feedKey;
      S.since = Math.max(0, (r.serverTime || Date.now()) - 10000);
      if (changed) renderAll();
    }
    saveCache();
    S.sync.last = Date.now(); failCount = 0;
    setSync(S.demo ? 'demo' : 'live', '');
  } catch (e) {
    failCount++;
    if (e.code === 401) { lockOut('That access link is no longer valid. Open the calendar again from the MDK staff page.'); return; }
    setSync(e.code === 0 || !navigator.onLine ? 'offline' : 'error', e.message);
  } finally {
    syncing = false;
    if (syncAgain) { syncAgain = false; setTimeout(sync, 50); }
  }
}
function startPolling() {
  clearInterval(pollTimer);
  const every = Math.max(3, CFG.POLL_SECONDS || 15) * 1000;
  pollTimer = setInterval(() => {
    if (document.hidden) return;
    if (failCount > 2 && Math.random() > 1 / failCount) return; // back off when the server is unreachable
    sync();
  }, every);
}

function conflictPrompt(mine, theirs) {
  renderAll();
  openModal(`
    <div class="modal-h"><h2>Someone else changed this</h2></div>
    <div class="modal-b">
      <p style="margin:0"><b>${esc(theirs.updatedBy || 'Someone')}</b> edited <b>${esc(titleOf(theirs))}</b> ${esc(ago(theirs.updatedAt))}, while you were making your changes.</p>
      <div class="warnbox">${diffLines(theirs, mine)}</div>
    </div>
    <div class="modal-f"><span class="sp"></span>
      <button class="btn" data-x="theirs">Keep theirs</button>
      <button class="btn primary" data-x="mine">Use mine</button>
    </div>`, { size: 'sm', onClick(x, close) {
      if (x === 'mine') { S.events.set(mine.id, Object.assign({}, mine)); queue({ op: 'save', event: mine, base: theirs.updatedAt, force: true }); renderAll(); }
      close();
    } });
}
function diffLines(a, b) {
  const when = (e) => describe(e).split(' · ')[1];
  const f = [['What', titleOf], ['When', when], ['Who', (e) => (e.people || []).join(', ') || 'no one'], ['Where', (e) => e.location || '—'], ['Notes', (e) => e.notes || '—'], ['Type', (e) => typeOf(e).label]];
  const rows = f.filter(([, fn]) => fn(a) !== fn(b)).map(([l, fn]) => `<span><b>${l}:</b> theirs “${esc(fn(a))}” · yours “${esc(fn(b))}”</span>`);
  return rows.join('') || '<span>Both versions look the same.</span>';
}
function describe(ev) {
  const when = ev.allDay !== false ? D.label(ev.start, { month: 'short', day: 'numeric' }) + (ev.end !== ev.start ? ' – ' + D.label(ev.end, { month: 'short', day: 'numeric' }) : '')
    : D.label(ev.start, { month: 'short', day: 'numeric' }) + ' ' + D.time12(ev.startTime) + '–' + D.time12(ev.endTime);
  return `${titleOf(ev)} · ${when} · ${(ev.people || []).join(', ') || 'no one assigned'}`;
}

/* ======================================================================
   RENDERING
   ====================================================================== */
const app = () => $('#app');

function rangeOf(view = S.view, date = S.date) {
  const ws = S.local.weekStart;
  if (view === 'month') {
    const first = D.firstOfMonth(date);
    const start = D.weekStart(first, ws);
    const last = D.add(D.addMonths(first, 1), -1);
    const weeks = Math.ceil((D.diff(start, last) + 1) / 7);
    return { from: start, to: D.add(start, weeks * 7 - 1), first, last };
  }
  if (view === 'week' || view === 'crew') { const s = D.weekStart(date, ws); return { from: s, to: D.add(s, 6) }; }
  if (view === 'day') return { from: date, to: date };
  if (S.search) return { from: D.add(date, -365), to: D.add(date, 730) };
  return { from: date, to: D.add(date, S.listDays - 1) };
}
function rangeTitle() {
  const r = rangeOf();
  const sameY = r.from.slice(0, 4) === r.to.slice(0, 4), sameM = D.ym(r.from) === D.ym(r.to);
  const span = () => sameM ? `${D.label(r.from, { month: 'short', day: 'numeric' })} – ${D.label(r.to, { day: 'numeric' })}, ${r.to.slice(0, 4)}`
    : `${D.label(r.from, { month: 'short', day: 'numeric', year: sameY ? undefined : 'numeric' })} – ${D.label(r.to, { month: 'short', day: 'numeric', year: 'numeric' })}`;
  switch (S.view) {
    case 'month': return D.label(S.date, { month: 'long', year: 'numeric' });
    case 'week': case 'crew': return span();
    case 'day': return D.label(S.date, { weekday: 'short', month: 'short', day: 'numeric', year: S.date.slice(0, 4) === D.today().slice(0, 4) ? undefined : 'numeric' });
    default: return S.search ? `Search: “${S.search}”` : 'From ' + D.label(S.date, { month: 'short', day: 'numeric', year: S.date.slice(0, 4) === D.today().slice(0, 4) ? undefined : 'numeric' });
  }
}

function shell() {
  app().innerHTML = `
    <header class="topbar">
      <button class="btn icon ghost menu-btn" data-act="side" aria-label="Open side panel">${icon('menu')}</button>
      <div class="brand"><img class="brand-logo" src="./assets/mdk-logo.jpg" alt="MDK Electric Ltd."><div class="brand-title">Team Calendar<small>MDK Electric</small></div></div>
      <div class="nav">
        <button class="btn sm" data-act="today">Today</button>
        <button class="btn icon ghost" data-act="prev" aria-label="Previous">${icon('left')}</button>
        <button class="range-title" data-act="jump" id="rangeTitle" title="Jump to a date"></button>
        <button class="btn icon ghost" data-act="next" aria-label="Next">${icon('right')}</button>
        <button class="btn icon ghost search-btn" data-act="search" aria-label="Search">${icon('search')}</button>
      </div>
      <div class="top-right">
        <div class="seg viewseg" role="group" aria-label="View">${VIEWS.map(([v, l]) => `<button data-view="${v}">${l}</button>`).join('')}</div>
        <div class="search" id="searchBox">${icon('search')}<input id="q" type="search" placeholder="Search jobs, places…" autocomplete="off" aria-label="Search"></div>
        <button class="sync" id="sync" data-act="syncinfo" title="Sync status"><span class="dot"></span><span class="lbl"></span></button>
        <button class="btn primary new-btn" data-act="new">${icon('plus')} New</button>
        <button class="btn icon ghost" data-act="settings" aria-label="Settings">${icon('sliders')}</button>
      </div>
    </header>
    <nav class="people-bar" id="pbar" aria-label="People"></nav>
    <div class="body">
      <aside class="sidebar" id="side"></aside>
      <main class="main" id="main" tabindex="-1"></main>
    </div>
    <div class="scrim" data-act="side"></div>
    <button class="fab" data-act="new" aria-label="New entry">${icon('plus')} New</button>`;
  app().removeAttribute('aria-busy');
  app().classList.toggle('side-collapsed', !!store.get('sideCollapsed', false));
  const q = $('#q');
  q.value = S.search;
  let t;
  q.addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => { S.search = q.value.trim(); S.listDays = 60; renderAll(); }, 160); });
  q.addEventListener('keydown', (e) => { if (e.key === 'Escape') { q.value = ''; S.search = ''; renderAll(); q.blur(); } });
}

function renderAll() {
  if (!$('#main')) return;
  $('#rangeTitle').textContent = rangeTitle();
  $$('.viewseg button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.view === S.view)));
  renderPeopleBar();
  renderSidebar();
  renderMain();
  paintSync();
}

function paintSync() {
  const el = $('#sync'); if (!el) return;
  const n = S.outbox.length;
  const st = S.demo ? 'demo' : S.sync.state;
  const label = {
    demo: 'Demo mode', live: 'Live', idle: 'Connecting…', syncing: 'Syncing…', saving: `Saving${n > 1 ? ' ' + n : ''}…`,
    offline: n ? `Offline · ${n} waiting` : 'Offline', error: n ? `Retrying · ${n} waiting` : 'Can’t reach server'
  }[st] || st;
  el.dataset.state = st;
  el.querySelector('.lbl').textContent = label;
  el.title = st === 'live' ? 'Synced ' + ago(S.sync.last) + ' — changes appear on every device automatically' : S.sync.error || label;
}

/* ---- people tabs ---- */
function renderPeopleBar() {
  const r = rangeOf();
  const occ = occurrences(r.from, r.to, { ignoreFilter: true }).filter((o) => !S.hiddenTypes.has(o.ev.type));
  const counts = {};
  occ.forEach((o) => (o.ev.people || []).forEach((p) => { counts[p] = (counts[p] || 0) + 1; }));
  $('#pbar').innerHTML = `<button class="ptab all" data-person="*" aria-pressed="${!S.filter}">All</button>` +
    activePeople().map((p) => `<button class="ptab" style="--c:${p.color}" data-person="${esc(p.name)}" aria-pressed="${!!(S.filter && S.filter.has(p.name))}" title="Show ${esc(p.name)}'s schedule">
      <span class="av">${esc(initials(p.name))}</span>${esc(p.name)}${counts[p.name] ? `<span class="count">${counts[p.name]}</span>` : ''}</button>`).join('');
}
function togglePerson(name, mode) {
  const all = activePeople().map((p) => p.name);
  if (name === '*') S.filter = null;
  else if (mode === 'only') S.filter = new Set([name]);
  else if (mode === 'check') { // sidebar checkbox semantics: start from "everyone"
    const cur = S.filter ? new Set(S.filter) : new Set(all);
    cur.has(name) ? cur.delete(name) : cur.add(name);
    S.filter = cur;
  } else { // tab semantics: first click solos, next clicks add/remove
    if (!S.filter) S.filter = new Set([name]);
    else { const cur = new Set(S.filter); cur.has(name) ? cur.delete(name) : cur.add(name); S.filter = cur; }
  }
  if (S.filter && (S.filter.size === 0 || all.every((n) => S.filter.has(n)))) S.filter = null;
  store.set('filter', S.filter ? [...S.filter] : null);
  renderAll();
}

/* ---- sidebar ---- */
function renderSidebar() {
  const side = $('#side'); if (!side) return;
  const today = D.today();
  const mini = S.mini || D.firstOfMonth(S.date);
  const ms = D.weekStart(mini, S.local.weekStart);
  const r = rangeOf();
  const miniOcc = occurrences(ms, D.add(ms, 41));
  const has = new Set(); miniOcc.forEach((o) => { for (let d = o.start; d <= o.end; d = D.add(d, 1)) has.add(d); });
  const dows = [...Array(7)].map((_, i) => D.label(D.add(ms, i), { weekday: 'narrow' }));
  const todays = sortForDay(onDay(occurrences(today, today, { ignoreFilter: true }), today));
  const wr = rangeOf('week', S.date);
  const weekOcc = occurrences(wr.from, wr.to, { ignoreFilter: true });
  const cnt = {}; weekOcc.forEach((o) => (o.ev.people || []).forEach((p) => { cnt[p] = (cnt[p] || 0) + 1; }));
  side.innerHTML = `
    <section class="mini">
      <div class="mini-head"><button class="btn icon ghost sm" data-act="mini-prev" aria-label="Previous month">${icon('left')}</button>
        <span>${D.label(mini, { month: 'long', year: 'numeric' })}</span>
        <button class="btn icon ghost sm" data-act="mini-next" aria-label="Next month">${icon('right')}</button></div>
      <div class="mini-grid">${dows.map((d) => `<span class="dow">${d}</span>`).join('')}
        ${[...Array(42)].map((_, i) => { const d = D.add(ms, i); return `<button data-goto="${d}" class="${D.ym(d) !== D.ym(mini) ? 'out' : ''} ${d === today ? 'today' : ''} ${d >= r.from && d <= r.to && ['week', 'crew', 'day'].includes(S.view) ? 'in-range' : ''} ${has.has(d) ? 'has' : ''}" aria-label="${D.label(d, { month: 'long', day: 'numeric' })}">${+d.slice(8)}</button>`; }).join('')}
      </div>
    </section>
    <section class="today-card">
      <h3 class="side-h">Today · ${D.label(today, { weekday: 'short', month: 'short', day: 'numeric' })}${holidayOn(today) ? ` <span class="hol">${esc(holidayOn(today))}</span>` : ''}</h3>
      ${todays.length ? `<ul>${todays.slice(0, 8).map((o) => `<li><span class="sw" style="background:${colorOf(o.ev)}"></span><span><a href="#" class="link" data-open="${esc(o.key)}" style="color:inherit">${esc(titleOf(o.ev))}</a><small>${o.ev.allDay !== false ? 'All day' : D.time12(o.ev.startTime) + '–' + D.time12(o.ev.endTime)}${(o.ev.people || []).length ? ' · ' + esc(o.ev.people.join(', ')) : ''}</small></span></li>`).join('')}</ul>${todays.length > 8 ? `<p class="meta-line" style="margin:6px 0 0">+${todays.length - 8} more</p>` : ''}` : '<p class="meta-line" style="margin:0">Nothing scheduled today.</p>'}
    </section>
    <section>
      <h3 class="side-h">People <span><button data-act="ppl-all">All</button><button data-act="ppl-me" ${S.me && people().some((p) => p.name === S.me) ? '' : 'hidden'}>Just me</button></span></h3>
      <div class="plist">${activePeople().map((p) => `<label class="prow" style="--c:${p.color}"><input type="checkbox" data-check="${esc(p.name)}" ${!S.filter || S.filter.has(p.name) ? 'checked' : ''}><span class="name">${esc(p.name)}${p.name === S.me ? ' <small class="meta-line">(you)</small>' : ''}</span><span class="n" title="Entries this week">${cnt[p.name] || ''}</span><button class="solo" data-only="${esc(p.name)}">only</button></label>`).join('')}</div>
    </section>
    <section>
      <h3 class="side-h">Types</h3>
      <div class="legend">${TYPES.map((t) => `<button data-type="${t.id}" aria-pressed="${!S.hiddenTypes.has(t.id)}"><span class="sw" style="background:${t.color}"></span>${t.label}</button>`).join('')}</div>
    </section>
    <section class="meta-line">
      ${S.me ? `Using as <b>${esc(S.me)}</b> · <a href="#" class="link" data-act="whoami">change</a>` : `<a href="#" class="link" data-act="whoami">Tell us who you are</a>`}<br>
      ${S.demo ? 'Demo mode — changes stay on this device.' : 'Changes sync to everyone automatically.'}
    </section>`;
}

/* ---- main views ---- */
let lastViewKey = '';
function renderMain() {
  const main = $('#main');
  const viewKey = S.view + '|' + S.date + '|' + S.local.dayMode;
  const keepScroll = viewKey === lastViewKey || (S.view === 'week' && lastViewKey.startsWith('week')) || (S.view === 'day' && lastViewKey.startsWith('day'));
  const top = main.scrollTop, left = main.scrollLeft;
  const html = { month: viewMonth, week: viewWeek, day: viewDay, crew: viewCrew, list: viewList }[S.view]();
  main.innerHTML = (S.demo ? `<div class="warnbox" style="margin:10px 14px 0"><span><b>Demo mode.</b> This is sample data that stays on this device. Open the calendar from the MDK staff page to see the real shared schedule.</span></div>` : '') + html;
  main.dataset.view = S.view;
  const head = $('.tg-head', main);
  if (head) main.style.setProperty('--head-h', head.offsetHeight + 'px');
  if (keepScroll) { main.scrollTop = top; main.scrollLeft = left; }
  else if (S.view === 'week' || S.view === 'day') {
    const hour = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--hour')) || 52;
    main.scrollTop = Math.max(0, (S.local.workStart - 1) * hour);
    main.scrollLeft = 0;
  } else { main.scrollTop = 0; main.scrollLeft = 0; }
  lastViewKey = viewKey;
}

function chip(o, d, opts = {}) {
  const ev = o.ev, c = colorOf(ev, opts.person);
  const ppl = ev.people || [];
  const others = ppl.filter((p) => p !== opts.person).slice(0, 4);
  const cls = ['chip'];
  if (o.start < d && opts.cont !== false) cls.push('cont-l');
  if (o.end > d && opts.cont !== false) cls.push('cont-r');
  if (isAway(ev)) cls.push('away');
  if (S.local.solid) cls.push('solid');
  if (pendingIds().has(ev.id)) cls.push('pending');
  const time = ev.allDay === false ? `<span class="t">${D.time12(ev.startTime)}</span>` : '';
  const dots = isEveryone(ppl) ? '<span class="t all-b">All</span>' : S.local.colorBy === 'person' && others.length > (opts.person ? 0 : 1)
    ? `<span class="dots">${(opts.person ? others : others.slice(1)).map((p) => `<i style="background:${personColor(p)}" title="${esc(p)}"></i>`).join('')}</span>` : '';
  const tip = `${titleOf(ev)}${ev.allDay === false ? ' · ' + D.time12(ev.startTime) + '–' + D.time12(ev.endTime) : ''}${ppl.length ? ' · ' + ppl.join(', ') : ''}${ev.location ? ' · ' + ev.location : ''}`;
  return `<button class="${cls.join(' ')}" style="--c:${c}" data-open="${esc(o.key)}" draggable="true" data-drag="${esc(o.key)}" ${opts.person ? `data-from="${esc(opts.person)}"` : ''} title="${esc(tip)}">${time}<span class="ti">${esc(titleOf(ev))}${!opts.person && S.filter == null && ppl.length && S.local.colorBy === 'type' ? ' · ' + esc(ppl.map(initials).join(' ')) : ''}</span>${dots}</button>`;
}

function viewMonth() {
  const r = rangeOf();
  const occ = occurrences(r.from, r.to);
  const today = D.today();
  const narrow = matchMedia('(max-width: 720px)').matches;
  const max = narrow ? 3 : 4;
  let cells = '';
  for (let d = r.from; d <= r.to; d = D.add(d, 1)) {
    const list = sortForDay(onDay(occ, d));
    const hol = holidayOn(d);
    const show = list.length > max ? list.slice(0, max - 1) : list;
    cells += `<div class="mcell ${D.ym(d) !== D.ym(r.first) ? 'out' : ''} ${D.isWknd(d) ? 'wknd' : ''} ${d === today ? 'today' : ''} ${narrow && d === S.selected ? 'sel' : ''}" data-date="${d}" data-drop="${d}">
      <div class="mcell-head"><button class="dnum" data-day="${d}" aria-label="${D.label(d, { weekday: 'long', month: 'long', day: 'numeric' })}">${+d.slice(8)}</button>${hol ? `<span class="hol" title="${esc(hol)}">${esc(hol)}</span>` : ''}</div>
      ${show.map((o) => chip(o, d)).join('')}
      ${list.length > show.length ? `<button class="more" data-day="${d}">+${list.length - show.length}${narrow ? '' : ' more'}</button>` : ''}
      <button class="add-hint" data-new="${d}" aria-label="Add on ${D.label(d, { month: 'short', day: 'numeric' })}">${icon('plus')}</button>
    </div>`;
  }
  const dows = [...Array(7)].map((_, i) => D.label(D.add(r.from, i), { weekday: narrow ? 'narrow' : 'short' }));
  const selList = sortForDay(onDay(occurrences(S.selected, S.selected), S.selected));
  return `<div class="month"><div class="month-dow">${dows.map((d) => `<div>${d}</div>`).join('')}</div><div class="month-grid">${cells}</div></div>
    <section class="day-panel">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px"><b style="flex:1;font-size:15px">${D.label(S.selected, { weekday: 'long', month: 'long', day: 'numeric' })}${holidayOn(S.selected) ? ` · <span class="hol">${esc(holidayOn(S.selected))}</span>` : ''}</b>
      <button class="btn sm" data-new="${S.selected}">${icon('plus')} Add</button></div>
      ${selList.length ? `<div class="ag-items">${selList.map(agItem).join('')}</div>` : '<p class="meta-line">Nothing scheduled.</p>'}
    </section>`;
}

/* layout timed items into side-by-side columns */
function layoutTimed(items) {
  items.sort((a, b) => a.s - b.s || b.e - a.e);
  let cluster = [], end = -1;
  const done = (c) => { const cols = []; c.forEach((it) => { let i = cols.findIndex((x) => x <= it.s); if (i < 0) { i = cols.length; cols.push(0); } cols[i] = it.e; it.col = i; }); c.forEach((it) => { it.n = cols.length; }); };
  items.forEach((it) => { if (cluster.length && it.s >= end) { done(cluster); cluster = []; end = -1; } cluster.push(it); end = Math.max(end, it.e); });
  if (cluster.length) done(cluster);
  return items;
}
function timeGrid(cols, occ) {
  // cols: [{key, date, label html, person, cls}]
  const hour = 'var(--hour)';
  const today = D.today();
  const pend = pendingIds();
  const head = cols.map((c) => `<div class="h ${c.cls || ''}" ${c.person ? `style="--c:${personColor(c.person)}"` : ''}>${c.head}</div>`).join('');
  const allday = cols.map((c) => {
    const list = occ.filter((o) => o.ev.allDay !== false && o.start <= c.date && o.end >= c.date && (!c.match || c.match(o)));
    return `<div class="cell" data-drop="${c.date}" ${c.person ? `data-person="${esc(c.person)}"` : ''}>${list.map((o) => chip(o, c.date, { person: c.personCtx })).join('')}</div>`;
  }).join('');
  const times = [...Array(24)].map((_, h) => `<div>${h ? D.time12(pad(h) + ':00') : ''}</div>`).join('');
  const body = cols.map((c) => {
    const items = layoutTimed(occ.filter((o) => o.ev.allDay === false && o.start <= c.date && o.end >= c.date && (!c.match || c.match(o)))
      .map((o) => ({ o, s: D.mins(o.ev.startTime), e: Math.max(D.mins(o.ev.endTime), D.mins(o.ev.startTime) + 20) })));
    const evs = items.map(({ o, s, e, col, n }) => {
      const ev = o.ev, color = colorOf(ev, c.personCtx);
      const w = 100 / n;
      const ppl = isEveryone(ev.people) ? [] : (ev.people || []).filter((p) => p !== c.personCtx);
      const short = e - s < 50;
      return `<button class="tev ${short ? 'short' : ''} ${isAway(ev) ? 'away' : ''} ${S.local.solid ? 'solid' : ''} ${pend.has(ev.id) ? 'pending' : ''}" data-open="${esc(o.key)}" draggable="true" data-drag="${esc(o.key)}" ${c.personCtx ? `data-from="${esc(c.personCtx)}"` : ''} style="--c:${color};top:calc(${s / 60} * ${hour});height:calc(${(e - s) / 60} * ${hour} - 2px);left:calc(${col * w}% + 2px);width:calc(${w}% - 4px)" title="${esc(titleOf(ev) + ' · ' + D.time12(ev.startTime) + '–' + D.time12(ev.endTime) + (ev.people && ev.people.length ? ' · ' + ev.people.join(', ') : ''))}">
        <b>${esc(titleOf(ev))}${isEveryone(ev.people) ? ' <small>· Everyone</small>' : ''}</b><small>${D.time12(ev.startTime)}–${D.time12(ev.endTime)}${ev.location ? ' · ' + esc(ev.location) : ''}</small>
        ${ppl.length && S.local.colorBy === 'person' ? `<span class="dots">${ppl.map((p) => `<i style="background:${personColor(p)}" title="${esc(p)}"></i>`).join('')}</span>` : ppl.length ? `<small>${esc(ppl.join(', '))}</small>` : ''}</button>`;
    }).join('');
    const off = `<div class="off-hours" style="top:0;height:calc(${S.local.workStart} * ${hour})"></div><div class="off-hours" style="top:calc(${S.local.workEnd} * ${hour});bottom:0"></div>`;
    const now = c.date === today ? `<div class="now-line" style="top:calc(${D.nowMins() / 60} * ${hour})"></div>` : '';
    return `<div class="tg-col ${D.isWknd(c.date) && !c.person ? 'wknd' : ''}" data-slot="${c.date}" ${c.person ? `data-person="${esc(c.person)}"` : ''} style="height:calc(24 * ${hour})">${off}${evs}${now}</div>`;
  }).join('');
  return `<div class="tg" style="--cols:${cols.length};--colmin:${cols.colmin || '0px'}">
    <div class="tg-head"><div></div>${head}</div>
    <div class="tg-allday"><div class="lab">all-day</div>${allday}</div>
    <div class="tg-body"><div class="tg-times">${times}</div>${body}</div></div>`;
}
function dayHead(d) {
  const hol = holidayOn(d);
  return `<div class="dw">${D.label(d, { weekday: 'short' })}</div><button class="dn" data-day="${d}">${+d.slice(8)}</button>${hol ? `<span class="hol" title="${esc(hol)}">${esc(hol)}</span>` : ''}`;
}
function viewWeek() {
  const r = rangeOf();
  const occ = occurrences(r.from, r.to);
  const cols = [...Array(7)].map((_, i) => { const d = D.add(r.from, i); return { date: d, head: dayHead(d), cls: d === D.today() ? 'today' : '' }; });
  cols.colmin = matchMedia('(max-width: 720px)').matches ? '86px' : '0px';
  return timeGrid(cols, occ);
}
function viewDay() {
  const d = S.date;
  const occ = occurrences(d, d);
  const toolbar = `<div style="display:flex;align-items:center;gap:10px;padding:10px 14px;border-bottom:1px solid var(--line);background:var(--surface);position:sticky;left:0">
    <div class="seg" role="group" aria-label="Day layout"><button data-daymode="people" aria-pressed="${S.local.dayMode === 'people'}">${icon('users')} By person</button><button data-daymode="combined" aria-pressed="${S.local.dayMode !== 'people'}">Combined</button></div>
    ${holidayOn(d) ? `<span class="hol">${esc(holidayOn(d))}</span>` : ''}<span class="meta-line" style="margin-left:auto">${occ.length} ${occ.length === 1 ? 'entry' : 'entries'}</span></div>`;
  let cols;
  if (S.local.dayMode === 'people') {
    const ppl = visiblePeople();
    cols = ppl.map((p) => ({ date: d, person: p.name, personCtx: p.name, match: (o) => (o.ev.people || []).includes(p.name), cls: 'person', head: `<span class="av">${esc(initials(p.name))}</span>${esc(p.name)}` }));
    if (!S.filter && occ.some((o) => !(o.ev.people || []).length)) cols.push({ date: d, person: '', match: (o) => !(o.ev.people || []).length, cls: 'person', head: 'Unassigned' });
    cols.colmin = '128px';
  } else {
    cols = [{ date: d, head: dayHead(d), cls: d === D.today() ? 'today' : '' }];
  }
  return toolbar + timeGrid(cols, occ);
}
function viewCrew() {
  const r = rangeOf();
  const occ = occurrences(r.from, r.to, { ignoreFilter: false });
  const days = [...Array(7)].map((_, i) => D.add(r.from, i));
  const today = D.today();
  const rows = visiblePeople().map((p) => ({ name: p.name, color: p.color, match: (o) => (o.ev.people || []).includes(p.name) }));
  if (!S.filter && occ.some((o) => !(o.ev.people || []).length)) rows.push({ name: '', color: '#78909c', match: (o) => !(o.ev.people || []).length });
  let html = `<div class="crew"><div class="crew-grid"><div class="hd corner">Crew</div>${days.map((d) => `<div class="hd ${d === today ? 'today' : ''}"><div class="dw">${D.label(d, { weekday: 'short' })}</div><div class="dn">${+d.slice(8)}</div>${holidayOn(d) ? `<div class="hol">${esc(holidayOn(d))}</div>` : ''}</div>`).join('')}`;
  rows.forEach((row) => {
    const mine = occ.filter(row.match);
    const booked = days.filter((d) => onDay(mine, d).some((o) => !isAway(o.ev))).length;
    const away = days.filter((d) => onDay(mine, d).some((o) => isAway(o.ev))).length;
    html += `<div class="who ${row.name ? '' : 'unassigned'}" style="--c:${row.color}"><span class="av">${row.name ? esc(initials(row.name)) : '?'}</span><span>${row.name ? esc(row.name) : 'Unassigned'}<small>${booked ? booked + (booked === 1 ? ' day booked' : ' days booked') : 'Open week'}${away ? ' · ' + away + ' away' : ''}</small></span></div>`;
    days.forEach((d) => {
      const list = sortForDay(onDay(mine, d));
      html += `<div class="cc ${D.isWknd(d) ? 'wknd' : ''} ${d === today ? 'today' : ''} ${list.length ? '' : 'free'}" data-drop="${d}" data-person="${esc(row.name)}" data-newcell="${d}">${list.map((o) => chip(o, d, { person: row.name || undefined, cont: false })).join('')}</div>`;
    });
  });
  html += '</div></div>';
  if (!rows.length) html = '<div class="empty"><b>No one selected</b>Pick people from the tabs above.</div>';
  return html;
}
function agItem(o) {
  const ev = o.ev;
  const c = colorOf(ev);
  const when = ev.allDay !== false
    ? (o.start !== o.end ? `${D.label(o.start, { month: 'short', day: 'numeric' })} – ${D.label(o.end, { month: 'short', day: 'numeric' })}` : 'All day')
    : `${D.time12(ev.startTime)} – ${D.time12(ev.endTime)}`;
  const rep = ev.repeat && ev.repeat.freq !== 'none' ? `<span>${icon('repeat')} ${esc((REPEATS.find((r) => r[0] === ev.repeat.freq) || [])[1] || '')}</span>` : '';
  return `<button class="ag-item" style="--c:${c}" data-open="${esc(o.key)}"><span class="bar"></span>
    <span style="min-width:0"><b>${esc(titleOf(ev))}</b><span class="meta"><span class="tag"><span class="sw" style="background:${typeOf(ev).color}"></span>${typeOf(ev).label}</span><span>${when}</span>${ev.location ? `<span>${esc(ev.location)}</span>` : ''}${rep}</span></span>
    <span class="who">${pills(ev.people)}</span></button>`;
}
function pills(ppl = []) {
  if (isEveryone(ppl)) return '<span class="pill" style="--c:var(--accent)"><i>' + ppl.length + '</i>Everyone</span>';
  const shown = ppl.length > 5 ? ppl.slice(0, 4) : ppl;
  return shown.map((p) => `<span class="pill" style="--c:${personColor(p)}"><i>${esc(initials(p))}</i>${esc(p)}</span>`).join('') + (ppl.length > shown.length ? `<span class="pill" title="${esc(ppl.slice(4).join(', '))}"><i>+</i>${ppl.length - 4} more</span>` : '');
}
function viewList() {
  const r = rangeOf();
  const occ = occurrences(r.from, r.to);
  const today = D.today();
  const byDay = new Map();
  occ.forEach((o) => { const d = o.start < r.from ? r.from : o.start; if (!byDay.has(d)) byDay.set(d, []); byDay.get(d).push(o); });
  const days = [...byDay.keys()].sort();
  if (!days.length) return `<div class="agenda"><div class="empty"><b>${S.search ? 'No matches' : 'Nothing coming up'}</b>${S.search ? 'Try a different search.' : 'Nothing scheduled in the next ' + S.listDays + ' days for the people selected.'}</div></div>`;
  return `<div class="agenda">${days.map((d) => `<div class="ag-day ${d === today ? 'today' : ''}"><div class="ag-date"><div class="dn">${+d.slice(8)}</div><div class="dw">${D.label(d, { weekday: 'short', month: 'short' })}</div>${holidayOn(d) ? `<div class="hol">${esc(holidayOn(d))}</div>` : ''}</div>
    <div class="ag-items">${sortForDay(byDay.get(d)).map(agItem).join('')}</div></div>`).join('')}
    ${S.search ? '' : `<div style="text-align:center;padding:18px"><button class="btn" data-act="more-list">Show 60 more days</button></div>`}</div>`;
}

/* ======================================================================
   MODALS, TOASTS, MENUS
   ====================================================================== */
const modalStack = [];
function openModal(html, opts = {}) {
  const root = $('#modal-root');
  const ov = document.createElement('div');
  ov.className = 'overlay';
  ov.innerHTML = `<div class="modal ${opts.size || ''}" role="dialog" aria-modal="true">${html}</div>`;
  root.appendChild(ov);
  const prevFocus = document.activeElement;
  const close = (val) => {
    if (!ov.isConnected) return;
    ov.remove(); modalStack.splice(modalStack.indexOf(entry), 1);
    if (opts.onClose) opts.onClose(val);
    if (prevFocus && prevFocus.focus && document.contains(prevFocus)) prevFocus.focus({ preventScroll: true });
  };
  const entry = { close, opts, ov };
  modalStack.push(entry);
  ov.addEventListener('mousedown', (e) => { if (e.target === ov && opts.dismiss !== false) close(null); });
  ov.addEventListener('click', (e) => {
    const b = e.target.closest('[data-x]');
    if (b && opts.onClick) opts.onClick(b.dataset.x, close, ov, e);
    else if (b && b.dataset.x === 'close') close(null);
  });
  if (opts.onMount) opts.onMount(ov, close);
  const f = ov.querySelector('[autofocus]') || ov.querySelector('.modal-b input, .modal-b select, button');
  if (f && !matchMedia('(pointer: coarse)').matches) setTimeout(() => f.focus(), 30);
  return close;
}
function choose(title, text, options) {
  return new Promise((resolve) => {
    openModal(`<div class="modal-h"><h2>${esc(title)}</h2></div><div class="modal-b">${text ? `<p style="margin:0" class="meta-line">${esc(text)}</p>` : ''}
      <div class="choice-list">${options.map((o) => `<button class="btn ${o.cls || ''}" data-x="${o.id}">${esc(o.label)}</button>`).join('')}<button class="btn ghost" data-x="__cancel">Cancel</button></div></div>`,
    { size: 'sm', onClick(x, close) { close(x === '__cancel' ? null : x); }, onClose: resolve });
  });
}
function toast(msg, o = {}) {
  const el = document.createElement('div');
  el.className = 'toast' + (o.error ? ' err' : '');
  el.innerHTML = `<span>${esc(msg)}</span>${o.action ? `<button>${esc(o.action)}</button>` : ''}`;
  $('#toast-root').appendChild(el);
  const t = setTimeout(() => el.remove(), o.ms || 4200);
  if (o.action) el.querySelector('button').onclick = () => { clearTimeout(t); el.remove(); o.onAction(); };
}

/* ======================================================================
   EVENT EDITOR
   ====================================================================== */
function blankEvent(ctx = {}) {
  const solo = S.filter && S.filter.size === 1 ? [...S.filter][0] : null;
  const ppl = ctx.person !== undefined ? (ctx.person ? [ctx.person] : []) : solo ? [solo] : [];
  const timed = !!ctx.time;
  const st = ctx.time || '07:00';
  return {
    id: '', title: '', type: 'job', people: ppl, start: ctx.date || S.date, end: ctx.date || S.date,
    allDay: !timed, startTime: timed ? st : '07:00', endTime: timed ? D.hm(D.mins(st) + 60) : '15:30',
    location: '', notes: '', repeat: { freq: 'none', until: '', exdates: [] }
  };
}
function parseKey(key) { const i = key.lastIndexOf('@'); return { id: key.slice(0, i), occ: key.slice(i + 1) }; }

function openEditor(opts = {}) {
  let series = null, occ = null, ev;
  if (opts.key) {
    const { id, occ: od } = parseKey(opts.key);
    series = S.events.get(id);
    if (!series) return toast('That entry was removed.');
    occ = od;
    const span = D.diff(series.start, series.end);
    ev = JSON.parse(JSON.stringify(series));
    ev.start = od; ev.end = D.add(od, span);
  } else ev = blankEvent(opts);
  if (opts.copy) { ev = JSON.parse(JSON.stringify(opts.copy)); ev.id = ''; }
  const isNew = !series;
  const recurring = series && series.repeat && series.repeat.freq !== 'none';
  const locs = [...new Set([...S.events.values()].map((e) => e.location).filter(Boolean))].slice(-80);
  const titles = [...new Set([...S.events.values()].map((e) => e.title).filter(Boolean))].slice(-80);
  const meta = series ? `Added by ${esc(series.createdBy || 'someone')}${series.createdAt ? ' ' + esc(ago(series.createdAt)) : ''}${series.updatedBy ? ` · last edited by ${esc(series.updatedBy)} ${esc(ago(series.updatedAt))}` : ''}` : '';
  const html = `
    <div class="modal-h"><h2>${isNew ? (opts.copy ? 'Duplicate entry' : 'New entry') : 'Edit entry'}</h2>
      ${recurring ? `<span class="tag">${icon('repeat')} Repeating</span>` : ''}
      <button class="btn icon ghost" data-x="close" aria-label="Close">${icon('x')}</button></div>
    <form class="modal-b" id="evform" autocomplete="off">
      <input class="inp title" name="title" placeholder="${esc(typeOf(ev).label)} — add a title (job, customer…)" value="${esc(ev.title)}" list="dl-titles" ${isNew ? 'autofocus' : ''} maxlength="140">
      <div class="field"><span class="lab">Type</span><div class="pick types" id="pickType">${TYPES.map((t) => `<button type="button" style="--c:${t.color}" data-tval="${t.id}" aria-pressed="${ev.type === t.id}"><span class="sw"></span>${t.label}</button>`).join('')}</div></div>
      <div class="field"><span class="lab" style="display:flex;gap:10px;align-items:center">Who <span style="margin-left:auto;display:flex;gap:4px"><button type="button" class="btn sm ghost" data-pp="all">Everyone</button><button type="button" class="btn sm ghost" data-pp="none">Clear</button></span></span>
        <div class="pick" id="pickPeople">${people().filter((p) => !p.hidden || ev.people.includes(p.name)).map((p) => `<button type="button" style="--c:${p.color}" data-pval="${esc(p.name)}" aria-pressed="${ev.people.includes(p.name)}"><span class="av">${esc(initials(p.name))}</span>${esc(p.name)}</button>`).join('')}</div></div>
      <label class="switch"><input type="checkbox" name="allDay" ${ev.allDay !== false ? 'checked' : ''}> All day</label>
      <div class="row"><div class="field"><label for="f-start">Starts</label><input class="inp" id="f-start" type="date" name="start" value="${ev.start}" required></div>
        <div class="field"><label for="f-end">Ends</label><input class="inp" id="f-end" type="date" name="end" value="${ev.end}" required></div></div>
      <div class="row" id="timeRow" ${ev.allDay !== false ? 'hidden' : ''}><div class="field"><label for="f-st">From</label><input class="inp" id="f-st" type="time" step="900" name="startTime" value="${ev.startTime || '07:00'}"></div>
        <div class="field"><label for="f-et">To</label><input class="inp" id="f-et" type="time" step="900" name="endTime" value="${ev.endTime || '15:30'}"></div></div>
      <div class="pick" id="presets" ${ev.allDay !== false ? 'hidden' : ''} style="margin-top:-6px">${[['07:00', '15:30', 'Work day 7–3:30'], ['07:00', '12:00', 'Morning'], ['12:00', '15:30', 'Afternoon'], ['08:00', '16:30', '8–4:30']].map(([a, b, l]) => `<button type="button" class="btn sm" data-preset="${a}|${b}">${l}</button>`).join('')}</div>
      <div class="row"><div class="field"><label for="f-rep">Repeat</label><select class="inp" id="f-rep" name="freq">${REPEATS.map(([v, l]) => `<option value="${v}" ${ev.repeat.freq === v ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
        <div class="field" id="untilField" ${ev.repeat.freq === 'none' ? 'hidden' : ''}><label for="f-until">Until (optional)</label><input class="inp" id="f-until" type="date" name="until" value="${ev.repeat.until || ''}"></div></div>
      <div class="field"><label for="f-loc" style="display:flex;justify-content:space-between">Location <a class="link" id="mapLink" target="_blank" rel="noopener" ${ev.location ? '' : 'hidden'}>Open in Maps ↗</a></label><input class="inp" id="f-loc" name="location" value="${esc(ev.location)}" placeholder="Address or site name" list="dl-locs" maxlength="240"></div>
      <div class="field"><label for="f-notes">Notes</label><textarea class="inp" id="f-notes" name="notes" placeholder="Materials, access codes, contact, anything the crew should know" maxlength="4000">${esc(ev.notes)}</textarea></div>
      <div id="warns"></div>
      ${meta ? `<div class="meta-line">${meta}</div>` : ''}
      <datalist id="dl-locs">${locs.map((l) => `<option value="${esc(l)}">`).join('')}</datalist>
      <datalist id="dl-titles">${titles.map((l) => `<option value="${esc(l)}">`).join('')}</datalist>
    </form>
    <div class="modal-f">
      ${isNew ? '' : `<button class="btn danger" data-x="delete">${icon('trash')} Delete</button><button class="btn ghost" data-x="dup" title="Duplicate">${icon('copy')}<span class="dup-l">Duplicate</span></button>`}
      <span class="sp"></span><button class="btn" data-x="close">Cancel</button><button class="btn primary" data-x="save">${isNew ? 'Add to calendar' : 'Save'}</button>
    </div>`;

  const form = () => $('#evform');
  const read = () => {
    const f = form();
    const g = (n) => f.elements[n].value;
    const allDay = f.elements.allDay.checked;
    let start = g('start') || ev.start, end = g('end') || start;
    if (end < start) end = start;
    let st = g('startTime') || '07:00', et = g('endTime') || '15:30';
    if (!allDay && D.mins(et) <= D.mins(st)) et = D.hm(D.mins(st) + 60);
    const freq = g('freq');
    return {
      title: g('title').trim(), type: $('#pickType [aria-pressed="true"]').dataset.tval,
      people: $$('#pickPeople [aria-pressed="true"]').map((b) => b.dataset.pval),
      allDay, start, end, startTime: allDay ? '' : st, endTime: allDay ? '' : et,
      location: g('location').trim(), notes: g('notes').trim(),
      repeat: { freq, until: freq === 'none' ? '' : g('until'), exdates: series && freq !== 'none' ? (series.repeat.exdates || []) : [] }
    };
  };
  const refresh = () => {
    const v = read();
    $('#timeRow').hidden = v.allDay; $('#presets').hidden = v.allDay;
    $('#untilField').hidden = v.repeat.freq === 'none';
    const ml = $('#mapLink');
    ml.hidden = !v.location; ml.href = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(v.location);
    $('input[name="title"]').placeholder = typeOf(v).label + ' — add a title (job, customer…)';
    const w = conflictsFor(v, series ? series.id : null);
    $('#warns').innerHTML = w.length ? `<div class="warnbox"><b>Heads up</b>${w.slice(0, 5).map((m) => `<span>${esc(m)}</span>`).join('')}${w.length > 5 ? `<span>+${w.length - 5} more</span>` : ''}</div>` : '';
  };

  openModal(html, {
    dismiss: false,
    onMount(ov) {
      const f = form();
      f.addEventListener('submit', (e) => { e.preventDefault(); ov.querySelector('[data-x="save"]').click(); });
      f.addEventListener('input', refresh);
      f.addEventListener('change', (e) => {
        if (e.target.name === 'start') { // keep duration when moving the start date
          const span = D.diff(ev.start, ev.end); const s = f.elements.start.value;
          if (s) { f.elements.end.value = D.add(s, Math.max(0, span)); ev.start = s; ev.end = f.elements.end.value; }
        }
        if (e.target.name === 'end') ev.end = f.elements.end.value;
        refresh();
      });
      f.addEventListener('click', (e) => {
        const t = e.target.closest('[data-tval]');
        if (t) { $$('#pickType button').forEach((b) => b.setAttribute('aria-pressed', String(b === t))); refresh(); }
        const p = e.target.closest('[data-pval]');
        if (p) { p.setAttribute('aria-pressed', String(p.getAttribute('aria-pressed') !== 'true')); refresh(); }
        const pp = e.target.closest('[data-pp]');
        if (pp) { $$('#pickPeople button').forEach((b) => b.setAttribute('aria-pressed', String(pp.dataset.pp === 'all' && !(people().find((x) => x.name === b.dataset.pval) || {}).hidden))); refresh(); }
        const pr = e.target.closest('[data-preset]');
        if (pr) { const [a, b] = pr.dataset.preset.split('|'); f.elements.startTime.value = a; f.elements.endTime.value = b; refresh(); }
      });
      refresh();
    },
    async onClick(x, close) {
      if (x === 'close') return close();
      if (x === 'dup') { close(); return openEditor({ copy: Object.assign(read(), { repeat: { freq: 'none', until: '', exdates: [] } }) }); }
      if (x === 'delete') {
        let scope = 'all';
        if (recurring) {
          scope = await choose('Delete repeating entry', `${titleOf(series)} repeats. What should be deleted?`, [
            { id: 'one', label: 'Only ' + D.label(occ, { weekday: 'short', month: 'short', day: 'numeric' }) },
            { id: 'following', label: 'This and all later ones' },
            { id: 'all', label: 'Every occurrence', cls: 'danger' }]);
          if (!scope) return;
        } else {
          const ok = await choose('Delete this entry?', describe(series), [{ id: 'yes', label: 'Delete', cls: 'danger solid' }]);
          if (!ok) return;
        }
        close();
        deleteScoped(series, occ, scope);
        return;
      }
      if (x === 'save') {
        const v = read();
        if (!v.people.length && !v.title && !['meeting', 'training', 'other'].includes(v.type)) {
          if (!(await choose('No one assigned', 'This entry has no title and no one assigned. Save anyway?', [{ id: 'y', label: 'Save anyway' }]))) return;
        }
        if (isNew) {
          const now = Date.now();
          saveEvent(Object.assign({ id: uid(), createdBy: S.me, createdAt: now }, v));
          toast('Added to the calendar');
          S.selected = v.start;
        } else if (sig(v) === sig(ev)) {
          // nothing changed
        } else if (recurring && series.repeat.freq === v.repeat.freq) {
          const scope = await choose('Change repeating entry', 'Apply your changes to…', [
            { id: 'one', label: 'Only ' + D.label(occ, { weekday: 'short', month: 'short', day: 'numeric' }) },
            { id: 'all', label: 'Every occurrence' }]);
          if (!scope) return;
          if (scope === 'one') {
            saveEvent(Object.assign({}, series, { repeat: Object.assign({}, series.repeat, { exdates: [...new Set([...(series.repeat.exdates || []), occ])] }) }));
            saveEvent(Object.assign({}, v, { id: uid(), createdBy: S.me, createdAt: Date.now(), repeat: { freq: 'none', until: '', exdates: [] } }));
          } else {
            const delta = D.diff(occ, v.start), span = D.diff(v.start, v.end);
            const ns = D.add(series.start, delta);
            saveEvent(Object.assign({}, series, v, { start: ns, end: D.add(ns, span), repeat: Object.assign({}, v.repeat, { exdates: series.repeat.exdates || [] }) }));
          }
          toast('Saved');
        } else if (series) {
          let out = Object.assign({}, series, v);
          if (recurring && series.repeat.freq !== 'none' && v.repeat.freq !== 'none') { // repeat rule edited: keep series anchored
            const delta = D.diff(occ, v.start), span = D.diff(v.start, v.end);
            const ns = D.add(series.start, delta);
            out = Object.assign(out, { start: ns, end: D.add(ns, span) });
          }
          saveEvent(out);
          toast('Saved');
        }
        close();
      }
    }
  });
}
const sig = (x) => JSON.stringify([x.title || '', x.type, (x.people || []).slice().sort(), x.allDay !== false, x.start, x.end, x.allDay !== false ? '' : x.startTime, x.allDay !== false ? '' : x.endTime, x.location || '', x.notes || '', x.repeat.freq, x.repeat.until || '']);

function conflictsFor(v, selfId) {
  const out = [];
  if (!v.people.length) return out;
  const occ = occurrences(v.start, v.end, { ignoreFilter: true });
  const fmt = (o) => o.start === o.end ? D.label(o.start, { month: 'short', day: 'numeric' }) : `${D.label(o.start, { month: 'short', day: 'numeric' })} – ${D.label(o.end, { month: 'short', day: 'numeric' })}`;
  occ.forEach((o) => {
    if (o.ev.id === selfId) return;
    const clash = (o.ev.people || []).filter((p) => v.people.includes(p));
    if (!clash.length) return;
    if (!v.allDay && o.ev.allDay === false) {
      const a1 = D.mins(v.startTime), a2 = D.mins(v.endTime), b1 = D.mins(o.ev.startTime), b2 = D.mins(o.ev.endTime);
      if (a1 >= b2 || b1 >= a2) return;
    }
    if (isAway(o.ev)) out.unshift(`${clash.join(' & ')} ${clash.length > 1 ? 'are' : 'is'} booked off (${typeOf(o.ev).label}, ${fmt(o)})`);
    else out.push(`${clash.join(' & ')} already ${clash.length > 1 ? 'have' : 'has'} “${titleOf(o.ev)}” ${o.ev.allDay === false ? D.time12(o.ev.startTime) + '–' + D.time12(o.ev.endTime) + ', ' : ''}${fmt(o)}`);
  });
  return [...new Set(out)];
}

function saveEvent(ev, force) {
  const prev = S.events.get(ev.id);
  const clean = JSON.parse(JSON.stringify(ev));
  delete clean.updatedAt; delete clean.updatedBy; delete clean.deleted;
  S.events.set(ev.id, Object.assign({}, clean, { updatedAt: prev ? prev.updatedAt : 0, updatedBy: S.me }));
  queue({ op: 'save', event: clean, base: prev ? prev.updatedAt || 0 : 0, force: !!force });
  renderAll();
}
function deleteScoped(series, occ, scope) {
  const before = JSON.parse(JSON.stringify(series));
  if (scope === 'one') saveEvent(Object.assign({}, series, { repeat: Object.assign({}, series.repeat, { exdates: [...new Set([...(series.repeat.exdates || []), occ])] }) }));
  else if (scope === 'following' && occ > series.start) saveEvent(Object.assign({}, series, { repeat: Object.assign({}, series.repeat, { until: D.add(occ, -1) }) }));
  else { S.events.delete(series.id); queue({ op: 'delete', id: series.id }); renderAll(); }
  toast('Deleted', { action: 'Undo', onAction: () => saveEvent(before, true) });
}

/* move an occurrence by drag & drop */
async function moveOcc(key, toDate, fromPerson, toPerson, toTime) {
  const { id, occ } = parseKey(key);
  const series = S.events.get(id); if (!series) return;
  const delta = D.diff(occ, toDate);
  let ppl = (series.people || []).slice();
  if (toPerson !== undefined && fromPerson !== toPerson) {
    if (fromPerson) ppl = ppl.filter((p) => p !== fromPerson);
    if (toPerson && !ppl.includes(toPerson)) ppl.push(toPerson);
  }
  const timeChange = toTime && series.allDay === false && toTime !== series.startTime;
  if (!delta && !timeChange && JSON.stringify(ppl) === JSON.stringify(series.people || [])) return;
  const patch = { people: ppl };
  if (timeChange) { const dur = D.mins(series.endTime) - D.mins(series.startTime); patch.startTime = toTime; patch.endTime = D.hm(D.mins(toTime) + dur); }
  const span = D.diff(series.start, series.end);
  if (series.repeat && series.repeat.freq !== 'none') {
    const scope = await choose('Move repeating entry', 'Move just this one, or every occurrence?', [{ id: 'one', label: 'Just this one' }, { id: 'all', label: 'Every occurrence' }]);
    if (!scope) return;
    if (scope === 'one') {
      saveEvent(Object.assign({}, series, { repeat: Object.assign({}, series.repeat, { exdates: [...new Set([...(series.repeat.exdates || []), occ])] }) }));
      saveEvent(Object.assign({}, series, patch, { id: uid(), start: toDate, end: D.add(toDate, span), repeat: { freq: 'none', until: '', exdates: [] }, createdBy: S.me, createdAt: Date.now() }));
    } else {
      saveEvent(Object.assign({}, series, patch, { start: D.add(series.start, delta), end: D.add(series.end, delta) }));
    }
  } else {
    saveEvent(Object.assign({}, series, patch, { start: D.add(series.start, delta), end: D.add(series.end, delta) }));
  }
  toast('Moved to ' + D.label(toDate, { weekday: 'short', month: 'short', day: 'numeric' }) + (toTime && timeChange ? ' ' + D.time12(toTime) : ''));
}

/* ======================================================================
   SETTINGS, WHO-AM-I, JUMP, GATES
   ====================================================================== */
function applyTheme() {
  let t = S.local.theme;
  if (t === 'auto') t = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  document.documentElement.dataset.theme = t;
  const m = document.querySelector('meta[name="theme-color"]');
  if (m) m.content = getComputedStyle(document.documentElement).getPropertyValue('--surface').trim() || '#1f2bd1';
  store.set('theme', S.local.theme);
}
function setLocal(k, v) { S.local[k] = v; store.set('local', S.local); if (k === 'theme') applyTheme(); renderAll(); }

function feedUrl(person) {
  if (!S.feedKey || !CFG.FEED_URL) return '';
  return CFG.FEED_URL + '?k=' + encodeURIComponent(S.feedKey) + (person ? '&person=' + encodeURIComponent(person) : '');
}

function openSettings(tab = 'look') {
  const tabs = [['look', 'Appearance'], ['team', 'Team'], ['phone', 'Phone calendar'], ['help', 'Help & sync']];
  const body = () => {
    if (tab === 'look') return `
      <div class="field"><span class="lab">Theme</span><div class="themes">${THEMES.map((t) => `<button class="theme-card" data-theme-pick="${t.id}" aria-pressed="${S.local.theme === t.id}">
        <div class="pv" style="background:${t.pv[0]}"><div class="s" style="background:${t.pv[1]};border:1px solid ${t.pv[3]}"></div><div class="m" style="background:${t.pv[1]};border:1px solid ${t.pv[3]}"><i style="background:${t.pv[2]};width:70%"></i><i style="background:${t.pv[3]}"></i><i style="background:${t.pv[2]};opacity:.5;width:45%"></i></div></div><span>${t.label}</span></button>`).join('')}</div></div>
      <div class="row"><div class="field"><label>Colour entries by</label><select class="inp" data-local="colorBy"><option value="person" ${S.local.colorBy === 'person' ? 'selected' : ''}>Person</option><option value="type" ${S.local.colorBy === 'type' ? 'selected' : ''}>Type of work</option></select></div>
        <div class="field"><label>Entry style</label><select class="inp" data-local="solid"><option value="false" ${!S.local.solid ? 'selected' : ''}>Soft tint</option><option value="true" ${S.local.solid ? 'selected' : ''}>Solid colour</option></select></div></div>
      <div class="row"><div class="field"><label>Week starts on</label><select class="inp" data-local="weekStart"><option value="1" ${S.local.weekStart === 1 ? 'selected' : ''}>Monday</option><option value="0" ${S.local.weekStart === 0 ? 'selected' : ''}>Sunday</option></select></div>
        <div class="field"><label>Work hours (shaded outside)</label><div class="row" style="gap:6px"><select class="inp" data-local="workStart">${[...Array(13)].map((_, h) => `<option value="${h}" ${S.local.workStart === h ? 'selected' : ''}>${D.time12(pad(h) + ':00')}</option>`).join('')}</select><select class="inp" data-local="workEnd">${[...Array(12)].map((_, i) => i + 12).map((h) => `<option value="${h}" ${S.local.workEnd === h ? 'selected' : ''}>${D.time12(pad(h) + ':00')}</option>`).join('')}</select></div></div></div>
      <label class="switch"><input type="checkbox" data-local="holidays" ${S.local.holidays ? 'checked' : ''}> Show Ontario holidays</label>
      <p class="meta-line" style="margin:0">Appearance settings are saved on this device only.</p>`;
    if (tab === 'team') return `
      <p class="meta-line" style="margin:0">Colours and names are shared — everyone sees the same team. Hide people who have left instead of deleting them, so past entries stay coloured.</p>
      <div class="team-edit" id="teamEdit">${people().map((p, i) => `<div class="tr"><input type="color" value="${p.color}" data-ti="${i}" aria-label="Colour for ${esc(p.name)}"><input class="inp" value="${esc(p.name)}" readonly tabindex="-1" style="min-height:36px"><label class="switch" title="Show in tabs and pickers"><input type="checkbox" data-th="${i}" ${p.hidden ? '' : 'checked'}></label><span class="meta-line" style="width:44px">${p.hidden ? 'hidden' : ''}</span></div>`).join('')}</div>
      <div class="copy-row"><input class="inp" id="newPerson" placeholder="Add a person" maxlength="40"><button class="btn" data-x="addperson">${icon('plus')} Add</button></div>
      <div style="display:flex;gap:8px"><span class="sp" style="flex:1"></span><button class="btn primary" data-x="saveteam">Save team for everyone</button></div>`;
    if (tab === 'phone') {
      const me = S.me && people().some((p) => p.name === S.me) ? S.me : '';
      const all = feedUrl(''), mine = me ? feedUrl(me) : '';
      if (S.demo || !all) return `<p class="meta-line">Phone calendar subscriptions are available once the calendar is connected to the MDK server${S.demo ? ' (not in demo mode)' : ''}.</p>`;
      const row = (label, url) => `<div class="field"><span class="lab">${label}</span><div class="copy-row"><input class="inp" readonly value="${esc(url)}"><button class="btn" data-copy="${esc(url)}">${icon('copy')} Copy</button></div>
        <div style="display:flex;gap:8px;flex-wrap:wrap"><a class="btn sm" href="${esc(url.replace(/^https:/, 'webcal:'))}">${icon('cal')} iPhone / Mac / Outlook</a><a class="btn sm" target="_blank" rel="noopener" href="https://calendar.google.com/calendar/r?cid=${encodeURIComponent(url.replace(/^https:/, 'webcal:'))}">Google Calendar</a></div></div>`;
      return `<p class="meta-line" style="margin:0">Subscribe once and entries show up in the phone's own calendar app, updating on their own (phones refresh subscribed calendars every 15 minutes to a few hours). These links are read-only.</p>
        ${mine ? row(`Just ${esc(me)}'s schedule`, mine) : ''}
        ${row('Whole team', all)}
        <div class="field"><label>Someone else's schedule</label><select class="inp" id="feedPerson"><option value="">Choose a person…</option>${activePeople().map((p) => `<option>${esc(p.name)}</option>`).join('')}</select><div id="feedOther"></div></div>`;
    }
    const n = S.outbox.length;
    return `
      <div class="warnbox" style="border-color:var(--line);background:var(--surface-2)"><span><b style="color:var(--text)">Sync:</b> ${esc(S.demo ? 'Demo mode — nothing is shared.' : S.sync.state === 'live' ? 'Connected. Last synced ' + ago(S.sync.last) + '.' : (S.sync.error || S.sync.state))}</span><span>${n ? n + ' change(s) waiting to upload.' : 'No changes waiting.'} · ${S.events.size} entries on this device · v${APP_VERSION}</span></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn" data-x="syncnow">${icon('refresh')} Sync now</button>
        <button class="btn" data-x="print">${icon('printer')} Print this view</button>
        ${window.self !== window.top ? `<button class="btn" data-x="full">${icon('expand')} Open full screen</button>` : ''}
        <button class="btn" data-x="whoami">${icon('user')} ${S.me ? 'Not ' + esc(S.me) + '?' : 'Who are you?'}</button>
        <button class="btn danger" data-x="lock">${icon('lock')} Forget this device</button>
      </div>
      <div class="field"><span class="lab">Tips</span>
        <div class="meta-line" style="display:grid;gap:5px">
          <span>• Tap a name tab to see just that person. Tap more names to add them, or <b>All</b> to see everyone.</span>
          <span>• <b>Crew</b> shows everyone's week side by side. Drag an entry to another day or person to move it (computer).</span>
          <span>• <b>Day → By person</b> shows one column per person.</span>
          <span>• Entries sync to every device within about ${CFG.POLL_SECONDS || 15} seconds. Works offline — changes upload when you're back online.</span>
          <span>• Keys: <span class="kbd">T</span> today · <span class="kbd">M</span> <span class="kbd">W</span> <span class="kbd">D</span> <span class="kbd">C</span> <span class="kbd">L</span> views · <span class="kbd">N</span> new · <span class="kbd">←</span> <span class="kbd">→</span> move · <span class="kbd">/</span> search</span>
        </div></div>`;
  };
  let team = JSON.parse(JSON.stringify(people()));
  const paint = (ov) => {
    ov.querySelector('.modal-b').innerHTML = `<div class="seg" role="tablist" style="justify-self:start;flex-wrap:wrap">${tabs.map(([t, l]) => `<button data-x="tab:${t}" aria-pressed="${t === tab}">${l}</button>`).join('')}</div>` + body();
    if (tab === 'team') {
      $$('[data-ti]', ov).forEach((inp) => inp.addEventListener('input', () => { team[+inp.dataset.ti].color = inp.value; }));
      $$('[data-th]', ov).forEach((inp) => inp.addEventListener('change', () => { team[+inp.dataset.th].hidden = !inp.checked; inp.closest('.tr').lastElementChild.textContent = inp.checked ? '' : 'hidden'; }));
    }
    const fp = $('#feedPerson', ov);
    if (fp) fp.addEventListener('change', () => { const u = feedUrl(fp.value); $('#feedOther', ov).innerHTML = fp.value ? `<div class="copy-row" style="margin-top:6px"><input class="inp" readonly value="${esc(u)}"><button class="btn" data-copy="${esc(u)}">${icon('copy')} Copy</button></div>` : ''; });
    $$('[data-local]', ov).forEach((el) => el.addEventListener('change', () => {
      const k = el.dataset.local;
      let v = el.type === 'checkbox' ? el.checked : el.value;
      if (['weekStart', 'workStart', 'workEnd'].includes(k)) v = +v;
      if (k === 'solid') v = v === 'true';
      setLocal(k, v);
    }));
  };
  openModal(`<div class="modal-h"><h2>Settings</h2><button class="btn icon ghost" data-x="close" aria-label="Close">${icon('x')}</button></div><div class="modal-b"></div>`, {
    onMount: (ov) => {
      paint(ov);
      ov.addEventListener('click', (e) => {
        const c = e.target.closest('[data-copy]');
        if (c) { navigator.clipboard.writeText(c.dataset.copy).then(() => toast('Link copied'), () => { c.previousElementSibling.select(); toast('Press Ctrl/⌘+C to copy'); }); }
        const tp = e.target.closest('[data-theme-pick]');
        if (tp) { setLocal('theme', tp.dataset.themePick); paint(ov); }
      });
    },
    onClick(x, close, ov) {
      if (x.startsWith('tab:')) { tab = x.slice(4); team = JSON.parse(JSON.stringify(people())); return paint(ov); }
      if (x === 'close') return close();
      if (x === 'addperson') {
        const n = $('#newPerson', ov).value.trim();
        if (!n) return;
        if (team.some((p) => p.name.toLowerCase() === n.toLowerCase())) return toast(n + ' is already on the team');
        const palette = ['#c62828', '#ad1457', '#6a1b9a', '#283593', '#0277bd', '#00695c', '#2e7d32', '#9e9d24', '#ef6c00', '#4e342e', '#37474f'];
        team.push({ name: n, color: palette[team.length % palette.length], hidden: false });
        const keep = team; paint(ov); team = keep;
        $$('[data-ti]', ov).forEach((inp) => { inp.value = team[+inp.dataset.ti].color; });
        return;
      }
      if (x === 'saveteam') {
        S.settings = Object.assign({}, S.settings || {}, { people: team });
        queue({ op: 'settings', settings: { people: team } });
        renderAll(); toast('Team saved for everyone'); return close();
      }
      if (x === 'syncnow') { S.since = 0; sync().then(() => { toast('Synced'); paint(ov); }); return; }
      if (x === 'print') { close(); return setTimeout(() => window.print(), 150); }
      if (x === 'full') { return window.open(location.href, '_blank', 'noopener'); }
      if (x === 'whoami') { close(); return whoAmI(); }
      if (x === 'lock') {
        choose('Forget this device?', 'This removes the saved access link and cached schedule from this device. You can open it again from the MDK staff page.', [{ id: 'y', label: 'Forget this device', cls: 'danger solid' }]).then((y) => {
          if (!y) return;
          ['key', 'cache', 'outbox', 'me', 'filter'].forEach(store.del);
          location.hash = ''; location.reload();
        });
      }
    }
  });
}

function whoAmI(first) {
  openModal(`<div class="modal-h"><h2>${first ? 'Welcome! Who’s using this device?' : 'Who are you?'}</h2>${first ? '' : `<button class="btn icon ghost" data-x="close" aria-label="Close">${icon('x')}</button>`}</div>
    <div class="modal-b"><p class="meta-line" style="margin:0">Your name is added to entries you create or change, and <b>Just me</b> shows your own schedule. You can change this later in Settings.</p>
    <div class="who-grid">${activePeople().map((p) => `<button style="--c:${p.color}" data-x="me:${esc(p.name)}"><span class="av">${esc(initials(p.name))}</span>${esc(p.name)}</button>`).join('')}</div>
    <button class="btn ghost" data-x="me:">I’m just looking</button></div>`, {
    size: 'sm', dismiss: !first,
    onClick(x, close) {
      if (x === 'close') return close();
      if (x.startsWith('me:')) { S.me = x.slice(3); store.set('me', S.me || ''); store.set('askedWho', true); close(); renderAll(); if (S.me) toast('Hi ' + S.me + '!'); }
    }
  });
}

function jumpTo() {
  openModal(`<div class="modal-h"><h2>Go to date</h2><button class="btn icon ghost" data-x="close" aria-label="Close">${icon('x')}</button></div>
    <div class="modal-b"><input class="inp" type="date" id="jumpDate" value="${S.date}" autofocus>
    <div style="display:flex;gap:6px;flex-wrap:wrap">${[['Today', 0], ['+1 week', 7], ['+2 weeks', 14], ['+1 month', 'm1'], ['+3 months', 'm3']].map(([l, v]) => `<button class="btn sm" data-x="j:${v}">${l}</button>`).join('')}</div></div>
    <div class="modal-f"><span class="sp"></span><button class="btn" data-x="close">Cancel</button><button class="btn primary" data-x="go">Go</button></div>`, {
    size: 'sm',
    onMount(ov, close) { $('#jumpDate', ov).addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); ov.querySelector('[data-x="go"]').click(); } }); },
    onClick(x, close, ov) {
      if (x === 'close') return close();
      let d = null;
      if (x === 'go') d = $('#jumpDate', ov).value;
      if (x.startsWith('j:')) { const v = x.slice(2); d = v[0] === 'm' ? D.addMonths(D.today(), +v.slice(1)) : D.add(D.today(), +v); }
      if (d) { go(d); close(); }
    }
  });
}
function go(d, view) { S.date = d; S.selected = d; S.mini = null; if (view) setView(view, true); renderAll(); }
function setView(v, silent) { S.view = v; store.set('view', v); if (!silent) renderAll(); }
function step(dir) {
  const v = S.view;
  const d = v === 'month' ? D.addMonths(S.date, dir) : v === 'day' ? D.add(S.date, dir) : v === 'list' ? D.add(S.date, dir * 30) : D.add(S.date, dir * 7);
  S.date = d; S.mini = null;
  if (v === 'month') S.selected = D.ym(D.today()) === D.ym(d) ? D.today() : D.firstOfMonth(d);
  else S.selected = d;
  renderAll();
}

/* no key yet / key rejected */
function gate(message) {
  app().removeAttribute('aria-busy');
  app().innerHTML = `<div class="gate"><div class="gate-card">
    <img src="./assets/mdk-logo.jpg" alt="MDK Electric Ltd.">
    <h1>Team Calendar</h1>
    <p>${esc(message || 'Open this calendar from the MDK Electric staff page on mdkelectric.ca. Once opened there, this device remembers it.')}</p>
    <details style="text-align:left"><summary class="meta-line" style="cursor:pointer">Have an access link?</summary>
      <div class="copy-row" style="margin-top:10px"><input class="inp" id="keyIn" placeholder="Paste the calendar link or key"><button class="btn primary" id="keyGo">Open</button></div></details>
    <button class="btn ghost" id="demoGo">${icon('bolt')} Look around with sample data</button>
  </div></div>`;
  $('#keyGo').onclick = () => {
    const v = $('#keyIn').value.trim();
    const m = v.match(/[#?&]k=([A-Za-z0-9_-]+)/) || v.match(/^([A-Za-z0-9_-]{12,})$/);
    if (!m) return toast('That doesn’t look like a calendar link', { error: true });
    store.set('key', m[1]); location.hash = 'k=' + m[1]; location.reload();
  };
  $('#demoGo').onclick = () => { location.hash = 'demo'; location.reload(); };
}
function lockOut(msg) {
  clearInterval(pollTimer);
  store.del('key'); store.del('cache');
  S.key = '';
  gate(msg);
}

/* ======================================================================
   INTERACTION
   ====================================================================== */
function onClick(e) {
  const t = e.target;
  if (t.closest('.overlay')) return;
  const q = (s) => t.closest(s);
  let el;
  if (matchMedia('(max-width: 720px)').matches && (el = q('.mcell'))) { // phones: tapping a day shows its list below the month
    S.selected = el.dataset.date; renderMain();
    const p = $('.day-panel'); if (p) p.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    return;
  }
  if ((el = q('[data-open]'))) { e.preventDefault(); return openEditor({ key: el.dataset.open }); }
  if ((el = q('[data-view]'))) return setView(el.dataset.view);
  if ((el = q('.ptab'))) return togglePerson(el.dataset.person);
  if ((el = q('[data-only]'))) { e.preventDefault(); return togglePerson(el.dataset.only, 'only'); }
  if ((el = q('[data-type]'))) { const id = el.dataset.type; S.hiddenTypes.has(id) ? S.hiddenTypes.delete(id) : S.hiddenTypes.add(id); store.set('hiddenTypes', [...S.hiddenTypes]); return renderAll(); }
  if ((el = q('[data-goto]'))) { closeSide(); return go(el.dataset.goto); }
  if ((el = q('[data-day]'))) return go(el.dataset.day, 'day');
  if ((el = q('[data-new]'))) return openEditor({ date: el.dataset.new });
  if ((el = q('[data-daymode]'))) return setLocal('dayMode', el.dataset.daymode);
  if ((el = q('[data-act]'))) {
    e.preventDefault();
    const a = el.dataset.act;
    const acts = {
      side: () => {
        if (matchMedia('(max-width: 900px)').matches) return app().classList.toggle('side-open');
        const c = app().classList.toggle('side-collapsed'); store.set('sideCollapsed', c); renderMain();
      },
      today: () => go(D.today()),
      prev: () => step(-1),
      next: () => step(1),
      jump: jumpTo,
      new: () => openEditor({ date: S.view === 'month' && matchMedia('(max-width: 720px)').matches ? S.selected : S.date }),
      settings: () => openSettings(),
      syncinfo: () => openSettings('help'),
      whoami: () => whoAmI(),
      search: () => { const b = $('#searchBox'); b.classList.toggle('open'); if (b.classList.contains('open')) $('#q').focus(); },
      'mini-prev': () => { S.mini = D.addMonths(S.mini || D.firstOfMonth(S.date), -1); renderSidebar(); },
      'mini-next': () => { S.mini = D.addMonths(S.mini || D.firstOfMonth(S.date), 1); renderSidebar(); },
      'ppl-all': () => togglePerson('*'),
      'ppl-me': () => togglePerson(S.me, 'only'),
      'more-list': () => { S.listDays += 60; renderMain(); }
    };
    return acts[a] && acts[a]();
  }
  if ((el = q('.crew-grid > .cc')) && t === el) return openEditor({ date: el.dataset.newcell, person: el.dataset.person || '' });
  if ((el = q('.tg-col'))) {
    const rect = el.getBoundingClientRect();
    const mins = Math.floor(((e.clientY - rect.top) / rect.height) * 24 * 60 / 30) * 30;
    return openEditor({ date: el.dataset.slot, time: D.hm(mins), person: el.dataset.person !== undefined ? el.dataset.person : undefined });
  }
  if ((el = q('.tg-allday .cell')) && t === el) return openEditor({ date: el.dataset.drop, person: el.dataset.person !== undefined ? el.dataset.person : undefined });
}
function closeSide() { app().classList.remove('side-open'); }

/* drag & drop (mouse) */
let drag = null;
function onDragStart(e) {
  const c = e.target.closest('[data-drag]');
  if (!c) return;
  drag = { key: c.dataset.drag, from: c.dataset.from };
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', c.dataset.drag);
  setTimeout(() => c.classList.add('dragging'), 0);
}
function dropTarget(e) { return e.target.closest('[data-drop], .tg-col'); }
function onDragOver(e) {
  if (!drag) return;
  const t = dropTarget(e);
  $$('.drop').forEach((x) => x !== t && x.classList.remove('drop'));
  if (t) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; t.classList.add('drop'); }
}
function onDrop(e) {
  const t = dropTarget(e);
  $$('.drop, .dragging').forEach((x) => x.classList.remove('drop', 'dragging'));
  if (!drag || !t) return;
  e.preventDefault();
  const d = drag; drag = null;
  const toPerson = t.dataset.person !== undefined ? t.dataset.person : undefined;
  if (t.classList.contains('tg-col')) {
    const rect = t.getBoundingClientRect();
    const mins = Math.round(((e.clientY - rect.top) / rect.height) * 24 * 60 / 15) * 15;
    const series = S.events.get(parseKey(d.key).id);
    return moveOcc(d.key, t.dataset.slot, d.from, toPerson, series && series.allDay === false ? D.hm(mins) : undefined);
  }
  moveOcc(d.key, t.dataset.drop, d.from, toPerson);
}
function onDragEnd() { drag = null; $$('.drop, .dragging').forEach((x) => x.classList.remove('drop', 'dragging')); }

function onKey(e) {
  if (e.key === 'Escape') {
    if (modalStack.length) { const m = modalStack[modalStack.length - 1]; m.close(null); return; }
    closeSide(); return;
  }
  if (modalStack.length || e.metaKey || e.ctrlKey || e.altKey) return;
  if (/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName)) return;
  const k = e.key.toLowerCase();
  const map = { t: () => go(D.today()), m: () => setView('month'), w: () => setView('week'), d: () => setView('day'), c: () => setView('crew'), l: () => setView('list'),
    n: () => openEditor({ date: S.date }), arrowleft: () => step(-1), arrowright: () => step(1), '/': () => { const q = $('#q'); if (q) { $('#searchBox').classList.add('open'); q.focus(); } } };
  if (map[k]) { e.preventDefault(); map[k](); }
}

/* ======================================================================
   BOOT
   ====================================================================== */
function readHash() {
  const h = new URLSearchParams(location.hash.replace(/^#/, '') + '&' + location.search.replace(/^\?/, ''));
  return { key: h.get('k'), demo: h.has('demo'), person: h.get('person'), view: h.get('view'), date: h.get('date') };
}
function boot() {
  applyTheme();
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => S.local.theme === 'auto' && applyTheme());
  const h = readHash();
  addEventListener('hashchange', () => { // a different access link or demo link was opened in this tab
    const n = readHash();
    if ((n.key && n.key !== S.key) || n.demo !== S.demo) location.reload();
  });
  if (h.demo) { S.demo = true; }
  else {
    if (h.key) store.set('key', h.key);
    S.key = h.key || store.get('key', '');
    if (!S.key) return gate();
    // keep the key in the address so "Add to Home Screen" works
    if (!h.key) history.replaceState(null, '', location.pathname + location.search + '#k=' + S.key);
  }
  if (h.view && VIEWS.some(([v]) => v === h.view)) S.view = h.view;
  if (h.date && /^\d{4}-\d{2}-\d{2}$/.test(h.date)) { S.date = h.date; S.selected = h.date; }
  if (S.demo) seedDemo(); else loadCache();
  if (h.person) {
    const names = h.person.split(',').map((n) => people().find((p) => p.name.toLowerCase() === n.trim().toLowerCase())).filter(Boolean).map((p) => p.name);
    if (names.length) S.filter = new Set(names);
  }

  shell();
  renderAll();
  document.addEventListener('click', onClick);
  document.addEventListener('change', (e) => { const c = e.target.closest('[data-check]'); if (c) togglePerson(c.dataset.check, 'check'); });
  document.addEventListener('dblclick', (e) => { const c = e.target.closest('.mcell'); if (c && !e.target.closest('[data-open],button')) openEditor({ date: c.dataset.date }); });
  document.addEventListener('dragstart', onDragStart);
  document.addEventListener('dragover', onDragOver);
  document.addEventListener('drop', onDrop);
  document.addEventListener('dragend', onDragEnd);
  document.addEventListener('keydown', onKey);
  let rz; let wasNarrow = matchMedia('(max-width: 720px)').matches;
  addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => { const n = matchMedia('(max-width: 720px)').matches; if (n !== wasNarrow) { wasNarrow = n; shell(); } renderAll(); }, 150); });
  addEventListener('online', () => sync());
  addEventListener('offline', () => setSync('offline'));
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { sync(); renderMain(); } });
  addEventListener('focus', () => sync());
  // keep "now" line and relative times fresh
  setInterval(() => { if (!document.hidden && !modalStack.length && (S.view === 'week' || S.view === 'day')) renderMain(); paintSync(); }, 60000);

  if (S.demo) setSync('demo');
  else { sync(); startPolling(); }
  if (!S.me && !store.get('askedWho', false)) setTimeout(() => whoAmI(true), 300);
}
boot();
