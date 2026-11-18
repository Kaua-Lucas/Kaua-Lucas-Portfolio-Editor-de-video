// Gera assets/media/og.jpg (1200×630) com a marca e as fontes do site. Uso: node tools/build-og.mjs
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(path.join(ROOT, 'tests', 'package.json'));
const puppeteer = require('puppeteer-core');
const mark = fs.readFileSync(path.join(ROOT, 'assets/brand/kl-mark.svg'), 'utf8');
const font = f => pathToFileURL(path.join(ROOT, 'assets/fonts', f)).href;

const html = `<!doctype html><meta charset="utf-8"><style>
@font-face{font-family:Bebas;src:url(${font('bebas-neue-latin-400-normal.woff2')})}
@font-face{font-family:DM;src:url(${font('dm-sans-latin-wght-normal.woff2')});font-weight:100 1000}
@font-face{font-family:Mono;src:url(${font('space-mono-latin-400-normal.woff2')})}
*{margin:0;box-sizing:border-box}
body{width:1200px;height:630px;background:#0a0a0a;color:#f5f5f0;position:relative;overflow:hidden;font-family:DM,sans-serif}
.cut{position:absolute;right:-60px;top:0;width:560px;height:630px;background:#121212;clip-path:polygon(34.64% 0,100% 0,100% 100%,0 100%)}
.mark{position:absolute;right:92px;top:130px;width:370px;height:370px}
.mark svg{width:100%;height:100%}
.t{position:absolute;left:72px;top:72px}
.eyebrow{font:400 22px Mono;letter-spacing:.18em;text-transform:uppercase;color:#c8f135}
h1{font:400 160px/0.86 Bebas;margin-top:18px;letter-spacing:.01em}
h1 span{display:block}
h1 .o{color:transparent;-webkit-text-stroke:3px #f5f5f0}
p{font:500 28px/1.3 DM;color:#a8a8a2;margin-top:26px;max-width:600px}
.bar{position:absolute;left:72px;bottom:44px;display:flex;gap:28px;font:400 20px Mono;letter-spacing:.08em;color:#a8a8a2}
.bar b{color:#f5f5f0;font-weight:400}
</style>
<div class="cut"></div><div class="mark">${mark}</div>
<div class="t"><div class="eyebrow">Editor de vídeo</div><h1><span>KAUÃ</span><span class="o">LUCAS</span></h1><p>Gameplay, YouTube, highlights, vídeos curtos e motion design.</p></div>
<div class="bar"><span><b>★ 4,7</b> · 18 avaliações no Fiverr</span></div>`;

const browser = await puppeteer.launch({ executablePath: process.env.CHROME_PATH || '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--allow-file-access-from-files'] });
const page = await browser.newPage();
await page.setViewport({ width: 1200, height: 630, deviceScaleFactor: 1 });
const tmp = path.join(ROOT, 'tools', '_og.html'); fs.writeFileSync(tmp, html);
await page.goto(pathToFileURL(tmp).href); await page.evaluate(() => document.fonts.ready); await new Promise(r => setTimeout(r, 300));
await page.screenshot({ path: path.join(ROOT, 'assets/media/og.jpg'), type: 'jpeg', quality: 88 });
fs.unlinkSync(tmp); await browser.close(); console.log('og.jpg ok');
