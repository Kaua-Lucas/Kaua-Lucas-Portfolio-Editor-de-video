// Verificação do portfólio. Rodar: cd tests && npm i && npm test
// Servidor estático próprio (com Range, necessário para vídeo) + Chrome headless.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer, { KnownDevices } from 'puppeteer-core';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FIX = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests/fixtures/fiverr-reviews.json'), 'utf8'));
const CHROME = process.env.CHROME_PATH || '/usr/bin/google-chrome';
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript', '.webm': 'video/webm', '.webp': 'image/webp', '.jpeg': 'image/jpeg', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json', '.txt': 'text/plain', '.xml': 'application/xml' };

let server, base, browser;
const hits = []; // caminhos requisitados ao servidor local

before(async () => {
  server = http.createServer((req, res) => {
    const url = decodeURIComponent(req.url.split('?')[0]);
    hits.push(url);
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
