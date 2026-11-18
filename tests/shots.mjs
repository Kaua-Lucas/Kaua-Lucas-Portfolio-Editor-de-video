// Gera screenshots por seção para revisão visual. Uso: node shots.mjs [largura] [pasta-de-saída]
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const W = +(process.argv[2] || 1440);
const OUT = process.argv[3] || path.join(ROOT, 'tests/shots');
fs.mkdirSync(OUT, { recursive: true });
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.webm': 'video/webm', '.webp': 'image/webp', '.jpeg': 'image/jpeg', '.jpg': 'image/jpeg' };
const server = http.createServer((req, res) => {
  const f = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]) === '/' ? 'index.html' : decodeURIComponent(req.url.split('?')[0]));
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  const size = fs.statSync(f).size, type = MIME[path.extname(f)] || 'application/octet-stream';
  const m = req.headers.range && /bytes=(\d*)-(\d*)/.exec(req.headers.range);
  if (m) { const s = +m[1] || 0, e = m[2] ? +m[2] : size - 1; res.writeHead(206, { 'Content-Type': type, 'Content-Range': `bytes ${s}-${e}/${size}`, 'Accept-Ranges': 'bytes', 'Content-Length': e - s + 1 }); fs.createReadStream(f, { start: s, end: e }).pipe(res); }
  else { res.writeHead(200, { 'Content-Type': type, 'Content-Length': size, 'Accept-Ranges': 'bytes' }); fs.createReadStream(f).pipe(res); }
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await puppeteer.launch({ executablePath: process.env.CHROME_PATH || '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--mute-audio'] });
const page = await browser.newPage();
await page.setViewport({ width: W, height: W < 600 ? 800 : 900 });
await page.goto(base + '/', { waitUntil: 'domcontentloaded' });
await new Promise(r => setTimeout(r, 800));
// rola a página inteira para disparar reveals e lazy-load
await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 400) { scrollTo(0, y); await new Promise(r => setTimeout(r, 90)); } scrollTo(0, 0); });
await page.evaluate(() => document.querySelectorAll('.reveal').forEach(e => e.classList.add('vis')));
await new Promise(r => setTimeout(r, 1000));
const ids = ['hero', 'trabalhos', 'resultado', 'especialidades', 'processo', 'motion', 'avaliacoes', 'sobre', 'contratar', 'contato'];
for (const id of ids) {
  const h = await page.$(`#${id}`);
  await h.evaluate(e => e.scrollIntoView({ block: 'start' })); await new Promise(r => setTimeout(r, 300));
  await h.screenshot({ path: path.join(OUT, `${W}-${id}.png`) });
}
// estados interativos: processo na etapa 5 e modal aberto
await page.evaluate(() => document.querySelectorAll('#procTabs [role=tab]')[4].click());
await new Promise(r => setTimeout(r, 1500));
await (await page.$('#processo')).screenshot({ path: path.join(OUT, `${W}-processo-etapa5.png`) });
await page.evaluate(() => document.querySelectorAll('#procTabs [role=tab]')[7].click());
await new Promise(r => setTimeout(r, 1500));
await (await page.$('#processo')).screenshot({ path: path.join(OUT, `${W}-processo-etapa8.png`) });
console.log('ok', fs.readdirSync(OUT).filter(f => f.startsWith(W + '-')).join(' '));
await browser.close(); server.close();
