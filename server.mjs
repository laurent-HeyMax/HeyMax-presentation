import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { randomUUID, createHash } from 'node:crypto';
import { createStore, cleanDeck, cleanKnowledge, HttpError } from './src/store.mjs';
import { exportHTML } from './src/export.mjs';
const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.join(ROOT, 'public');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2', '.json': 'application/json' };
export function imageType(bytes) {
  if (bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) return 'png';
  if (bytes.length >= 3 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return 'jpg';
  if (bytes.length >= 12 && bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP') return 'webp';
  throw new HttpError(400, 'Use a PNG, JPEG, or WebP image.');
}
async function jsonBody(req, limit = 2_000_000) {
  if (!(req.headers['content-type'] || '').startsWith('application/json')) throw new HttpError(415, 'Send JSON content.');
  const chunks = []; let size = 0;
  for await (const chunk of req) { size += chunk.length; if (size > limit) throw new HttpError(413, 'This file is too large.'); chunks.push(chunk); }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { throw new HttpError(400, 'The file could not be read as JSON.'); }
}
export async function createApp({ dataDir = process.env.DATA_DIR || path.join(ROOT, 'data'), seed = true } = {}) {
  const store = await createStore(dataDir, { seed });
  const uploads = path.join(dataDir, 'uploads'); await mkdir(uploads, { recursive: true });
  const server = http.createServer(async (req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'");
    const reply = (status, value) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(value)); };
    try {
      const host = req.headers.host || '';
      if (!/^(127\.0\.0\.1|localhost)(:\d+)?$/.test(host)) throw new HttpError(403, 'This version only accepts localhost requests.');
      if (!['GET', 'HEAD'].includes(req.method)) {
        if ((req.headers.origin && req.headers.origin !== `http://${host}`) || req.headers['sec-fetch-site'] === 'cross-site') throw new HttpError(403, 'Cross-site requests are not allowed.');
      }
      const url = new URL(req.url, `http://${host}`);
      const pathname = decodeURIComponent(url.pathname);
      if (pathname === '/health') return reply(200, { ok: true, mode: 'local', version: '0.1.0' });
      if (pathname === '/api/decks' && req.method === 'GET') return reply(200, store.read().decks);
      if (pathname === '/api/decks' && req.method === 'POST') {
        const input = cleanDeck(await jsonBody(req)); const now = new Date().toISOString();
        const deck = { ...input, id: randomUUID(), rev: 1, createdAt: now, updatedAt: now };
        return reply(201, await store.mutate(s => { s.decks.push(deck); return deck; }));
      }
      const match = pathname.match(/^\/api\/decks\/([a-zA-Z0-9-]+)(?:\/(export|bundle))?$/);
      if (match) {
        const [, id, action] = match;
        const deck = store.read().decks.find(d => d.id === id);
        if (!deck) throw new HttpError(404, 'Presentation not found.');
        if (req.method === 'GET' && action === 'export') {
          const output = await exportHTML(deck, PUBLIC, uploads);
          res.setHeader('Content-Type', 'text/html; charset=utf-8');
          res.setHeader('Content-Disposition', 'attachment; filename="heymax-presentation.html"');
          // Downloads are standalone documents; they contain only our trusted renderer and escaped data.
          res.removeHeader('Content-Security-Policy'); return res.end(output);
        }
        if (req.method === 'GET' && action === 'bundle') {
          const assets = {};
          for (const slide of deck.slides) if (slide.image.startsWith('/uploads/') && !assets[slide.image]) assets[slide.image] = (await readFile(path.join(uploads, path.basename(slide.image)))).toString('base64');
          res.setHeader('Content-Disposition', 'attachment; filename="heymax-presentation.json"');
          return reply(200, { format: 'heymax-studio-v1', deck, assets });
        }
        if (req.method === 'GET' && !action) return reply(200, deck);
        if (req.method === 'PUT' && !action) {
          const body = await jsonBody(req); const clean = cleanDeck(body);
          return reply(200, await store.mutate(s => {
            const index = s.decks.findIndex(d => d.id === id);
            if (s.decks[index].rev !== body.rev) throw new HttpError(409, 'This deck was changed in another tab. Download your edits or reload the saved version.');
            s.decks[index] = { ...s.decks[index], ...clean, rev: body.rev + 1, updatedAt: new Date().toISOString() };
            return s.decks[index];
          }));
        }
      }
      if (pathname === '/api/upload' && req.method === 'POST') {
        const body = await jsonBody(req, 12_000_000);
        if (typeof body.data !== 'string' || !/^[a-zA-Z0-9+/]*={0,2}$/.test(body.data)) throw new HttpError(400, 'Invalid image data.');
        const bytes = Buffer.from(body.data, 'base64'); if (bytes.length > 8_000_000) throw new HttpError(413, 'Images must be smaller than 8 MB.');
        const ext = imageType(bytes); const sha = createHash('sha256').update(bytes).digest('hex');
        await writeFile(path.join(uploads, `${sha}.${ext}`), bytes, { mode: 0o600 });
        return reply(201, { url: `/uploads/${sha}.${ext}` });
      }
      if (pathname === '/api/import' && req.method === 'POST') {
        const body = await jsonBody(req, 50_000_000);
        if (body?.format !== 'heymax-studio-v1') throw new HttpError(400, 'Choose a HeyMax Studio JSON backup.');
        const clean = cleanDeck(body.deck); const assets = body.assets || {};
        for (const slide of clean.slides) {
          if (!slide.image.startsWith('/uploads/')) continue;
          const encoded = assets[slide.image];
          if (typeof encoded !== 'string' || encoded.length > 11_000_000) throw new HttpError(400, 'A backup image is missing or too large.');
          const bytes = Buffer.from(encoded, 'base64'); const ext = imageType(bytes); const hash = createHash('sha256').update(bytes).digest('hex');
          if (slide.image !== `/uploads/${hash}.${ext}`) throw new HttpError(400, 'A backup image failed its integrity check.');
          await writeFile(path.join(uploads, `${hash}.${ext}`), bytes, { mode: 0o600 });
        }
        const now = new Date().toISOString(); const deck = { ...clean, archived: false, id: randomUUID(), title: `${clean.title} (imported)`.slice(0,150), rev: 1, createdAt: now, updatedAt: now };
        return reply(201, await store.mutate(s => { s.decks.push(deck); return deck; }));
      }
      if (pathname === '/api/knowledge' && req.method === 'GET') return reply(200, store.read().knowledge);
      if (pathname === '/api/knowledge' && req.method === 'POST') {
        const entry = { ...cleanKnowledge(await jsonBody(req)), id: randomUUID(), updatedAt: new Date().toISOString() };
        return reply(201, await store.mutate(s => { s.knowledge.push(entry); return entry; }));
      }
      const km = pathname.match(/^\/api\/knowledge\/([a-zA-Z0-9-]+)$/);
      if (km && req.method === 'PUT') {
        const clean = cleanKnowledge(await jsonBody(req));
        return reply(200, await store.mutate(s => { const i = s.knowledge.findIndex(k => k.id === km[1]); if(i < 0) throw new HttpError(404, 'Source not found.'); s.knowledge[i] = { ...s.knowledge[i], ...clean, updatedAt: new Date().toISOString() }; return s.knowledge[i]; }));
      }
      if (pathname.startsWith('/api/')) throw new HttpError(404, 'That action is not available.');
      if (!['GET', 'HEAD'].includes(req.method)) throw new HttpError(405, 'Method not allowed.');
      let file;
      if (/^\/uploads\/[a-f0-9]{64}\.(png|jpg|webp)$/.test(pathname)) file = path.join(uploads, path.basename(pathname));
      else {
        file = path.resolve(PUBLIC, '.' + (pathname === '/' ? '/index.html' : pathname));
        if (!file.startsWith(PUBLIC + path.sep)) throw new HttpError(403, 'Path not allowed.');
      }
      const bytes = await readFile(file); res.setHeader('Content-Type', MIME[path.extname(file)] || 'application/octet-stream');
      if (pathname.startsWith('/assets/')) res.setHeader('Cache-Control', 'public, max-age=3600');
      res.end(req.method === 'HEAD' ? undefined : bytes);
    } catch (e) {
      const status = e.status || (e.code === 'ENOENT' ? 404 : 500);
      if (status === 500) console.error(e);
      if (!res.headersSent) reply(status, { error: status === 500 ? 'Could not complete this action. Your saved files are unchanged.' : (e.code === 'ENOENT' ? 'File not found.' : e.message) });
      else res.end();
    }
  });
  return { server, store };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { server } = await createApp();
  const port = Number(process.env.PORT || 4310);
  server.listen(port, '127.0.0.1', () => console.log(`HeyMax Studio is ready at http://127.0.0.1:${port}\nLocal data: ${process.env.DATA_DIR || path.join(ROOT, 'data')}`));
}
