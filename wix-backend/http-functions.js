/* =====================================================================
   MDK TEAM CALENDAR — Wix backend (Velo HTTP functions)
   ---------------------------------------------------------------------
   Where this goes:  Wix Editor → Dev Mode → Backend → http-functions.js
   If http-functions.js already exists, paste this whole block at the
   BOTTOM of it. Nothing here clashes with other code in that file.

   Endpoints (after you Publish the site):
     GET  https://www.mdkelectric.ca/_functions/mdkCalendar       health check
     POST https://www.mdkelectric.ca/_functions/mdkCalendar       app sync API
     GET  https://www.mdkelectric.ca/_functions/mdkCalendarFeed   phone calendar feed (.ics)

   Data lives in two CMS collections (admin-only, created already):
     CalendarEvents  – one row per calendar entry
     CalendarConfig  – row "main": accessKey, feedKey, shared team settings
   ===================================================================== */
import { response as mdkCalResponse } from 'wix-http-functions';
import mdkCalData from 'wix-data';

const MDKCAL_EVENTS = 'CalendarEvents';
const MDKCAL_CONFIG = 'CalendarConfig';
const MDKCAL_OPTS = { suppressAuth: true };
const MDKCAL_CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
  'Cache-Control': 'no-store'
};

function mdkCalJson(status, body) {
  return mdkCalResponse({
    status,
    headers: Object.assign({ 'Content-Type': 'application/json; charset=utf-8' }, MDKCAL_CORS),
    body: JSON.stringify(body)
  });
}

async function mdkCalConfig() {
  const cfg = await mdkCalData.get(MDKCAL_CONFIG, 'main', MDKCAL_OPTS);
  if (!cfg || !cfg.accessKey) throw new Error('CalendarConfig row "main" with an accessKey is missing');
  return cfg;
}

function mdkCalSafeEqual(a, b) {
  a = String(a || ''); b = String(b || '');
  if (!a || !b || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

const mdkCalStr = (v, max) => (typeof v === 'string' ? v : v == null ? '' : String(v)).slice(0, max);
const mdkCalDate = (v) => (/^\d{4}-\d{2}-\d{2}$/.test(v || '') ? v : '');
const mdkCalTime = (v) => (/^\d{2}:\d{2}$/.test(v || '') ? v : '');

/** Validate + normalise an event sent by the app. */
function mdkCalCleanEvent(e) {
  if (!e || typeof e !== 'object') throw new Error('Missing event');
  const id = mdkCalStr(e.id, 64);
  if (!/^[A-Za-z0-9_-]{6,64}$/.test(id)) throw new Error('Bad event id');
  const start = mdkCalDate(e.start);
  if (!start) throw new Error('Bad start date');
  let end = mdkCalDate(e.end) || start;
  if (end < start) end = start;
  const allDay = e.allDay !== false;
  const repeat = e.repeat && typeof e.repeat === 'object' ? e.repeat : {};
  const freqs = ['none', 'daily', 'weekdays', 'weekly', 'biweekly', 'monthly', 'yearly'];
  return {
    id,
    title: mdkCalStr(e.title, 140).trim(),
    type: mdkCalStr(e.type, 32) || 'job',
    people: Array.isArray(e.people) ? e.people.slice(0, 40).map((p) => mdkCalStr(p, 40)).filter(Boolean) : [],
    start,
    end,
    allDay,
    startTime: allDay ? '' : mdkCalTime(e.startTime) || '07:00',
    endTime: allDay ? '' : mdkCalTime(e.endTime) || '15:30',
    location: mdkCalStr(e.location, 240),
    notes: mdkCalStr(e.notes, 4000),
    color: /^#[0-9a-fA-F]{6}$/.test(e.color || '') ? e.color : '',
    repeat: {
      freq: freqs.includes(repeat.freq) ? repeat.freq : 'none',
      until: mdkCalDate(repeat.until),
      exdates: Array.isArray(repeat.exdates) ? repeat.exdates.filter(mdkCalDate).slice(0, 500) : []
    },
    createdBy: mdkCalStr(e.createdBy, 40),
    createdAt: Number(e.createdAt) || Date.now()
  };
}

function mdkCalRowToEvent(row) {
  const ev = Object.assign({}, row.event || {});
  ev.id = row._id;
  ev.updatedAt = row.updatedAtMs || 0;
  ev.updatedBy = row.updatedBy || '';
  if (row.deleted) ev.deleted = true;
  return ev;
}

async function mdkCalQueryAll(query) {
  let res = await query.limit(1000).find(MDKCAL_OPTS);
  const rows = res.items.slice();
  while (res.hasNext()) {
    res = await res.next();
    rows.push(...res.items);
  }
  return rows;
}

/* ---------- health check: open this URL in a browser after publishing ---------- */
export function get_mdkCalendar() {
  return mdkCalJson(200, { ok: true, service: 'mdk-calendar', time: Date.now() });
}

/* ---------- CORS pre-flight / anything else ---------- */
export function use_mdkCalendar() {
  return mdkCalResponse({ status: 204, headers: MDKCAL_CORS });
}

/* ---------- main API used by the calendar app ---------- */
export async function post_mdkCalendar(request) {
  let body;
  try {
    body = JSON.parse(await request.body.text());
  } catch (err) {
    return mdkCalJson(400, { error: 'Invalid JSON' });
  }
  try {
    const cfg = await mdkCalConfig();
    if (!mdkCalSafeEqual(body.key, cfg.accessKey)) {
      await new Promise((r) => setTimeout(r, 800));
      return mdkCalJson(401, { error: 'Access key not accepted' });
    }
    const by = mdkCalStr(body.by, 40);
    const action = body.action;

    if (action === 'sync') {
      const serverTime = Date.now();
      const since = Number(body.since) || 0;
      let q = mdkCalData.query(MDKCAL_EVENTS);
      q = since > 0 ? q.gt('updatedAtMs', since) : q.ne('deleted', true);
      const rows = await mdkCalQueryAll(q);
      const out = { serverTime, events: rows.map(mdkCalRowToEvent), feedKey: cfg.feedKey || '' };
      if (!since || (cfg.settingsUpdatedAtMs || 0) > since) {
        out.settings = cfg.settings || null;
        out.settingsUpdatedAt = cfg.settingsUpdatedAtMs || 0;
      }
      return mdkCalJson(200, out);
    }

    if (action === 'save') {
      const ev = mdkCalCleanEvent(body.event);
      const existing = await mdkCalData.get(MDKCAL_EVENTS, ev.id, MDKCAL_OPTS);
      const base = Number(body.baseUpdatedAt) || 0;
      if (existing && !existing.deleted && !body.force && base && (existing.updatedAtMs || 0) > base) {
        return mdkCalJson(200, { conflict: true, current: mdkCalRowToEvent(existing) });
      }
      if (existing && existing.event && existing.event.createdBy) {
        ev.createdBy = existing.event.createdBy;
        ev.createdAt = existing.event.createdAt || ev.createdAt;
      }
      const now = Date.now();
      const row = {
        _id: ev.id,
        title: ev.title,
        startDate: ev.start,
        endDate: ev.end,
        people: ev.people,
        event: ev,
        deleted: false,
        updatedAtMs: now,
        updatedBy: by
      };
      const saved = await mdkCalData.save(MDKCAL_EVENTS, row, MDKCAL_OPTS);
      return mdkCalJson(200, { event: mdkCalRowToEvent(saved) });
    }

    if (action === 'delete') {
      const id = mdkCalStr(body.id, 64);
      const existing = await mdkCalData.get(MDKCAL_EVENTS, id, MDKCAL_OPTS);
      if (!existing) return mdkCalJson(200, { ok: true });
      existing.deleted = true;
      existing.updatedAtMs = Date.now();
      existing.updatedBy = by;
      const saved = await mdkCalData.update(MDKCAL_EVENTS, existing, MDKCAL_OPTS);
      return mdkCalJson(200, { event: mdkCalRowToEvent(saved) });
    }

    if (action === 'saveSettings') {
      const s = body.settings;
      if (!s || typeof s !== 'object' || !Array.isArray(s.people)) return mdkCalJson(400, { error: 'Bad settings' });
      const settings = {
        people: s.people.slice(0, 60).map((p) => ({
          name: mdkCalStr(p && p.name, 40).trim(),
          color: /^#[0-9a-fA-F]{6}$/.test((p && p.color) || '') ? p.color : '#607d8b',
          hidden: !!(p && p.hidden)
        })).filter((p) => p.name)
      };
      cfg.settings = settings;
      cfg.settingsUpdatedAtMs = Date.now();
      await mdkCalData.update(MDKCAL_CONFIG, cfg, MDKCAL_OPTS);
      return mdkCalJson(200, { settings, settingsUpdatedAt: cfg.settingsUpdatedAtMs });
    }

    if (action === 'ping') return mdkCalJson(200, { ok: true, serverTime: Date.now() });

    return mdkCalJson(400, { error: 'Unknown action' });
  } catch (err) {
    return mdkCalJson(500, { error: String((err && err.message) || err) });
  }
}

/* ---------- read-only .ics feed for iPhone / Google / Outlook calendars ----------
   https://www.mdkelectric.ca/_functions/mdkCalendarFeed?k=FEEDKEY            everyone
   https://www.mdkelectric.ca/_functions/mdkCalendarFeed?k=FEEDKEY&person=Cal just Cal */
const MDKCAL_TZ = [
  'BEGIN:VTIMEZONE', 'TZID:America/Toronto',
  'BEGIN:DAYLIGHT', 'TZOFFSETFROM:-0500', 'TZOFFSETTO:-0400', 'TZNAME:EDT',
  'DTSTART:19700308T020000', 'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU', 'END:DAYLIGHT',
  'BEGIN:STANDARD', 'TZOFFSETFROM:-0400', 'TZOFFSETTO:-0500', 'TZNAME:EST',
  'DTSTART:19701101T020000', 'RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU', 'END:STANDARD',
  'END:VTIMEZONE'
];
const MDKCAL_TYPES = {
  job: 'Job', service: 'Service call', quote: 'Quote / estimate', inspection: 'Inspection',
  meeting: 'Meeting', training: 'Training', vacation: 'Vacation', off: 'Day off', other: 'Other'
};

function mdkCalIcsText(s) {
  return String(s || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}
function mdkCalFold(line) {
  const out = [];
  while (line.length > 74) { out.push(line.slice(0, 74)); line = ' ' + line.slice(74); }
  out.push(line);
  return out.join('\r\n');
}
function mdkCalAddDays(ymd, n) {
  const d = new Date(ymd + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
const mdkCalCompact = (ymd) => ymd.replace(/-/g, '');

export async function get_mdkCalendarFeed(request) {
  try {
    const cfg = await mdkCalConfig();
    const q = request.query || {};
    if (!cfg.feedKey || !mdkCalSafeEqual(q.k, cfg.feedKey)) {
      return mdkCalResponse({ status: 401, headers: { 'Content-Type': 'text/plain' }, body: 'Feed key not accepted' });
    }
    const person = mdkCalStr(q.person, 40);
    const rows = await mdkCalQueryAll(mdkCalData.query(MDKCAL_EVENTS).ne('deleted', true));
    const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
    const lines = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//MDK Electric//Team Calendar//EN', 'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH', 'X-WR-CALNAME:' + mdkCalIcsText(person ? 'MDK - ' + person : 'MDK Team Calendar'),
      'X-WR-TIMEZONE:America/Toronto', 'REFRESH-INTERVAL;VALUE=DURATION:PT30M', 'X-PUBLISHED-TTL:PT30M'
    ].concat(MDKCAL_TZ);

    rows.forEach((row) => {
      const e = row.event || {};
      if (!e.start) return;
      const people = Array.isArray(e.people) ? e.people : [];
      if (person && !people.includes(person)) return;
      const who = people.length ? ' (' + people.join(', ') + ')' : '';
      lines.push('BEGIN:VEVENT', 'UID:' + row._id + '@mdkelectric.ca', 'DTSTAMP:' + stamp);
      if (e.allDay !== false) {
        lines.push('DTSTART;VALUE=DATE:' + mdkCalCompact(e.start));
        lines.push('DTEND;VALUE=DATE:' + mdkCalCompact(mdkCalAddDays(e.end || e.start, 1)));
      } else {
        // Multi-day timed entries mean "these hours on each day" (e.g. 7:30–3:30 Mon to Fri)
        const span = Math.round((Date.parse((e.end || e.start) + 'T12:00:00Z') - Date.parse(e.start + 'T12:00:00Z')) / 864e5);
        const daily = span > 0 && !(e.repeat && e.repeat.freq && e.repeat.freq !== 'none');
        lines.push('DTSTART;TZID=America/Toronto:' + mdkCalCompact(e.start) + 'T' + (e.startTime || '07:00').replace(':', '') + '00');
        lines.push('DTEND;TZID=America/Toronto:' + mdkCalCompact(daily ? e.start : (e.end || e.start)) + 'T' + (e.endTime || '15:30').replace(':', '') + '00');
        if (daily) lines.push('RRULE:FREQ=DAILY;COUNT=' + (span + 1));
      }
      const r = e.repeat || {};
      const rule = { daily: 'FREQ=DAILY', weekdays: 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR', weekly: 'FREQ=WEEKLY',
        biweekly: 'FREQ=WEEKLY;INTERVAL=2', monthly: 'FREQ=MONTHLY', yearly: 'FREQ=YEARLY' }[r.freq];
      if (rule) {
        let until = '';
        if (r.until) until = e.allDay !== false ? ';UNTIL=' + mdkCalCompact(r.until) : ';UNTIL=' + mdkCalCompact(mdkCalAddDays(r.until, 1)) + 'T045959Z';
        lines.push('RRULE:' + rule + until);
        (r.exdates || []).forEach((x) => {
          lines.push(e.allDay !== false ? 'EXDATE;VALUE=DATE:' + mdkCalCompact(x)
            : 'EXDATE;TZID=America/Toronto:' + mdkCalCompact(x) + 'T' + (e.startTime || '07:00').replace(':', '') + '00');
        });
      }
      lines.push('SUMMARY:' + mdkCalIcsText((e.title || MDKCAL_TYPES[e.type] || 'Busy') + (person ? '' : who)));
      if (e.location) lines.push('LOCATION:' + mdkCalIcsText(e.location));
      const desc = [MDKCAL_TYPES[e.type] || '', people.length ? 'Crew: ' + people.join(', ') : '', e.notes || ''].filter(Boolean).join('\n');
      if (desc) lines.push('DESCRIPTION:' + mdkCalIcsText(desc));
      lines.push('CATEGORIES:' + mdkCalIcsText(MDKCAL_TYPES[e.type] || 'Other'));
      lines.push('END:VEVENT');
    });
    lines.push('END:VCALENDAR');
    return mdkCalResponse({
      status: 200,
      headers: { 'Content-Type': 'text/calendar; charset=utf-8', 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' },
      body: lines.map(mdkCalFold).join('\r\n') + '\r\n'
    });
  } catch (err) {
    return mdkCalResponse({ status: 500, headers: { 'Content-Type': 'text/plain' }, body: 'Feed error: ' + String((err && err.message) || err) });
  }
}
