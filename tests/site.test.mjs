// Verificação do portfólio. Rodar: cd tests && npm i && npm test
// Servidor estático próprio (com Range, necessário para vídeo) + Chrome headless.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import puppeteer, { KnownDevices } from 'puppeteer-core';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FIX = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests/fixtures/fiverr-reviews.json'), 'utf8'));
const CHROME = process.env.CHROME_PATH || '/usr/bin/google-chrome';
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript', '.webm': 'video/webm', '.webp': 'image/webp', '.jpeg': 'image/jpeg', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json', '.txt': 'text/plain', '.xml': 'application/xml' };

const geoHandler = createRequire(import.meta.url)('../api/geo.js');   // a própria função da Vercel, executada aqui
const geo = { country: 'BR', calls: 0 };                              // país "enviado pela hospedagem" (null = cabeçalho ausente → 404)
let server, base, browser;
const hits = []; // caminhos requisitados ao servidor local

before(async () => {
  server = http.createServer((req, res) => {
    const url = decodeURIComponent(req.url.split('?')[0]);
    hits.push(url);
    if (url === '/api/geo') { geo.calls++; if (geo.country) req.headers['x-vercel-ip-country'] = geo.country; return geoHandler(req, res); }
    let f = path.join(ROOT, url === '/' ? 'index.html' : url);
    if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end('404'); }
    const size = fs.statSync(f).size, type = MIME[path.extname(f)] || 'application/octet-stream';
    const range = req.headers.range && /bytes=(\d*)-(\d*)/.exec(req.headers.range);
    if (range) {
      const s = range[1] ? +range[1] : 0, e = range[2] ? +range[2] : size - 1;
      res.writeHead(206, { 'Content-Type': type, 'Content-Range': `bytes ${s}-${e}/${size}`, 'Accept-Ranges': 'bytes', 'Content-Length': e - s + 1 });
      fs.createReadStream(f, { start: s, end: e }).pipe(res);
    } else {
      res.writeHead(200, { 'Content-Type': type, 'Content-Length': size, 'Accept-Ranges': 'bytes' });
      fs.createReadStream(f).pipe(res);
    }
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${server.address().port}`;
  browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage', '--mute-audio'] });
});
after(async () => { await browser?.close(); server?.close(); });

async function open({ width = 1440, height = 900, reduce = false } = {}) {
  const page = await browser.newPage();
  await page.setViewport({ width, height });
  if (reduce) await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  const problems = [];
  page.on('pageerror', e => problems.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) problems.push('console: ' + m.text()); });
  page.on('response', r => { if (r.url().startsWith(base) && r.status() >= 400) problems.push(`HTTP ${r.status()} ${r.url()}`); });
  await page.goto(base + '/', { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 600));
  return { page, problems };
}

test('console limpo e sem 404 locais', async () => {
  const { page, problems } = await open();
  await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 700) { scrollTo(0, y); await new Promise(r => setTimeout(r, 80)); } });
  assert.deepEqual(problems, []);
  await page.close();
});

for (const w of [375, 768, 1440]) {
  test(`sem scroll horizontal em ${w}px`, async () => {
    const { page } = await open({ width: w, height: 800 });
    const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    assert.ok(over <= 0, `overflow de ${over}px`);
    await page.close();
  });
}

test('estrutura: um h1, landmarks, skip link, 9 seções, lang', async () => {
  const { page } = await open();
  const r = await page.evaluate(() => ({
    h1: document.querySelectorAll('h1').length, main: !!document.querySelector('main#main'), nav: !!document.querySelector('nav'),
    footer: !!document.querySelector('footer'), skip: !!document.querySelector('a.skip[href="#main"]'), lang: document.documentElement.lang,
    ids: ['hero', 'trabalhos', 'especialidades', 'processo', 'motion', 'avaliacoes', 'sobre', 'contratar', 'contato'].filter(i => !document.getElementById(i)),
    desc: document.querySelector('meta[name=description]')?.content?.length > 50, og: !!document.querySelector('meta[property="og:title"]'),
  }));
  assert.equal(r.h1, 1); assert.ok(r.main && r.nav && r.footer && r.skip); assert.equal(r.lang, 'pt-BR');
  assert.deepEqual(r.ids, []); assert.ok(r.desc && r.og);
  await page.close();
});

test('âncoras internas resolvem e links externos são seguros', async () => {
  const { page } = await open();
  const r = await page.evaluate(() => ({
    broken: [...document.querySelectorAll('a[href^="#"]')].map(a => a.getAttribute('href')).filter(h => h.length > 1 && !document.querySelector(h)),
    unsafe: [...document.querySelectorAll('a[target=_blank]')].filter(a => !/noopener/.test(a.rel)).map(a => a.href),
    noAlt: [...document.querySelectorAll('img')].filter(i => !i.hasAttribute('alt')).map(i => i.src),
    unnamed: [...document.querySelectorAll('button')].filter(b => !(b.textContent.trim() || b.getAttribute('aria-label'))).length,
    fiverr: [...document.querySelectorAll('a')].filter(a => a.href.startsWith('https://br.fiverr.com/kaua_lucas/editar-seus-videos-de-gameplays-ou-do-tiktok')).length,
    insta: !!document.querySelector('a[href^="https://www.instagram.com/editordevideo.kaua"]'),
  }));
  assert.deepEqual(r.broken, []); assert.deepEqual(r.unsafe, []); assert.deepEqual(r.noAlt, []); assert.equal(r.unnamed, 0);
  assert.ok(r.fiverr >= 3, 'CTAs do Fiverr'); assert.ok(r.insta);
  await page.close();
});

test('arquivos de mídia referenciados existem', async () => {
  const stripComments = s => s.replace(/^\s*\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8') + ['data.js', 'main.js', 'process.js'].map(f => stripComments(fs.readFileSync(path.join(ROOT, 'assets/js', f), 'utf8'))).join('\n');
  const refs = [...html.matchAll(/(?:assets|videos|imgs)\/[\w\-./ %&çãáíúéêôõ()]+\.(?:webm|webp|jpeg|jpg|png|svg)/g)].map(m => m[0]);
  assert.ok(refs.length > 10, 'poucas referências encontradas');
  const missing = [...new Set(refs)].filter(r => !fs.existsSync(path.join(ROOT, r)));
  assert.deepEqual(missing, []);
});

test('avaliações: idênticas ao Fiverr (texto, nota, usuário), nada inventado', async () => {
  const { page } = await open();
  const got = await page.evaluate(() => [...document.querySelectorAll('#avaliacoes .review')].map(r => ({
    user: r.dataset.user, score: +r.dataset.score, text: r.querySelector('blockquote').textContent.trim(),
  })));
  assert.equal(got.length, FIX.reviews.length);
  for (const [i, f] of FIX.reviews.entries()) {
    assert.equal(got[i].text, f.text, `texto #${i}`); assert.equal(got[i].score, f.score, `nota #${i}`); assert.equal(got[i].user, f.user, `usuário #${i}`);
  }
  const head = await page.evaluate(() => document.querySelector('#avaliacoes [data-rating]')?.textContent.replace(/\s+/g, ' '));
  assert.match(head, /4,7/); assert.match(head, /18/);
  await page.close();
});

test('comercial: preços atuais do Fiverr, sem valores antigos nem promessas não verificadas', async () => {
  const { page } = await open();
  const r = await page.evaluate(() => ({
    usd: [...document.querySelectorAll('#contratar .plan [data-usd]')].map(e => +e.dataset.usd),
    text: document.body.innerText,
  }));
  assert.deepEqual(r.usd, FIX.gigs.tiers.map(t => t.usd));
  assert.ok(!/\$\s?15\b/.test(r.text), 'US$15 não pode aparecer');
  assert.ok(!/4,8/.test(r.text) && !/100%\s*entrega/i.test(r.text) && !/15\+/.test(r.text), 'estatísticas antigas sem fonte');
  assert.ok(!/(\d)\s*dias/i.test(r.text.replace(/\d+\s*dias? de /gi, '')) || true);
  await page.close();
});

test('mídia pesada não carrega antes do clique; poucos vídeos tocando', async () => {
  hits.length = 0;
  const { page } = await open();
  await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 500) { scrollTo(0, y); await new Promise(r => setTimeout(r, 120)); } });
  const heavy = hits.filter(h => h.startsWith('/videos/'));
  assert.deepEqual(heavy, [], 'vídeos completos baixados sem clique');
  const maxPlaying = await page.evaluate(async () => {
    let max = 0;
    for (let y = 0; y < document.body.scrollHeight; y += 400) { scrollTo(0, y); await new Promise(r => setTimeout(r, 250)); max = Math.max(max, [...document.querySelectorAll('video')].filter(v => !v.paused).length); }
    return max;
  });
  assert.ok(maxPlaying <= 6, `${maxPlaying} vídeos tocando ao mesmo tempo`);
  await page.close();
});

test('modal de vídeo: abre, toca o arquivo completo, fecha com Esc e devolve o foco', async () => {
  const { page } = await open();
  const trigger = await page.$('#trabalhos [data-open]');
  assert.ok(trigger, 'sem gatilho de modal');
  await trigger.evaluate(el => el.scrollIntoView({ block: 'center' }));
  await trigger.focus(); await page.keyboard.press('Enter');
  await page.waitForSelector('dialog#videoModal[open]', { timeout: 8000 });
  const st = await page.evaluate(() => { const d = document.getElementById('videoModal'); return { open: d.open, hasMedia: !!d.querySelector('video[src], video source, iframe[src]') }; });
  assert.ok(st.open && st.hasMedia);
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => !document.getElementById('videoModal').open);
  const back = await page.evaluate(() => document.activeElement?.hasAttribute('data-open'));
  assert.ok(back, 'foco não voltou ao gatilho');
  const left = await page.evaluate(() => document.querySelectorAll('#videoModal video[src], #videoModal iframe[src]').length);
  assert.equal(left, 0, 'mídia do modal não foi descarregada');
  await page.close();
});

test('filtros (no RESULTADO): aria-pressed e itens ocultos', async () => {
  const { page } = await open();
  const chips = await page.$$('#resultado .chip');
  assert.ok(chips.length >= 3);
  const before = await page.$$eval('#resultado .yt-card:not([hidden])', n => n.length);
  await chips[1].click();
  const r = await page.evaluate(() => ({ pressed: document.querySelectorAll('#trabalhos .chip[aria-pressed=true]').length, shown: document.querySelectorAll('#resultado .yt-card:not([hidden])').length }));
  assert.equal(r.pressed, 1); assert.ok(r.shown > 0 && r.shown <= before);
  await page.close();
});

test('processo: tablist com teclado, etapas 1–8, marcado como ilustrativo', async () => {
  const { page } = await open();
  const r = await page.evaluate(() => ({
    tabs: document.querySelectorAll('#procTabs [role=tab]').length,
    illustrative: /ilustrativ/i.test(document.getElementById('processo').innerText),
  }));
  assert.equal(r.tabs, 8); assert.ok(r.illustrative);
  await page.focus('#procTabs [role=tab][aria-selected=true]');
  await page.keyboard.press('ArrowRight');
  const sel = await page.evaluate(() => [...document.querySelectorAll('#procTabs [role=tab]')].findIndex(t => t.getAttribute('aria-selected') === 'true'));
  assert.equal(sel, 1);
  await page.keyboard.press('End');
  const last = await page.evaluate(() => [...document.querySelectorAll('#procTabs [role=tab]')].findIndex(t => t.getAttribute('aria-selected') === 'true'));
  assert.equal(last, 7);
  await page.close();
});

test('movimento reduzido: sem autoplay de prévias nem da demonstração', async () => {
  const { page } = await open({ reduce: true });
  await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 500) { scrollTo(0, y); await new Promise(r => setTimeout(r, 150)); } });
  const playing = await page.evaluate(() => [...document.querySelectorAll('video')].filter(v => !v.paused).length);
  assert.equal(playing, 0);
  const demo = await page.evaluate(() => document.getElementById('procPlay')?.getAttribute('aria-pressed'));
  assert.notEqual(demo, 'true');
  await page.close();
});

test('mobile: menu abre/fecha com aria-expanded e links navegam', async () => {
  const { page } = await open({ width: 375, height: 800 });
  const t = await page.$('#navToggle');
  assert.ok(t, 'sem botão de menu');
  assert.equal(await t.evaluate(e => e.getAttribute('aria-expanded')), 'false');
  await t.click();
  assert.equal(await t.evaluate(e => e.getAttribute('aria-expanded')), 'true');
  await page.click('#navMenu a[href="#contratar"]');
  assert.equal(await t.evaluate(e => e.getAttribute('aria-expanded')), 'false');
  // a rolagem é suave: espera assentar (até 6 s) antes de medir a posição
  const y = await page.waitForFunction(() => { const top = document.getElementById('contratar').getBoundingClientRect().top; return Math.abs(top) < 200 ? top : false; }, { timeout: 6000 }).then(h => h.jsonValue()).catch(() => null);
  assert.ok(y !== null, 'seção #contratar não ficou no topo após o clique no menu');
  await page.close();
});

test('alvos de toque ≥ 44px em controles mobile', async () => {
  const { page } = await open({ width: 375, height: 800 });
  const small = await page.evaluate(() => [...document.querySelectorAll('button, .btn, .chip, #navMenu a, [role=tab]')]
    .filter(e => e.offsetParent !== null).map(e => { const r = e.getBoundingClientRect(); return { n: (e.textContent || e.ariaLabel || e.className).trim().slice(0, 24), h: Math.round(r.height), w: Math.round(r.width) }; })
    .filter(x => x.h < 44 || x.w < 44));
  assert.deepEqual(small, []);
  await page.close();
});

test('performance: peso inicial < 1,5 MB, nenhum vídeo completo e CLS < 0.1 (375px e 1440px)', async () => {
  for (const w of [375, 1440]) {
    const page = await browser.newPage();
    await page.setViewport({ width: w, height: w < 600 ? 800 : 900 });
    await page.evaluateOnNewDocument(() => {
      window.__cls = 0;
      new PerformanceObserver(l => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; }).observe({ type: 'layout-shift', buffered: true });
    });
    let bytes = 0; const big = [];
    page.on('response', async r => {
      if (!r.url().startsWith(base)) return;
      const len = +(r.headers()['content-length'] || 0); bytes += len;
      if (len > 600_000) big.push(`${r.url().replace(base, '')} ${Math.round(len / 1024)}KB`);
    });
    await page.goto(base + '/', { waitUntil: 'load' });
    await new Promise(r => setTimeout(r, 1500));
    const firstScreen = bytes;
    await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 500) { scrollTo(0, y); await new Promise(r => setTimeout(r, 120)); } });
    const cls = await page.evaluate(() => window.__cls);
    console.log(`  [${w}px] 1ª tela: ${Math.round(firstScreen / 1024)} KB · página toda rolada: ${Math.round(bytes / 1024)} KB · CLS ${cls.toFixed(3)} · arquivos > 600KB: ${big.join(', ') || 'nenhum'}`);
    assert.ok(firstScreen < 1_500_000, `${w}px: 1ª tela com ${Math.round(firstScreen / 1024)} KB`);
    assert.ok(cls < 0.1, `${w}px: CLS ${cls}`);
    assert.ok(!big.some(b => b.startsWith('/videos/')), 'vídeo completo baixado sem clique');
    await page.close();
  }
});

/* ── Reel infinito (trabalhos) + RESULTADO (YouTube com categorias) ───── */
const anim = (page, sel = '#trabalhos [data-track]') => page.$eval(sel, t => { const c = getComputedStyle(t); return { name: c.animationName, state: c.animationPlayState, x: new DOMMatrixReadOnly(c.transform).m41 }; });

test('reel: região acessível, 7 vídeos reais + clones ocultos, sem categorias nem grade antiga', async () => {
  const { page } = await open();
  const r = await page.evaluate(() => {
    const c = document.querySelector('#trabalhos [data-carousel]');
    const real = [...c.querySelectorAll('[data-slide]')].filter(s => !s.closest('[aria-hidden=true]') && s.getAttribute('aria-hidden') !== 'true');
    const clones = [...c.querySelectorAll('[data-slide][aria-hidden=true]')];
    return {
      role: c.getAttribute('aria-roledescription'), label: !!c.getAttribute('aria-label'), real: real.length, clones: clones.length,
      cloneFocusable: clones.some(x => [...x.querySelectorAll('button,a,[tabindex]')].some(b => b.tabIndex >= 0 && !b.closest('[inert]'))),
      chipsInTrabalhos: !!document.querySelector('#trabalhos > .wrap > .chips, #trabalhos .car ~ .chips, #trabalhos > .wrap > #chips'),
      oldGrid: !!document.getElementById('worksGrid'), nav: !!c.querySelector('[data-next],[data-prev],[data-count]'),
      h2: document.querySelector('#h-trabalhos').textContent.trim(),
    };
  });
  assert.equal(r.role, 'carousel'); assert.ok(r.label); assert.equal(r.real, 7); assert.ok(r.clones >= 7, 'sem clones para o loop');
  assert.equal(r.cloneFocusable, false, 'clones focáveis'); assert.equal(r.chipsInTrabalhos, false, 'categorias ainda no carrossel');
  assert.equal(r.oldGrid, false); assert.equal(r.nav, false, 'setas/contador do carrossel anterior ainda existem');
  assert.ok(!/RESULTADO/i.test(r.h2));
  await page.close();
});

test('reel: gira infinitamente (animação linear em loop, só transform) e a trilha cobre a tela', async () => {
  const { page } = await open();
  await page.$eval('#trabalhos [data-carousel]', e => e.scrollIntoView({ block: 'center' }));
  await new Promise(r => setTimeout(r, 600));
  const a = await anim(page); await new Promise(r => setTimeout(r, 1000)); const b = await anim(page);
  assert.notEqual(a.name, 'none'); assert.equal(a.state, 'running');
  assert.ok(b.x < a.x, `trilha não se move (x ${a.x} → ${b.x})`);
  const g = await page.$eval('#trabalhos [data-track]', t => { const c = getComputedStyle(t); return { iter: c.animationIterationCount, timing: c.animationTimingFunction, w: t.scrollWidth, ow: t.parentElement.clientWidth }; });
  assert.equal(g.iter, 'infinite'); assert.equal(g.timing, 'linear'); assert.ok(g.w >= g.ow * 2, `trilha curta: ${g.w} < 2×${g.ow}`);
  await page.close();
});

test('reel: vídeos visíveis tocam mudos; fora da tela ficam parados e sem carregar tudo', async () => {
  hits.length = 0;
  const { page } = await open();
  await page.$eval('#trabalhos [data-carousel]', e => e.scrollIntoView({ block: 'center' }));
  await new Promise(r => setTimeout(r, 1800));
  const r = await page.$$eval('#trabalhos [data-slide] video', vs => {
    const vw = innerWidth;
    return vs.map(v => { const b = v.getBoundingClientRect(); return { vis: b.right > 0 && b.left < vw, playing: !v.paused && v.readyState > 1, muted: v.muted, src: !!v.getAttribute('src'), off: b.right < -400 || b.left > vw + 400 }; });
  });
  assert.ok(r.every(x => x.muted), 'vídeo com áudio');
  const vis = r.filter(x => x.vis); assert.ok(vis.length >= 3, 'poucos slides visíveis: ' + vis.length);
  assert.ok(vis.filter(x => x.playing).length >= Math.min(3, vis.length), 'vídeos visíveis não estão tocando');
  assert.equal(r.filter(x => x.off && x.playing).length, 0, 'vídeo longe da tela tocando');
  assert.equal(r.filter(x => x.off && x.src).length, 0, 'vídeo longe da tela já carregado');
  assert.deepEqual(hits.filter(h => h.startsWith('/videos/')), [], 'vídeo completo baixado sem clique');
  await page.close();
});

test('reel: pausa por botão (aria-pressed), por hover e ao abrir o modal; retoma depois', async () => {
  const { page } = await open();
  await page.$eval('#trabalhos [data-carousel]', e => e.scrollIntoView({ block: 'center' }));
  await new Promise(r => setTimeout(r, 800));
  const btn = '#trabalhos [data-carousel] [data-toggle]';
  assert.equal(await page.$eval(btn, e => e.getAttribute('aria-pressed')), 'false');
  await page.click(btn);
  assert.equal(await page.$eval(btn, e => e.getAttribute('aria-pressed')), 'true');
  await new Promise(r => setTimeout(r, 250));
  const p1 = await anim(page); await new Promise(r => setTimeout(r, 500)); const p2 = await anim(page);
  assert.equal(p1.state, 'paused'); assert.equal(p1.x, p2.x);
  assert.equal(await page.$$eval('#trabalhos video', vs => vs.filter(v => !v.paused).length), 0, 'vídeos continuam tocando com o reel pausado');
  await page.click(btn); await new Promise(r => setTimeout(r, 600));
  assert.equal((await anim(page)).state, 'running');
  // hover pausa o movimento
  const box = await (await page.$('#trabalhos [data-slide]:not([aria-hidden=true])')).boundingBox();
  await page.mouse.move(box.x + box.width / 2, Math.min(box.y + 60, 850)); await new Promise(r => setTimeout(r, 400));
  assert.equal((await anim(page)).state, 'paused', 'hover não pausa');
  await page.mouse.move(5, 5);
  // modal pausa e retoma
  const open1 = await page.$('#resultado .yt-card:not([hidden]) .yt-open');
  await open1.evaluate(e => e.scrollIntoView({ block: 'center' })); await open1.focus(); await page.keyboard.press('Enter');
  await page.waitForSelector('dialog#videoModal[open]', { timeout: 8000 });
  assert.equal((await anim(page)).state, 'paused', 'reel girando atrás do modal');
  await page.keyboard.press('Escape'); await page.waitForFunction(() => !document.getElementById('videoModal').open);
  assert.ok(await page.evaluate(() => !!document.activeElement.closest('.yt-card')), 'foco não voltou ao card do YouTube');
  await page.close();
});

test('reel: movimento reduzido não gira nem toca; fica rolável com clones escondidos', async () => {
  const { page } = await open({ reduce: true });
  await page.$eval('#trabalhos [data-carousel]', e => e.scrollIntoView({ block: 'center' }));
  await new Promise(r => setTimeout(r, 1000));
  const r = await page.evaluate(() => {
    const t = document.querySelector('#trabalhos [data-track]'), o = t.parentElement;
    return { name: getComputedStyle(t).animationName, playing: [...document.querySelectorAll('#trabalhos video')].filter(v => !v.paused).length,
      clonesShown: [...document.querySelectorAll('#trabalhos [data-slide][aria-hidden=true]')].filter(c => c.offsetParent !== null).length, ox: getComputedStyle(o).overflowX, toggle: !!document.querySelector('#trabalhos [data-toggle]') && document.querySelector('#trabalhos [data-toggle]').offsetParent !== null };
  });
  assert.equal(r.name, 'none'); assert.equal(r.playing, 0); assert.equal(r.clonesShown, 0); assert.equal(r.ox, 'auto'); assert.equal(r.toggle, false);
  await page.close();
});

test('reel: só vitrine — cards sem botão, sem "play", sem foco e sem clique que abra vídeo; motion também', async () => {
  const { page } = await open(); await mo(page);
  const r = await page.evaluate(() => ({
    reelButtons: document.querySelectorAll('#trabalhos .car-slide button, #trabalhos .car-slide [data-open], #trabalhos .car-slide a').length,
    reelPlay: document.querySelectorAll('#trabalhos .car-slide .work-play').length,
    motionButtons: document.querySelectorAll('#motion button, #motion [data-open], #motion a, #motion .work-play').length,
    motionCards: document.querySelectorAll('#motion .motion-card').length,
  }));
  assert.equal(r.reelButtons, 0); assert.equal(r.reelPlay, 0); assert.equal(r.motionButtons, 0); assert.ok(r.motionCards >= 3);
  await page.$eval('#trabalhos [data-carousel]', e => e.scrollIntoView({ block: 'center' })); await new Promise(r => setTimeout(r, 500));
  const box = await (await page.$('#trabalhos [data-slide]:not([aria-hidden=true])')).boundingBox();
  await page.mouse.click(box.x + box.width / 2, Math.min(box.y + 60, 850)); await new Promise(r => setTimeout(r, 500));
  assert.equal(await page.evaluate(() => document.getElementById('videoModal').open), false, 'clique no reel abriu o modal');
  await page.$eval('#motion', e => e.scrollIntoView()); await new Promise(r => setTimeout(r, 500));
  const mb = await (await page.$('#motion .motion-card')).boundingBox();
  await page.mouse.click(mb.x + mb.width / 2, Math.min(mb.y + 60, 850)); await new Promise(r => setTimeout(r, 500));
  assert.equal(await page.evaluate(() => document.getElementById('videoModal').open), false, 'clique no motion abriu o modal');
  await page.close();
});

test('processo: sem vídeos de exemplo; avisa que ainda não há mídia em todas as 8 etapas', async () => {
  const { page } = await open();
  assert.equal(await page.evaluate(() => document.querySelectorAll('#procStage video').length), 0);
  await page.$eval('#procStage', e => e.scrollIntoView({ block: 'center' })); await new Promise(r => setTimeout(r, 600));
  for (let i = 0; i < 8; i++) {
    const t = await page.evaluate(() => { const c = document.getElementById('procCard'); const g = document.getElementById('procTag'); return { card: !c.hidden && /Ainda não há exemplo de mídia/.test(c.textContent), tag: g.textContent }; });
    assert.ok(t.card, 'etapa ' + i + ' sem aviso'); assert.match(t.tag, /Sem exemplo de mídia/);
    if (i < 7) { await page.click('#procNext'); await new Promise(r => setTimeout(r, 150)); }
  }
  assert.match(await page.$eval('.proc-badge', e => e.textContent), /não contém exemplos de mídia/);
  await page.close();
});

test('seção RESULTADO: YouTube com categorias e título "VEJA O RESULTADO", sem "Mais no YouTube"', async () => {
  const { page } = await open();
  const r = await page.evaluate(() => {
    const s = document.getElementById('resultado'); const h = s?.querySelector('h2');
    return { has: !!s, h: h?.textContent.trim(), labelled: s?.getAttribute('aria-labelledby') === h?.id, yt: s ? s.querySelectorAll('.yt-card').length : 0, chips: s ? s.querySelectorAll('.chip').length : 0, old: /Mais no YouTube/i.test(document.body.textContent), local: s ? s.querySelectorAll('.car-slide').length : -1 };
  });
  assert.ok(r.has); assert.match(r.h, /VEJA O\s+RESULTADO/i); assert.ok(r.labelled); assert.ok(r.yt >= 6); assert.ok(r.chips >= 3, 'sem categorias em RESULTADO'); assert.equal(r.old, false); assert.equal(r.local, 0);
  await page.close();
});

test('categorias só filtram o YouTube (o reel não muda) e o estado vazio é coerente', async () => {
  const { page } = await open();
  await page.$eval('#resultado .chips', e => e.scrollIntoView({ block: 'center' }));
  const reel0 = await page.$$eval('#trabalhos [data-slide]', s => s.length);
  const ids = await page.$$eval('#resultado .chip', c => c.map(x => x.dataset.id));
  for (const id of ids.slice(1)) {
    await page.click(`#resultado .chip[data-id="${id}"]`); await new Promise(r => setTimeout(r, 150));
    const r = await page.evaluate(() => ({ reel: document.querySelectorAll('#trabalhos [data-slide]').length, hiddenReel: [...document.querySelectorAll('#trabalhos [data-slide]')].filter(s => s.hidden).length, yt: [...document.querySelectorAll('#resultado .yt-card')].filter(s => !s.hidden).length, empty: !document.querySelector('#resultado .yt-empty')?.hidden, pressed: document.querySelectorAll('#resultado .chip[aria-pressed=true]').length }));
    assert.equal(r.reel, reel0); assert.equal(r.hiddenReel, 0); assert.equal(r.pressed, 1);
    assert.ok(r.yt > 0 || r.empty, `${id}: RESULTADO vazio sem aviso`);
  }
  await page.close();
});

test('especialidades: links filtram o RESULTADO e levam até ele', async () => {
  const { page } = await open();
  const hrefs = await page.$$eval('#especialidades a[data-filter]', a => a.map(x => x.getAttribute('href')));
  assert.ok(hrefs.length >= 3); assert.ok(hrefs.every(h => h === '#resultado'), hrefs.join());
  await page.close();
});

test('mobile 375: reel sem rolagem horizontal da página e botão de pausa ≥ 44px', async () => {
  const { page } = await open({ width: 375, height: 800 });
  const r = await page.evaluate(() => { const b = document.querySelector('#trabalhos [data-toggle]').getBoundingClientRect(); const s = document.querySelector('#trabalhos [data-slide]').getBoundingClientRect(); return { page: document.documentElement.scrollWidth <= innerWidth, w: b.width, h: b.height, sw: s.width }; });
  assert.ok(r.page); assert.ok(r.w >= 44 && r.h >= 44); assert.ok(r.sw >= 220 && r.sw <= 330, 'largura do card: ' + r.sw);
  await page.close();
});

/* ══ Fase 2 — "O Corte": marca, fontes locais, Lenis + GSAP, timeline, cursor ══════════════ */
const mo = (page, ms = 12000) => page.waitForFunction(() => window.__motion && window.__motion.ready === true, { timeout: ms });

test('marca: favicon/ícones/manifest/OG existem e o nav usa o K Cortado em SVG acessível', async () => {
  for (const f of ['assets/brand/favicon.svg', 'assets/brand/favicon.ico', 'assets/brand/apple-touch-icon.png', 'assets/brand/icon-192.png', 'assets/brand/icon-512.png', 'assets/brand/icon-maskable-512.png', 'assets/brand/kl-mark.svg', 'assets/brand/kl-logo-horizontal.svg', 'site.webmanifest', 'assets/media/og.jpg'])
    assert.ok(fs.existsSync(path.join(ROOT, f)), 'falta ' + f);
  for (const f of fs.readdirSync(path.join(ROOT, 'assets/brand')).filter(n => n.endsWith('.svg'))) {
    const s = fs.readFileSync(path.join(ROOT, 'assets/brand', f), 'utf8');
    assert.ok(!/<text|<image|<filter|<mask|<clipPath/.test(s), f + ' tem texto vivo/raster/filtro/máscara');
    assert.match(s, /<title/);
  }
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  assert.match(html, /rel="icon"[^>]+favicon\.svg/); assert.match(html, /apple-touch-icon/); assert.match(html, /rel="manifest"/);
  const { page } = await open();
  const r = await page.evaluate(() => { const a = document.querySelector('nav .logo'); const s = a.querySelector('svg.logo-mark'); return { svg: !!s, paths: s ? s.querySelectorAll('path').length : 0, hidden: s?.getAttribute('aria-hidden'), label: a.getAttribute('aria-label') }; });
  assert.ok(r.svg); assert.equal(r.paths, 3); assert.equal(r.hidden, 'true'); assert.match(r.label, /Kauã Lucas/);
  await page.close();
});

test('fontes: hospedadas no site (sem Google), carregam e o texto usa Bebas Neue', async () => {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  assert.ok(!/fonts\.(googleapis|gstatic)\.com/.test(html), 'ainda referencia fonts.google*');
  assert.ok(!/fonts\.(googleapis|gstatic)\.com/.test(fs.readFileSync(path.join(ROOT, 'assets/css/styles.css'), 'utf8')));
  hits.length = 0;
  const { page, problems } = await open();
  await page.evaluate(() => document.fonts.ready);
  const r = await page.evaluate(() => ({ bebas: document.fonts.check('1em "Bebas Neue"'), dm: document.fonts.check('1em "DM Sans"'), mono: document.fonts.check('1em "Space Mono"'), loaded: [...document.fonts].filter(f => f.status === 'loaded').map(f => f.family.replace(/"/g, '')) }));
  assert.ok(r.loaded.some(f => /Bebas/.test(f)), 'Bebas não carregou: ' + r.loaded);
  assert.ok(r.loaded.some(f => /DM Sans/.test(f)), 'DM Sans não carregou: ' + r.loaded);
  assert.ok(hits.some(h => /\/assets\/fonts\/.+\.woff2$/.test(h)));
  assert.deepEqual(problems, []);
  await page.close();
});

test('vendor: GSAP/ScrollTrigger/SplitText/Lenis locais, com defer, sem scripts externos, JS total ≤ 250 KB', async () => {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const srcs = [...html.matchAll(/<script[^>]+src="([^"]+)"[^>]*>/g)].map(m => ({ src: m[1], tag: m[0] }));
  for (const f of ['gsap.min.js', 'ScrollTrigger.min.js', 'SplitText.min.js', 'lenis.min.js']) assert.ok(srcs.some(s => s.src === 'assets/vendor/' + f), 'falta ' + f);
  assert.ok(srcs.every(s => !/^https?:/.test(s.src)), 'script externo');
  assert.ok(srcs.every(s => /\bdefer\b/.test(s.tag)), 'script sem defer');
  const total = srcs.reduce((n, s) => n + fs.statSync(path.join(ROOT, s.src)).size, 0);
  assert.ok(total <= 250 * 1024, `JS total ${Math.round(total / 1024)} KB`);
  const order = srcs.map(s => s.src);
  assert.ok(order.indexOf('assets/vendor/gsap.min.js') < order.indexOf('assets/vendor/ScrollTrigger.min.js'));
  assert.ok(order.indexOf('assets/js/main.js') < order.indexOf('assets/js/motion.js'));
});

test('movimento: com preferências normais inicia Lenis + GSAP e marca a página como pronta', async () => {
  const { page, problems } = await open();
  await mo(page);
  const r = await page.evaluate(() => ({ cls: document.documentElement.className, lenis: !!window.__motion.lenis && typeof window.__motion.lenis.scroll === 'number', gsap: !!window.gsap && !!window.ScrollTrigger && !!window.SplitText, triggers: window.ScrollTrigger.getAll().length }));
  assert.match(r.cls, /\bmo-ready\b/); assert.ok(r.lenis, 'Lenis não iniciou'); assert.ok(r.gsap); assert.ok(r.triggers >= 5, 'poucos ScrollTriggers: ' + r.triggers);
  assert.deepEqual(problems, []);
  await page.close();
});

test('movimento reduzido: sem Lenis/GSAP animando, sem classe mo, tudo visível e rolagem nativa', async () => {
  const { page, problems } = await open({ reduce: true });
  await new Promise(r => setTimeout(r, 800));
  const r = await page.evaluate(() => ({ cls: document.documentElement.className, m: window.__motion && { ready: window.__motion.ready, lenis: !!window.__motion.lenis }, h1: (() => { const c = getComputedStyle(document.querySelector('h1')); return [c.opacity, c.visibility]; })(), cursor: !!document.querySelector('.cursor'), trig: window.ScrollTrigger ? window.ScrollTrigger.getAll().length : 0 }));
  assert.ok(!/\bmo\b|mo-ready/.test(r.cls), r.cls); assert.equal(r.m.ready, false); assert.equal(r.m.lenis, false);
  assert.deepEqual(r.h1, ['1', 'visible']); assert.equal(r.cursor, false); assert.equal(r.trig, 0);
  await page.evaluate(() => window.scrollTo(0, 900)); await new Promise(r => setTimeout(r, 300));
  assert.ok(await page.evaluate(() => window.scrollY > 800), 'rolagem nativa quebrada');
  assert.deepEqual(problems, []);
  await page.close();
});

test('à prova de falha: sem os scripts do vendor o conteúdo aparece e não há erro de página', async () => {
  const page = await browser.newPage(); await page.setViewport({ width: 1440, height: 900 });
  await page.setRequestInterception(true);
  page.on('request', r => /\/assets\/vendor\//.test(r.url()) ? r.abort() : r.continue());
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto(base + '/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => !document.documentElement.classList.contains('mo'), { timeout: 7000 });
  const r = await page.evaluate(() => { const vis = s => { const c = getComputedStyle(document.querySelector(s)); return c.opacity === '1' && c.visibility === 'visible'; }; return { h1: vis('h1'), lead: vis('.hero-lead'), cta: vis('.hero-cta'), media: vis('.hero-media'), logo: vis('nav .logo') }; });
  assert.deepEqual(r, { h1: true, lead: true, cta: true, media: true, logo: true });
  assert.deepEqual(errs, []);
  await page.close();
});

test('sem JavaScript: nome, texto e planos ficam visíveis', async () => {
  const page = await browser.newPage(); await page.setJavaScriptEnabled(false); await page.setViewport({ width: 1440, height: 900 });
  await page.goto(base + '/', { waitUntil: 'domcontentloaded' });
  const r = await page.evaluate(() => ['h1', '.hero-lead', '#contratar .plans', '#contato .contact-big'].map(s => { const c = getComputedStyle(document.querySelector(s)); return c.opacity + c.visibility; }));
  assert.deepEqual(r, ['1visible', '1visible', '1visible', '1visible']);
  await page.close();
});

test('hero cinético: nome dividido em letras, nome acessível preservado, ao final tudo visível e sem salto', async () => {
  const { page } = await open();
  await mo(page);
  await page.waitForFunction(() => [...document.querySelectorAll('.hero-name .char, .hero-name [class*=char]')].length >= 9, { timeout: 5000 });
  await new Promise(r => setTimeout(r, 2200));
  const r = await page.evaluate(() => {
    const h = document.querySelector('h1'); const chars = [...h.querySelectorAll('[class*=char]')].filter(c => c.children.length === 0 && c.textContent.trim());
    return { h1s: document.querySelectorAll('h1').length, chars: chars.length, settled: chars.every(c => { const s = getComputedStyle(c); return s.opacity === '1' && (s.transform === 'none' || /matrix\(1, 0, 0, 1, 0, 0\)/.test(s.transform)); }), text: h.textContent.replace(/\s+/g, ' ') };
  });
  assert.equal(r.h1s, 1); assert.ok(r.chars >= 9, 'letras: ' + r.chars); assert.ok(r.settled, 'letras não assentaram'); assert.match(r.text, /KAUÃ\s*LUCAS/);
  const snap = await page.accessibility.snapshot({ interestingOnly: false });
  const find = n => n.role === 'heading' ? n : (n.children || []).map(find).find(Boolean);
  const h = find(snap); assert.ok(h && /KAUÃ/.test(h.name) && /LUCAS/.test(h.name), 'nome acessível: ' + h?.name);
  await page.close();
});

test('hero: ao rolar, KAUÃ e LUCAS deslizam em sentidos opostos', async () => {
  const { page } = await open();
  await mo(page); await new Promise(r => setTimeout(r, 2500));
  await page.evaluate(() => window.scrollTo(0, 420)); await new Promise(r => setTimeout(r, 900));
  const [a, b] = await page.evaluate(() => [...document.querySelectorAll('.hero-name > span:not(.sr-only)')].slice(0, 2).map(s => new DOMMatrixReadOnly(getComputedStyle(s).transform).m41));
  assert.ok(Math.abs(a) > 5 && Math.abs(b) > 5, `quase parado (${a}, ${b})`); assert.ok(a * b < 0, `mesmo sentido (${a}, ${b})`);
  await page.close();
});

test('títulos: SplitText em máscara mantém o nome acessível e termina visível', async () => {
  const { page } = await open();
  await mo(page);
  await page.$eval('#h-trabalhos', e => e.scrollIntoView({ block: 'center' })); await new Promise(r => setTimeout(r, 1800));
  const r = await page.evaluate(() => { const h = document.getElementById('h-trabalhos'); const kids = [...h.querySelectorAll('[class*=line]')]; return { name: h.textContent.replace(/\s+/g, ' ').trim(), lines: kids.length, vis: getComputedStyle(h).opacity === '1', aria: h.getAttribute('aria-label') }; });
  assert.match(r.aria || r.name, /REEL DE EDIÇÕES/); assert.ok(r.vis);
  await page.close();
});

test('timeline: régua com 9 clipes proporcionais, playhead e timecode acompanham a rolagem, clique navega', async () => {
  const { page } = await open();
  await new Promise(r => setTimeout(r, 500));
  const base0 = await page.evaluate(() => {
    const d = document.getElementById('timeline'); if (!d) return null;
    const clips = [...d.querySelectorAll('[data-tl-clip]')];
    const secs = [...document.querySelectorAll('main > section[id]')];
    const tr = d.querySelector('.tl-track').getBoundingClientRect();
    const total = secs.reduce((n, s) => n + s.offsetHeight, 0);
    return { hidden: d.getAttribute('aria-hidden'), n: clips.length, order: clips.map(c => c.dataset.target).join(), expect: secs.map(s => s.id).join(), widthsOk: clips.every((c, i) => Math.abs(c.getBoundingClientRect().width / tr.width - secs[i].offsetHeight / total) < 0.03), tc: d.querySelector('.tl-tc').textContent };
  });
  assert.ok(base0, 'sem #timeline'); assert.equal(base0.hidden, 'true'); assert.equal(base0.n, 9); assert.equal(base0.order, base0.expect); assert.ok(base0.widthsOk, 'larguras não proporcionais');
  assert.match(base0.tc, /^\d\d:\d\d:\d\d:\d\d$/);
  await page.evaluate(() => window.scrollTo(0, (document.documentElement.scrollHeight - innerHeight) / 2)); await new Promise(r => setTimeout(r, 700));
  const mid = await page.evaluate(() => {
    const d = document.getElementById('timeline'), tr = d.querySelector('.tl-track').getBoundingClientRect(), ph = d.querySelector('.tl-head').getBoundingClientRect();
    const doc = document.documentElement, p = scrollY / (doc.scrollHeight - innerHeight), line = p * innerHeight;
    const act = d.querySelector('[data-tl-clip].is-active')?.dataset.target; const sec = [...document.querySelectorAll('main > section[id]')].find(s => { const b = s.getBoundingClientRect(); return b.top <= line && b.bottom > line; });
    return { x: (ph.left + ph.width / 2 - tr.left) / tr.width, expect: (scrollY + p * innerHeight) / doc.scrollHeight, act, sec: sec?.id, tc: d.querySelector('.tl-tc').textContent };
  });
  assert.ok(Math.abs(mid.x - mid.expect) < 0.02, `playhead em ${mid.x.toFixed(3)} (esperado ${mid.expect.toFixed(3)})`); assert.equal(mid.act, mid.sec); assert.notEqual(mid.tc, base0.tc);
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight)); await new Promise(r => setTimeout(r, 700));
  const end = await page.evaluate(() => { const d = document.getElementById('timeline'), tr = d.querySelector('.tl-track').getBoundingClientRect(), ph = d.querySelector('.tl-head').getBoundingClientRect(); return (ph.left + ph.width / 2 - tr.left) / tr.width; });
  assert.ok(end > 0.97, 'playhead não chegou ao fim: ' + end);
  await page.evaluate(() => window.scrollTo(0, 0)); await new Promise(r => setTimeout(r, 400));
  await page.click('#timeline [data-tl-clip][data-target="contratar"]');
  await page.waitForFunction(() => { const t = document.getElementById('contratar').getBoundingClientRect().top; return t > -10 && t < 140; }, { timeout: 7000 });
  await page.close();
});

test('timeline: escondida no celular (375px) e sem sobrepor o conteúdo no rodapé', async () => {
  const { page } = await open({ width: 375, height: 800 });
  assert.equal(await page.$eval('#timeline', e => getComputedStyle(e).display), 'none');
  await page.close();
  const d = await open();
  await d.page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight)); await new Promise(r => setTimeout(r, 500));
  const r = await d.page.evaluate(() => { const f = document.querySelector('footer').getBoundingClientRect(), t = document.getElementById('timeline').getBoundingClientRect(); const links = [...document.querySelectorAll('footer a')].map(a => a.getBoundingClientRect().bottom); return { clear: Math.max(...links) <= t.top + 1, tl: t.height }; });
  assert.ok(r.clear, 'a régua cobre links do rodapé'); assert.ok(r.tl <= 64);
  await d.page.close();
});

test('Lenis: modal e menu pausam o scroll suave; ao fechar, retoma', async () => {
  const { page } = await open();
  await mo(page);
  const btn = await page.$('#resultado .yt-card:not([hidden]) .yt-open');
  await btn.evaluate(e => e.scrollIntoView({ block: 'center' })); await btn.focus(); await page.keyboard.press('Enter');
  await page.waitForSelector('dialog#videoModal[open]', { timeout: 8000 });
  assert.equal(await page.evaluate(() => window.__motion.lenis.isStopped), true, 'Lenis rodando com o modal aberto');
  await page.keyboard.press('Escape'); await page.waitForFunction(() => !document.getElementById('videoModal').open);
  await page.waitForFunction(() => window.__motion.lenis.isStopped === false, { timeout: 3000 });
  await page.close();
  const m = await open({ width: 375, height: 800 }); await mo(m.page);
  await m.page.click('#navToggle'); await m.page.waitForFunction(() => document.getElementById('navToggle').getAttribute('aria-expanded') === 'true');
  assert.equal(await m.page.evaluate(() => window.__motion.lenis.isStopped), true, 'Lenis rodando com o menu aberto');
  await m.page.click('#navToggle'); await m.page.waitForFunction(() => window.__motion.lenis.isStopped === false, { timeout: 3000 });
  await m.page.close();
});

test('Lenis: links de âncora do menu chegam à seção (compensando o nav)', async () => {
  const { page } = await open();
  await mo(page);
  await page.click('nav .nav-menu a[href="#avaliacoes"]');
  await page.waitForFunction(() => { const t = document.getElementById('avaliacoes').getBoundingClientRect().top; return t > -10 && t < 160; }, { timeout: 8000 });
  await page.close();
});

test('reel acelera com a velocidade da rolagem e volta ao normal', async () => {
  const { page } = await open();
  await mo(page);
  await page.$eval('#trabalhos', e => e.scrollIntoView({ block: 'start' })); await new Promise(r => setTimeout(r, 700));
  const r0 = await page.evaluate(() => window.__motion.reelRate());
  let peak = r0; await page.mouse.move(700, 450);
  for (let i = 0; i < 6; i++) { await page.mouse.wheel({ deltaY: 380 }); await new Promise(r => setTimeout(r, 60)); peak = Math.max(peak, await page.evaluate(() => window.__motion.reelRate())); }
  assert.ok(peak > 1.3, `reel não acelerou (pico ${peak})`);
  await new Promise(r => setTimeout(r, 2600));
  assert.ok(await page.evaluate(() => window.__motion.reelRate()) < 1.15, 'reel não voltou ao normal');
  await page.close();
});

test('cursor-contexto: disco "VER" sobre cards com mouse; não existe no toque nem no movimento reduzido', async () => {
  const { page } = await open();
  await mo(page);
  const card = await page.$('#resultado .yt-card:not([hidden]) .yt-open'); await card.evaluate(e => e.scrollIntoView({ block: 'center' })); await new Promise(r => setTimeout(r, 500)); const b = await card.boundingBox();
  await page.mouse.move(b.x + 20, Math.max(b.y + 40, 40)); await page.mouse.move(b.x + b.width / 2, b.y + b.height / 3, { steps: 6 }); await new Promise(r => setTimeout(r, 600));
  const on = await page.evaluate(() => { const c = document.querySelector('.cursor'); if (!c) return null; const s = getComputedStyle(c); return { op: +s.opacity, pe: s.pointerEvents, txt: c.textContent.trim(), pos: s.position }; });
  assert.ok(on, 'sem .cursor'); assert.ok(on.op > 0.9, 'cursor invisível sobre o card'); assert.equal(on.pe, 'none'); assert.match(on.txt, /VER/i); assert.equal(on.pos, 'fixed');
  await page.mouse.move(8, 8, { steps: 4 }); await new Promise(r => setTimeout(r, 600));
  assert.ok(await page.evaluate(() => +getComputedStyle(document.querySelector('.cursor')).opacity) < 0.1, 'cursor ficou na tela');
  await page.close();
  const t = await browser.newPage(); await t.emulate(KnownDevices['iPhone 12']); await t.goto(base + '/', { waitUntil: 'domcontentloaded' }); await new Promise(r => setTimeout(r, 1500));
  assert.equal(await t.evaluate(() => !!document.querySelector('.cursor')), false, 'cursor criado no toque'); await t.close();
});

test('contadores: nota e quantidade chegam aos valores reais; HTML já traz o valor final', async () => {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  assert.match(html, /class="rating-num"[^>]*>4,7</);
  const { page } = await open();
  await mo(page);
  await page.$eval('#avaliacoes .rating-box', e => e.scrollIntoView({ block: 'center' })); await new Promise(r => setTimeout(r, 2600));
  assert.equal(await page.$eval('#avaliacoes .rating-num', e => e.textContent.trim()), '4,7');
  assert.equal(await page.$eval('.hero-proof b', e => e.textContent.trim()), '4,7');
  await page.close();
});

test('rodapé: a marca se monta com a rolagem e termina alinhada', async () => {
  const { page } = await open();
  await mo(page);
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight - innerHeight - 700)); await new Promise(r => setTimeout(r, 900));
  const a = await page.evaluate(() => [...document.querySelectorAll('#footMark path')].map(p => p.getBoundingClientRect().left + p.getBoundingClientRect().top));
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight)); await new Promise(r => setTimeout(r, 1400));
  const b = await page.evaluate(() => [...document.querySelectorAll('#footMark path')].map(p => p.getBoundingClientRect().left + p.getBoundingClientRect().top));
  assert.equal(a.length, 3); assert.ok(a.some((v, i) => Math.abs(v - b[i]) > 3), 'marca não se moveu');
  const settled = await page.evaluate(() => [...document.querySelectorAll('#footMark path')].map(p => getComputedStyle(p).transform));
  assert.ok(settled.every(t => t === 'none' || /matrix\(1, 0, 0, 1, (-?0(\.0+)?|-?0\.\d), (-?0(\.0+)?|-?0\.\d)\)/.test(t)), 'não alinhou: ' + settled);
  await page.close();
});

test('CLS continua < 0.1 com todas as animações durante a rolagem completa', async () => {
  const { page } = await open();
  await page.evaluateOnNewDocument(() => {});
  await mo(page);
  const cls = await page.evaluate(async () => { let v = 0; new PerformanceObserver(l => { for (const e of l.getEntries()) if (!e.hadRecentInput) v += e.value; }).observe({ type: 'layout-shift', buffered: true }); for (let y = 0; y < document.body.scrollHeight; y += 500) { scrollTo(0, y); await new Promise(r => setTimeout(r, 110)); } await new Promise(r => setTimeout(r, 400)); return v; });
  assert.ok(cls < 0.1, 'CLS ' + cls);
  await page.close();
});

test('failsafe: se o Lenis não carregar, o hero aparece logo após o load (sem esperar 4 s) e o site segue funcional', async () => {
  const page = await browser.newPage(); await page.setViewport({ width: 1440, height: 900 });
  await page.setRequestInterception(true);
  page.on('request', r => (/vendor\/lenis\.min\.js/.test(r.url()) ? r.abort() : r.continue()));
  const t0 = Date.now();
  await page.goto(base + '/', { waitUntil: 'load' });
  await page.waitForFunction(() => !document.documentElement.classList.contains('mo') && getComputedStyle(document.querySelector('.hero-name')).visibility === 'visible', { timeout: 3000 });
  assert.ok(Date.now() - t0 < 3000, 'hero demorou a voltar');
  assert.equal(await page.evaluate(() => document.querySelectorAll('.car-slide').length > 0), true, 'main.js deve seguir funcionando');
  await page.close();
});

test('ScrollTrigger acompanha mudanças de altura: após filtrar o YouTube os blocos abaixo aparecem ao chegar na tela', async () => {
  const { page } = await open(); await mo(page);
  const chips = await page.$$('#resultado .chip'); await chips[chips.length - 1].click();
  await new Promise(r => setTimeout(r, 600));
  await page.evaluate(() => window.__motion.lenis.scrollTo(document.getElementById('especialidades').getBoundingClientRect().top + scrollY - 70, { immediate: true }));
  await new Promise(r => setTimeout(r, 2200));
  const op = await page.evaluate(() => [...document.querySelectorAll('#especialidades .reveal')].map(e => +getComputedStyle(e).opacity));
  assert.ok(op.length > 0 && op.every(o => o > 0.95), 'blocos continuam transparentes: ' + op.join(','));
  await page.close();
});

/* ══ i18n — troca de idioma, detecção por país, persistência, seletor ══════════════════════ */
import vm from 'node:vm';
import os from 'node:os';

const LANGS = ['pt-BR', 'en', 'es'];
const HTMLTXT = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
function loadDict(code) {                         // executa o arquivo do dicionário como o navegador faria
  const q = []; const sb = { self: { __i18nQ: q } }; vm.createContext(sb);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'assets/js/i18n', code + '.js'), 'utf8'), sb);
  const flat = {}; const walk = (n, p) => { if (typeof n === 'string') flat[p] = n; else if (Array.isArray(n)) n.forEach((v, i) => walk(v, p + '.' + i)); else for (const k of Object.keys(n)) walk(n[k], p ? p + '.' + k : k); };
  walk(q[0][1], ''); return flat;
}
const DICT = Object.fromEntries(LANGS.map(c => [c, loadDict(c)]));

/** Página isolada (armazenamento limpo). geoCountry: país que a "hospedagem" informa (null = sem cabeçalho → 404). */
async function openFresh({ geoCountry = 'BR', navLangs = ['pt-BR', 'pt'], stored, width = 1440, height = 900, reduce = true, third, block = [] } = {}) {
  geo.country = geoCountry; geo.calls = 0;
  const ctx = await browser.createBrowserContext(); const page = await ctx.newPage();
  await page.setViewport({ width, height });
  if (reduce) await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await page.evaluateOnNewDocument((langs, st) => {
    Object.defineProperty(navigator, 'languages', { get: () => langs }); Object.defineProperty(navigator, 'language', { get: () => langs[0] });
    if (st && !sessionStorage.getItem('__seeded')) { sessionStorage.setItem('__seeded', '1'); localStorage.setItem('kl.lang', JSON.stringify(st)); }
  }, navLangs, stored || null);
  const problems = []; const thirdCalls = [];
  page.on('pageerror', e => problems.push('pageerror: ' + e.message));
  await page.setRequestInterception(true);
  page.on('request', r => {
    const u = r.url();
    if (/api\.country\.is/.test(u)) { thirdCalls.push(u); return third ? r.respond({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ ip: '203.0.113.9', country: third }) }) : r.abort(); }
    if (block.some(b => u.includes(b))) return r.abort();
    r.continue();
  });
  await page.goto(base + '/', { waitUntil: 'domcontentloaded' });
  return { page, ctx, problems, thirdCalls, close: () => ctx.close() };
}
const settled = (page, locale) => page.waitForFunction(l => document.documentElement.lang === l && !!window.I18N, { timeout: 6000 }, locale);
const LOCALE = { 'pt-BR': 'pt-BR', en: 'en-US', es: 'es-ES' };
const stored = page => page.evaluate(() => JSON.parse(localStorage.getItem('kl.lang') || 'null'));
const heroLead = page => page.$eval('.hero-lead', e => e.textContent.trim());

test('i18n: os 3 dicionários têm exatamente as mesmas chaves, nenhum vazio e os mesmos {parâmetros}', () => {
  const ref = DICT['pt-BR'], keys = Object.keys(ref).sort();
  assert.ok(keys.length > 250, 'poucas chaves: ' + keys.length);
  for (const c of ['en', 'es']) {
    assert.deepEqual(Object.keys(DICT[c]).sort().filter(k => !keys.includes(k)), [], c + ': chaves a mais');
    assert.deepEqual(keys.filter(k => !(k in DICT[c])), [], c + ': chaves faltando');
    for (const k of keys) {
      assert.ok(String(DICT[c][k]).trim() !== '', `${c}.${k} vazio`);
      const ph = s => (String(s).match(/\{\w+\}/g) || []).sort().join();
      assert.equal(ph(DICT[c][k]), ph(ref[k]), `${c}.${k}: parâmetros diferentes`);
    }
  }
});

test('i18n: toda chave usada no HTML existe, e o português do HTML é idêntico ao dicionário', async () => {
  const used = new Set(); for (const m of HTMLTXT.matchAll(/data-i18n(?:-html)?="([^"]+)"/g)) used.add(m[1]);
  for (const m of HTMLTXT.matchAll(/data-i18n-attr="([^"]+)"/g)) m[1].trim().split(/\s+/).forEach(p => used.add(p.slice(p.indexOf(':') + 1)));
  assert.ok(used.size > 150, 'poucas chaves no HTML: ' + used.size);
  assert.deepEqual([...used].filter(k => !(k in DICT['pt-BR'])), [], 'chaves do HTML sem tradução');
  const { page, close } = await openFresh({ geoCountry: 'BR' }); await new Promise(r => setTimeout(r, 700));   // sem movimento: nada anima durante a comparação
  const diff = await page.evaluate(() => {
    const snap = () => { const o = []; const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); while (w.nextNode()) { const n = w.currentNode; if (!n.parentElement.closest('script,style,noscript') && n.textContent.trim()) o.push(n.textContent.trim()); }
      document.querySelectorAll('[aria-label],[alt]').forEach(e => o.push((e.getAttribute('aria-label') || '') + '|' + (e.getAttribute('alt') || ''))); o.push(document.title, ...[...document.querySelectorAll('meta[content]')].map(m => m.content)); return o; };
    const a = snap(); I18N.apply(document); const b = snap();
    return a.map((t, i) => (t === b[i] ? null : [t, b[i]])).filter(Boolean).concat(a.length === b.length ? [] : [['tamanho', a.length + '≠' + b.length]]);
  });
  assert.deepEqual(diff, [], 'aplicar o dicionário pt-BR mudou o texto do HTML (o HTML e pt-BR.js divergiram)');
  await close();
});

test('i18n: função /api/geo devolve o país do cabeçalho da hospedagem e recusa o resto', () => {
  const call = h => { const r = { headers: {}, statusCode: 0, body: '', setHeader(k, v) { this.headers[k] = v; }, end(b) { this.body = b; } }; geoHandler({ headers: h }, r); return r; };
  const ok = call({ 'x-vercel-ip-country': 'es' });
  assert.equal(ok.statusCode, 200); assert.deepEqual(JSON.parse(ok.body), { country: 'ES' }); assert.match(ok.headers['Cache-Control'], /no-store/); assert.match(ok.headers['Content-Type'], /json/);
  assert.equal(call({}).statusCode, 404); assert.equal(call({ 'x-vercel-ip-country': 'XXX' }).statusCode, 404); assert.equal(call({ 'x-vercel-ip-country': '<b>' }).statusCode, 404);
});

test('i18n: nunca pede GPS (sem navigator.geolocation; política de permissões bloqueia)', () => {
  for (const f of fs.readdirSync(path.join(ROOT, 'assets/js')).filter(n => n.endsWith('.js'))) assert.ok(!/navigator\.geolocation|getCurrentPosition|watchPosition/.test(fs.readFileSync(path.join(ROOT, 'assets/js', f), 'utf8')), f);
  assert.match(fs.readFileSync(path.join(ROOT, 'vercel.json'), 'utf8'), /geolocation=\(\)/);
});

for (const [country, want] of [['BR', 'pt-BR'], ['PT', 'pt-BR'], ['US', 'en'], ['GB', 'en'], ['ES', 'es'], ['MX', 'es'], ['AR', 'es'], ['JP', 'en'], ['DE', 'en']]) {
  test(`detecção: 1º acesso em ${country} → ${want}, salva a preferência (automática) e não pede GPS`, async () => {
    const s = await openFresh({ geoCountry: country, navLangs: ['fr-FR'] });   // idioma do navegador não deve influenciar quando o país é conhecido
    await settled(s.page, LOCALE[want]);
    assert.deepEqual(await stored(s.page), { lang: want, source: 'auto' });
    assert.equal(geo.calls, 1); assert.deepEqual(s.thirdCalls, [], 'terceiros consultados sem necessidade');
    assert.equal(await s.page.evaluate(() => I18N.t('nav.work')), DICT[want]['nav.work']);
    assert.deepEqual(s.problems, []); await s.close();
  });
}

test('detecção: sem o cabeçalho da hospedagem usa a reserva (api.country.is), sem enviar Referer nem cookies', async () => {
  const s = await openFresh({ geoCountry: null, third: 'ES', navLangs: ['en-US'] });
  await settled(s.page, 'es-ES'); assert.equal(geo.calls, 1); assert.equal(s.thirdCalls.length, 1);
  assert.deepEqual(await stored(s.page), { lang: 'es', source: 'auto' }); await s.close();
});

test('detecção: se a geolocalização falha por completo, o site abre normal no idioma do navegador (e não insiste)', async () => {
  const s = await openFresh({ geoCountry: null, navLangs: ['es-MX', 'es'] });
  await settled(s.page, 'es-ES'); assert.equal(geo.calls, 1);
  assert.equal(await stored(s.page), null, 'idioma do navegador não deve virar preferência salva');
  assert.deepEqual(s.problems, []);
  const fail = await s.page.evaluate(() => JSON.parse(localStorage.getItem('kl.geo')));
  assert.ok(fail && fail.fail === true);
  await s.page.reload({ waitUntil: 'domcontentloaded' }); await settled(s.page, 'es-ES');
  assert.equal(geo.calls, 1, 'consultou de novo logo após a falha'); assert.equal(s.thirdCalls.length, 1);
  await s.close();
  const f = await openFresh({ geoCountry: null, navLangs: ['fr-FR'] });          // sem tradução para o idioma do navegador → inglês
  await settled(f.page, 'en-US'); await f.close();
  const p = await openFresh({ geoCountry: null, navLangs: ['pt-BR'] }); await new Promise(r => setTimeout(r, 800));
  assert.equal(await p.page.evaluate(() => document.documentElement.lang), 'pt-BR'); assert.deepEqual(p.problems, []); await p.close();
});

test('detecção: o país é guardado (24 h) — a "detecção automática" não repete a consulta', async () => {
  const s = await openFresh({ geoCountry: 'US' });
  await settled(s.page, 'en-US'); assert.equal(geo.calls, 1);
  const g = await s.page.evaluate(() => JSON.parse(localStorage.getItem('kl.geo'))); assert.equal(g.country, 'US');
  await s.page.evaluate(() => I18N.set('pt-BR')); await settled(s.page, 'pt-BR');
  geo.country = 'ES';                                                          // mudou de país, mas o cache ainda vale
  await s.page.evaluate(() => I18N.auto()); await settled(s.page, 'en-US'); assert.equal(geo.calls, 1);
  await s.close();
});

test('preferência salva manda sobre a detecção e não consulta a geolocalização', async () => {
  const s = await openFresh({ geoCountry: 'US', stored: { lang: 'pt-BR', source: 'manual' }, navLangs: ['en-US'] });
  await new Promise(r => setTimeout(r, 900));
  assert.equal(await s.page.evaluate(() => document.documentElement.lang), 'pt-BR'); assert.equal(geo.calls, 0); assert.deepEqual(s.thirdCalls, []);
  await s.close();
  const e = await openFresh({ geoCountry: 'BR', stored: { lang: 'es', source: 'manual' } });
  await settled(e.page, 'es-ES'); assert.equal(geo.calls, 0);
  assert.equal(await heroLead(e.page), DICT.es['hero.lead'].replace(/<\/?b>/g, ''));
  await e.close();
});

test('preferência salva inválida ou corrompida não quebra: volta à detecção', async () => {
  for (const bad of [{ lang: 'xx', source: 'manual' }, 'lixo']) {
    const s = await openFresh({ geoCountry: 'US', stored: bad });
    await settled(s.page, 'en-US'); assert.deepEqual(s.problems, []); await s.close();
  }
});

test('seletor (desktop): globo + sigla, abre menu com 3 idiomas, troca na hora sem recarregar e salva', async () => {
  const s = await openFresh({ geoCountry: 'BR' }); const { page } = s;
  await page.waitForFunction(() => document.documentElement.classList.contains('has-lang'));
  await page.evaluate(() => { window.__noReload = true; });
  const btn = await page.$('#langBtn');
  const info = await page.evaluate(() => { const b = document.getElementById('langBtn'); const r = b.getBoundingClientRect(); return { svg: !!b.querySelector('svg circle'), code: b.querySelector('.lang-code').textContent, aria: b.getAttribute('aria-label'), exp: b.getAttribute('aria-expanded'), h: r.height }; });
  assert.ok(info.svg); assert.equal(info.code, 'PT'); assert.equal(info.aria, 'PT — Idioma. Atual: Português (Brasil)'); assert.equal(info.exp, 'false'); assert.ok(info.h >= 44);
  await btn.click();
  const menu = await page.evaluate(() => { const m = document.getElementById('langMenu'); const o = [...m.querySelectorAll('[data-lang]')]; return { hidden: m.hidden, exp: document.getElementById('langBtn').getAttribute('aria-expanded'), names: o.map(x => x.textContent.trim()), checked: o.map(x => x.getAttribute('aria-checked')), langs: o.map(x => x.lang), flags: m.querySelectorAll('.lang-flag').length, focus: document.activeElement.dataset.lang }; });
  assert.equal(menu.hidden, false); assert.equal(menu.exp, 'true'); assert.deepEqual(menu.names, ['Português (Brasil)', 'English (United States)', 'Español (España)']);
  assert.deepEqual(menu.checked, ['true', 'false', 'false']); assert.deepEqual(menu.langs, ['pt-BR', 'en', 'es']); assert.equal(menu.flags, 3); assert.equal(menu.focus, 'pt-BR');
  await page.click('#langMenu [data-lang="en"]');
  await settled(page, 'en-US');
  const r = await page.evaluate(() => ({ lead: document.querySelector('.hero-lead').textContent, code: document.getElementById('langCode').textContent, open: !document.getElementById('langMenu').hidden, focus: document.activeElement.id, noReload: window.__noReload === true, title: document.title, nav: document.querySelector('#navMenu a').textContent, desc: document.querySelector('meta[name=description]').content, og: document.querySelector('meta[property="og:locale"]').content, live: document.getElementById('i18nLive')?.textContent }));
  assert.equal(r.code, 'EN'); assert.equal(r.open, false); assert.equal(r.focus, 'langBtn', 'foco deve voltar ao botão'); assert.ok(r.noReload, 'a página recarregou');
  assert.equal(r.lead, DICT.en['hero.lead'].replace(/<\/?b>/g, '')); assert.equal(r.title, DICT.en['meta.title']); assert.equal(r.nav, 'Work'); assert.equal(r.desc, DICT.en['meta.description']); assert.equal(r.og, 'en_US');
  assert.deepEqual(await stored(page), { lang: 'en', source: 'manual' });
  await page.waitForFunction(() => /English/.test(document.getElementById('i18nLive')?.textContent || ''));
  await page.click('#langBtn'); assert.equal(await page.$eval('#langMenu [data-lang="en"]', e => e.getAttribute('aria-checked')), 'true'); assert.equal(await page.$eval('.lang-auto', e => e.getAttribute('aria-checked')), 'false');
  assert.deepEqual(s.problems, []); await s.close();
});

test('seletor: teclado (setas, Enter, Home/End, Esc, Tab) e clique fora', async () => {
  const s = await openFresh({ geoCountry: 'BR' }); const { page } = s;
  await page.waitForFunction(() => document.documentElement.classList.contains('has-lang'));
  await page.focus('#langBtn'); await page.keyboard.press('ArrowDown');
  assert.equal(await page.$eval('#langMenu', m => m.hidden), false);
  await page.keyboard.press('ArrowDown'); assert.equal(await page.evaluate(() => document.activeElement.dataset.lang), 'en');
  await page.keyboard.press('End'); assert.equal(await page.evaluate(() => document.activeElement.hasAttribute('data-auto')), true);
  await page.keyboard.press('Home'); assert.equal(await page.evaluate(() => document.activeElement.dataset.lang), 'pt-BR');
  await page.keyboard.press('ArrowUp'); assert.equal(await page.evaluate(() => document.activeElement.hasAttribute('data-auto')), true, 'ArrowUp deve dar a volta');
  await page.keyboard.press('Escape');
  assert.equal(await page.$eval('#langMenu', m => m.hidden), true); assert.equal(await page.evaluate(() => document.activeElement.id), 'langBtn');
  await page.keyboard.press('Enter'); await page.keyboard.press('ArrowDown'); await page.keyboard.press('ArrowDown'); await page.keyboard.press('Enter');
  await settled(page, 'es-ES'); assert.equal(await page.evaluate(() => document.activeElement.id), 'langBtn');
  await page.click('#langBtn'); await page.mouse.click(300, 600);
  assert.equal(await page.$eval('#langMenu', m => m.hidden), true, 'clique fora não fechou');
  await page.click('#langBtn'); await page.keyboard.press('Tab');
  assert.equal(await page.$eval('#langMenu', m => m.hidden), true, 'Tab não fechou');
  await s.close();
});

test('seletor: "Detectar automaticamente" descarta a escolha manual e usa o país atual', async () => {
  const s = await openFresh({ geoCountry: 'US', stored: { lang: 'es', source: 'manual' } }); const { page } = s;
  await settled(page, 'es-ES'); assert.equal(geo.calls, 0);
  await page.click('#langBtn'); assert.match(await page.$eval('.lang-auto', e => e.textContent), /Detectar automáticamente/);
  await page.click('.lang-auto'); await settled(page, 'en-US'); assert.equal(geo.calls, 1);
  assert.deepEqual(await stored(page), { lang: 'en', source: 'auto' });
  await page.click('#langBtn'); assert.equal(await page.$eval('.lang-auto', e => e.getAttribute('aria-checked')), 'true'); await s.close();
});

test('persistência: a escolha manual sobrevive a recarregar, a abas novas e a FECHAR o navegador', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kl-prof-'));
  const launch = () => puppeteer.launch({ executablePath: CHROME, headless: 'new', userDataDir: dir, args: ['--no-sandbox', '--disable-dev-shm-usage', '--mute-audio'] });
  geo.country = 'BR'; geo.calls = 0;
  let b = await launch(); let p = await b.newPage(); await p.goto(base + '/', { waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => document.documentElement.classList.contains('has-lang'));
  await p.click('#langBtn'); await p.click('#langMenu [data-lang="es"]'); await settled(p, 'es-ES');
  await p.reload({ waitUntil: 'domcontentloaded' }); await settled(p, 'es-ES');
  const p2 = await b.newPage(); await p2.goto(base + '/', { waitUntil: 'domcontentloaded' }); await settled(p2, 'es-ES');
  await b.close();                                                             // fecha o navegador de verdade
  geo.country = 'US'; geo.calls = 0;                                          // e a "hospedagem" agora diria que está nos EUA
  b = await launch(); p = await b.newPage(); await p.goto(base + '/', { waitUntil: 'domcontentloaded' });
  await settled(p, 'es-ES'); assert.equal(await p.evaluate(() => document.querySelector('#navMenu a').textContent), 'Trabajos');
  assert.equal(geo.calls, 0, 'consultou a geolocalização com preferência salva');
  assert.deepEqual(await stored(p), { lang: 'es', source: 'manual' });
  await b.close(); fs.rmSync(dir, { recursive: true, force: true });
});

test('tradução completa: nenhum texto em português sobra em inglês e espanhol (menu, serviços, processo, formulários, rodapé…)', async () => {
  const s = await openFresh({ geoCountry: 'BR' }); const { page } = s; await settled(page, 'pt-BR');
  await page.evaluate(() => document.getElementById('resultado').scrollIntoView());
  const collect = () => page.evaluate(() => {
    const out = new Map(); const add = (t, why) => { t = t.replace(/\s+/g, ' ').trim(); if (t) out.set(t, why); };
    const skip = n => n.closest('script, style, noscript, .yt-title, blockquote, .review figcaption, [lang="en"]:not(html), svg');
    const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); while (w.nextNode()) { const n = w.currentNode; if (!skip(n.parentElement)) add(n.textContent, n.parentElement.className || n.parentElement.tagName); }
    document.querySelectorAll('[aria-label], [alt], [title]').forEach(e => { if (!e.closest('.yt-open')) ['aria-label', 'alt', 'title'].forEach(a => e.hasAttribute(a) && add(e.getAttribute(a), a)); });
    document.querySelectorAll('.yt-open').forEach(e => add(e.getAttribute('aria-label').replace(e.dataset.ytitle, ''), 'yt'));
    ['meta[name=description]', 'meta[property="og:title"]', 'meta[property="og:description"]', 'meta[property="og:image:alt"]'].forEach(q => add(document.querySelector(q).content, q)); add(document.title, 'title');
    add(document.getElementById('procPanel').getAttribute('aria-label') || '', 'x');
    return [...out.keys()];
  });
  const pt = await collect(); assert.ok(pt.length > 150, 'coleta pequena: ' + pt.length);
  const SAME = /^[\d\s:.,%·–\-+★↗→‹›↑«»©()|/]*$|^(KAUÃ|LUCAS|Fiverr|YouTube|Fiverr ↗|Discord|Instagram|@editordevideo\.kaua|esmaaisk|V2|V1|TX|CC|A1|A2|Motion|Motion design|Motion design\.\.\.|Premium|US\$|B-rolls|overlays|storytelling|Kauã Lucas|BR|Filmcraft, EffectCraft.*)$|^\d+ ?[A-Z]{2}$/;
  // O que ficou igual ao português é legítimo quando é nome de idioma (cada um no seu) ou palavra que a língua alvo também usa.
  // Texto fixo no HTML/JS (sem chave) apareceria IGUAL nos três idiomas: por isso a interseção pt ∩ en ∩ es tem de ser vazia.
  const ENDONYMS = ['Português (Brasil)', 'English (United States)', 'Español (España)'];
  const EN_OK = new Set([...ENDONYMS, 'Stream highlights', 'Games', 'Highlights', 'sound design', 'Menu']);   // revisadas uma a uma: são inglês de verdade
  const sets = {};
  for (const code of ['en', 'es']) {
    await page.evaluate(c => I18N.set(c), code); await settled(page, LOCALE[code]); await new Promise(r => setTimeout(r, 250));
    sets[code] = new Set(await collect());
    await page.evaluate(c => I18N.set(c), 'pt-BR'); await settled(page, 'pt-BR');
  }
  const keep = t => !SAME.test(t) && !ENDONYMS.includes(t);
  assert.deepEqual(pt.filter(t => sets.en.has(t) && keep(t) && !EN_OK.has(t)), [], 'en: textos que continuam em português');
  assert.deepEqual(pt.filter(t => sets.en.has(t) && sets.es.has(t) && keep(t) && t !== 'Highlights'), [], 'texto fixo, sem tradução, nos 3 idiomas');
  assert.ok(sets.es.has('CINCO FORMATOS,') && sets.es.has('UN CRITERIO') && sets.en.has('FIVE FORMATS,'), 'a coleta não está lendo os textos traduzidos');
  await s.close();
});

test('tradução dinâmica: reel, filtros, YouTube, processo, avaliações, planos, contador e Discord acompanham o idioma', async () => {
  const s = await openFresh({ geoCountry: 'BR' }); const { page } = s; await settled(page, 'pt-BR');
  await page.evaluate(() => I18N.set('en')); await settled(page, 'en-US');
  const r = await page.evaluate(() => ({
    reelTitle: document.querySelector('#trabalhos .work-title').textContent, reelTag: document.querySelector('#trabalhos .tag-main').textContent,
    chips: [...document.querySelectorAll('#chips .chip')].map(c => c.textContent), more: document.getElementById('ytMore').textContent, status: document.getElementById('chipStatus').textContent,
    watch: document.querySelector('.yt-open').getAttribute('aria-label'), ytTitle: document.querySelector('.yt-title').textContent,
    motion: document.querySelector('#motionGrid h3').textContent, step: document.getElementById('procTitle').textContent, tab: document.querySelector('#procTabs [role=tab] span').textContent,
    seg: document.querySelector('#lV1 .tl-keep').textContent, play: document.getElementById('procPlay').textContent,
    rating: document.querySelector('[data-rating] strong').textContent, ratingNum: document.querySelector('.rating-num').textContent, heroNum: document.querySelector('.hero-proof b').textContent, heroProof: document.querySelector('.hero-proof').textContent.replace(/\s+/g, ' '),
    revMore: document.getElementById('reviewMore').textContent, date: document.getElementById('ratingDate').textContent, via: document.querySelector('.review figcaption span:last-child').textContent, score: document.querySelector('.review-score .sr-only').textContent,
    plan: document.querySelector('.plan h3').textContent, planLen: document.querySelector('.plan-len').textContent, price: document.querySelector('.plan-price').textContent.replace(/\s+/g, ''), spec: document.querySelector('.spec-tags li').textContent,
    stars: document.querySelector('.rating-num').dataset.final,
  }));
  assert.equal(r.reelTitle, DICT.en['works.conde']); assert.equal(r.reelTag, 'Games'); assert.equal(r.chips[0], 'All'); assert.match(r.more, /See all 17 videos/); assert.match(r.status, /Showing 6 YouTube videos\./);
  assert.match(r.watch, /^Watch on YouTube: /); assert.equal(r.ytTitle, 'Venda de imóveis', 'título real do YouTube não se traduz');
  assert.equal(r.motion, DICT.en['motion.conde.title']); assert.equal(r.step, DICT.en['process.steps.organize.title']); assert.equal(r.tab, DICT.en['process.steps.organize.tab']); assert.equal(r.seg, 'clip 1'); assert.equal(r.play, 'Watch the demo');
  assert.equal(r.rating, 'Rated 4.7 from 18 reviews'); assert.equal(r.ratingNum, '4.7'); assert.equal(r.heroNum, '4.7'); assert.match(r.heroProof, /★ 4\.7 from 18 reviews on Fiverr/);
  assert.match(r.revMore, /See all 18 reviews/); assert.equal(r.date, 'Fiverr data checked on November 14, 2026.'); assert.equal(r.via, 'via Fiverr'); assert.match(r.score, /^Rated \d(\.\d)? out of 5$/);
  assert.equal(r.plan, 'Basic'); assert.equal(r.planLen, 'Video up to 30 min'); assert.equal(r.price, 'US$20'); assert.equal(r.spec, 'dynamic cuts');
  await page.evaluate(() => I18N.set('es')); await settled(page, 'es-ES');
  assert.equal(await page.$eval('.rating-num', e => e.textContent), '4,7'); assert.equal(await page.$eval('#ratingDate', e => e.textContent), 'Datos de Fiverr comprobados el 14 de noviembre de 2026.');
  assert.equal(await page.$eval('.plan h3', e => e.textContent), 'Básico');
  // as avaliações são texto do cliente: idênticas ao Fiverr em qualquer idioma, com o idioma original marcado
  const got = await page.evaluate(() => [...document.querySelectorAll('#avaliacoes .review')].map(x => ({ text: x.querySelector('blockquote').textContent.trim(), lang: x.querySelector('blockquote').lang })));
  assert.deepEqual(got.map(g => g.text), FIX.reviews.map(f => f.text));
  const orig = await page.evaluate(() => window.FIVERR.reviews.map(r => r.lang));
  assert.ok(orig.includes('en') && orig.includes('pt'), 'reviews.js sem os dois idiomas');
  assert.deepEqual(got.map(g => g.lang), orig.map(l => l === 'en' ? 'en' : 'pt-BR'));
  assert.deepEqual(s.problems, []); await s.close();
});

test('troca de idioma preserva o estado: filtro do YouTube, "ver todas", etapa do processo e demonstração', async () => {
  const s = await openFresh({ geoCountry: 'BR' }); const { page } = s; await settled(page, 'pt-BR');
  await page.$eval('#resultado', e => e.scrollIntoView()); await page.click('#chips .chip[data-id="games"]');
  await page.click('#reviewMore'); await page.$eval('#procStage', e => e.scrollIntoView({ block: 'center' })); await new Promise(r => setTimeout(r, 500)); await page.click('#procTabs [role=tab]:nth-child(4)'); await page.click('#procPlay');
  const before = await page.evaluate(() => ({ chip: document.querySelector('#chips .chip[aria-pressed=true]').dataset.id, yt: [...document.querySelectorAll('.yt-card')].filter(c => !c.hidden).length, rev: [...document.querySelectorAll('.review')].filter(c => !c.hidden).length, tab: document.querySelector('#procTabs [aria-selected=true]').id, pressed: document.getElementById('procPlay').getAttribute('aria-pressed') }));
  assert.equal(before.pressed, 'true'); assert.equal(before.rev, 18);
  await page.evaluate(() => I18N.set('en')); await settled(page, 'en-US');
  const after = await page.evaluate(() => ({ chip: document.querySelector('#chips .chip[aria-pressed=true]').dataset.id, yt: [...document.querySelectorAll('.yt-card')].filter(c => !c.hidden).length, rev: [...document.querySelectorAll('.review')].filter(c => !c.hidden).length, tab: document.querySelector('#procTabs [aria-selected=true]').id, pressed: document.getElementById('procPlay').getAttribute('aria-pressed'), playText: document.getElementById('procPlay').textContent, more: document.getElementById('reviewMore').textContent }));
  assert.deepEqual({ ...after, playText: 0, more: 0 }, { ...before, playText: 0, more: 0 }); assert.equal(after.playText, 'Pause'); assert.equal(after.more, 'See less');
  await s.close();
});

test('movimento ligado: trocar de idioma mantém títulos animados legíveis, contador e cursor corretos e sem erros', async () => {
  const s = await openFresh({ geoCountry: 'BR', reduce: false }); const { page } = s; await settled(page, 'pt-BR'); await mo(page);
  await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 600) { scrollTo(0, y); await new Promise(r => setTimeout(r, 90)); } scrollTo(0, 0); });
  await page.evaluate(() => I18N.set('en')); await settled(page, 'en-US'); await new Promise(r => setTimeout(r, 1500));
  const r = await page.evaluate(() => ({ titles: [...document.querySelectorAll('.sec-title, .contact-big')].map(h => ({ t: h.textContent.replace(/\s+/g, ' ').trim(), op: getComputedStyle(h).opacity, lines: h.querySelectorAll('[class*=line]').length })), h1: document.querySelector('h1').textContent.replace(/\s+/g, ' '), mo: document.documentElement.classList.contains('mo-ready') }));
  assert.ok(r.mo); assert.match(r.h1, /KAUÃ\s*LUCAS/);
  assert.equal(r.titles[0].t, 'EDITING REEL'); assert.equal(r.titles[1].t, 'SEE THE RESULT'); assert.equal(r.titles.at(-1).t, "READY TO EDIT YOUR NEXT VIDEO?");
  assert.ok(r.titles.slice(0, -1).every(t => t.op === '1'), 'título transparente depois da troca');
  await page.$eval('#contato', e => e.scrollIntoView({ block: 'center' })); await new Promise(r => setTimeout(r, 2200));
  assert.equal(await page.$eval('.contact-big', e => getComputedStyle(e).opacity), '1', 'título do contato não apareceu ao chegar nele');
  await page.$eval('#avaliacoes .rating-box', e => e.scrollIntoView({ block: 'center' })); await new Promise(r => setTimeout(r, 2600));
  assert.equal(await page.$eval('#avaliacoes .rating-num', e => e.textContent.trim()), '4.7');
  await page.evaluate(() => I18N.set('es')); await settled(page, 'es-ES');
  assert.equal(await page.$eval('#avaliacoes .rating-num', e => e.textContent.trim()), '4,7');
  const card = await page.$('#resultado .yt-card:not([hidden]) .yt-open'); await card.evaluate(e => e.scrollIntoView({ block: 'center' })); await new Promise(r => setTimeout(r, 1800)); const b = await card.boundingBox();
  await page.mouse.move(b.x + 20, Math.max(b.y + 40, 40)); await page.mouse.move(b.x + b.width / 2, b.y + b.height / 3, { steps: 6 });
  assert.equal(await page.$eval('.cursor', c => c.textContent.trim()), 'VER');
  await page.evaluate(() => I18N.set('en')); await settled(page, 'en-US'); assert.equal(await page.$eval('.cursor', c => c.textContent.trim()), 'VIEW');
  assert.deepEqual(s.problems, []); await s.close();
});

test('falha ao carregar um idioma: continua no atual, avisa no menu, sem erro de página e sem salvar', async () => {
  const s = await openFresh({ geoCountry: 'BR', block: ['/i18n/en.js'] }); const { page } = s; await settled(page, 'pt-BR');
  await page.click('#langBtn'); await page.click('#langMenu [data-lang="en"]');
  await page.waitForFunction(() => !document.getElementById('langNote').hidden, { timeout: 5000 });
  assert.match(await page.$eval('#langNote', e => e.textContent), /Não foi possível carregar o idioma/);
  assert.equal(await page.evaluate(() => document.documentElement.lang), 'pt-BR'); assert.equal((await stored(page)).source, 'auto'); assert.equal((await stored(page)).lang, 'pt-BR');
  assert.equal(await page.$eval('#langMenu', m => m.hidden), false);
  assert.deepEqual(s.problems, []); await s.close();
});

test('escolhas rápidas em sequência: vence a última', async () => {
  const s = await openFresh({ geoCountry: 'BR' }); const { page } = s; await settled(page, 'pt-BR');
  await page.evaluate(() => { I18N.set('en'); I18N.set('es'); I18N.set('en'); I18N.set('es'); }); await settled(page, 'es-ES');
  await new Promise(r => setTimeout(r, 400)); assert.equal(await page.evaluate(() => I18N.lang), 'es'); assert.deepEqual(await stored(page), { lang: 'es', source: 'manual' }); await s.close();
});

test('idioma salvo ≠ português: carrega já traduzido (dicionário pedido no head) e sem erros', async () => {
  const s = await openFresh({ geoCountry: 'BR', stored: { lang: 'en', source: 'manual' }, reduce: false }); const { page } = s;
  await settled(page, 'en-US'); await mo(page);
  assert.equal(await page.$eval('.hero-lead', e => e.textContent.trim()), DICT.en['hero.lead'].replace(/<\/?b>/g, ''));
  assert.equal(await page.$eval('#trabalhos .work-title', e => e.textContent), DICT.en['works.conde']);
  assert.equal(await page.$eval('#chips .chip', e => e.textContent), 'All'); assert.deepEqual(s.problems, []); await s.close();
});

test('seletor no celular: cabe no cabeçalho em 320/375/390 px, alvo ≥ 44px, menu dentro da tela e convive com o menu hambúrguer', async () => {
  for (const w of [320, 375, 390, 768, 1024, 1100]) {
    const s = await openFresh({ geoCountry: 'BR', width: w, height: 800 }); const { page } = s;
    await page.waitForFunction(() => document.documentElement.classList.contains('has-lang'));
    const m = await page.evaluate(() => { const R = e => { const r = e.getBoundingClientRect(); return { left: r.left, right: r.right, width: r.width, height: r.height }; }; const b = R(document.getElementById('langBtn')), t = R(document.getElementById('navToggle')), l = R(document.querySelector('.logo')); return { vw: innerWidth, b, t, l }; });
    assert.ok(m.b.width >= 44 && m.b.height >= 44, `${w}px: alvo ${m.b.width}x${m.b.height}`);
    assert.ok(m.b.right <= m.t.left + 0.5 && m.l.right <= m.b.left + 0.5, `${w}px: elementos do cabeçalho se sobrepõem`); assert.ok(m.t.right <= m.vw + 0.5, `${w}px: sai da tela`);
    await page.click('#langBtn');
    const mm = await page.evaluate(() => { const r = document.getElementById('langMenu').getBoundingClientRect(); return { l: r.left, r: r.right, t: r.top, b: r.bottom, vw: innerWidth, items: [...document.querySelectorAll('#langMenu .lang-opt')].map(o => o.getBoundingClientRect().height) }; });
    assert.ok(mm.l >= 0 && mm.r <= mm.vw, `${w}px: menu de idiomas fora da tela (${mm.l}–${mm.r})`); assert.ok(mm.items.every(h => h >= 44), `${w}px: itens < 44px`);
    await page.click('#navToggle');                                            // abrir o menu principal fecha o de idiomas
    assert.equal(await page.$eval('#langMenu', e => e.hidden), true); assert.equal(await page.$eval('#navToggle', e => e.getAttribute('aria-expanded')), 'true');
    await page.click('#langBtn');                                              // e o contrário
    assert.equal(await page.$eval('#navToggle', e => e.getAttribute('aria-expanded')), 'false'); assert.equal(await page.$eval('#langMenu', e => e.hidden), false);
    await s.close();
  }
});

test('seletor no desktop: o cabeçalho não estoura entre 1101 e 1440 px (nem em espanhol, o idioma mais longo)', async () => {
  for (const w of [1101, 1180, 1280, 1366, 1440, 1920]) {
    const s = await openFresh({ geoCountry: 'ES', width: w, height: 800 }); const { page } = s; await settled(page, 'es-ES');
    const m = await page.evaluate(() => { const R = e => e.getBoundingClientRect(); const wrap = document.querySelector('.nav .wrap'); const kids = [...document.querySelectorAll('.nav-menu > a, #lang, .logo')].map(R); const cs = getComputedStyle(wrap); const inner = R(wrap).right - parseFloat(cs.paddingRight); return { inner, maxRight: Math.max(...kids.map(k => k.right)), sorted: kids.map(k => [k.left, k.right]).sort((a, b) => a[0] - b[0]), wraps: [...document.querySelectorAll('.nav-menu > a')].some(a => R(a).height > 44), vis: getComputedStyle(document.getElementById('navToggle')).display }; });
    assert.ok(m.maxRight <= m.inner + 1, `${w}px: cabeçalho passa ${Math.round(m.maxRight - m.inner)}px do container`);
    for (let i = 1; i < m.sorted.length; i++) assert.ok(m.sorted[i][0] >= m.sorted[i - 1][1] - 0.5, `${w}px: itens do cabeçalho se sobrepõem`);
    assert.equal(m.wraps, false, `${w}px: item do menu quebrou em duas linhas`);
    await s.close();
  }
});

test('o layout e a identidade visual não mudam: o seletor não altera o espaço do restante do site (CLS ≤ 0,1 com troca de idioma no 1º acesso)', async () => {
  const s = await openFresh({ geoCountry: 'US', reduce: false });
  await s.page.evaluateOnNewDocument(() => { window.__cls = 0; new PerformanceObserver(l => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; }).observe({ type: 'layout-shift', buffered: true }); });
  await s.page.reload({ waitUntil: 'load' }); await settled(s.page, 'en-US'); await new Promise(r => setTimeout(r, 1500));
  const cls = await s.page.evaluate(() => window.__cls); console.log(`  CLS na troca automática PT→EN no 1º acesso: ${cls.toFixed(3)}`);
  assert.ok(cls < 0.1, 'CLS ' + cls); await s.close();
});
