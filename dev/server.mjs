// Local dev server: serves the app + runs the REAL wix-backend/http-functions.js against an in-memory DB.
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
// Copy the real backend and point its Wix imports at the local stand-ins
const backendSrc = fs.readFileSync(path.join(root, 'wix-backend/http-functions.js'), 'utf8')
  .replace("from 'wix-http-functions'", "from './shim-http.mjs'")
  .replace("from 'wix-data'", "from './shim-data.mjs'");
fs.writeFileSync(path.join(here, 'backend.mjs'), backendSrc);
const dbFile = path.join(here, 'db.json');
if (!fs.existsSync(dbFile) || process.env.RESET) fs.writeFileSync(dbFile, JSON.stringify({ CalendarConfig: { main: { _id: 'main', accessKey: 'testkey123', feedKey: 'feedkey123', settingsUpdatedAtMs: 0 } } }));
const api = await import('./backend.mjs');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json' };
const port = Number(process.env.PORT || 4180);
http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  if (url.pathname.startsWith('/_functions/')) {
    const name = url.pathname.split('/')[2];
    const chunks = []; for await (const c of req) chunks.push(c);
    const text = Buffer.concat(chunks).toString();
    const request = { body: { text: async () => text }, query: Object.fromEntries(url.searchParams), headers: req.headers, ip: '127.0.0.1' };
    const fn = api[req.method.toLowerCase() + '_' + name] || api['use_' + name];
    if (process.env.LATENCY) await new Promise((r) => setTimeout(r, Number(process.env.LATENCY)));
    if (!fn) { res.writeHead(404); return res.end('no fn'); }
    const out = await fn(request);
    res.writeHead(out.status, out.headers); return res.end(out.body || '');
  }
  let p = path.join(root, decodeURIComponent(url.pathname));
  if (p.endsWith('/')) p += 'index.html';
  if (!p.startsWith(root) || !fs.existsSync(p)) { res.writeHead(404); return res.end('404'); }
  res.writeHead(200, { 'Content-Type': types[path.extname(p)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
  fs.createReadStream(p).pipe(res);
}).listen(port, () => console.log('dev server on http://localhost:' + port));
