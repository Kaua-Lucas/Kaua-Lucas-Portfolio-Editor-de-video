// Gera assets/js/reviews.js a partir de tests/fixtures/fiverr-reviews.json
// (assim o texto das avaliações nunca é digitado à mão). Uso: node tools/build-reviews.mjs
import fs from 'node:fs';
const fx = JSON.parse(fs.readFileSync(new URL('../tests/fixtures/fiverr-reviews.json', import.meta.url), 'utf8'));
const en = /\b(the|and|was|very|great|once|again|work|worker|recommend)\b/i;
const reviews = fx.reviews.map(r => ({ ...r, lang: en.test(r.text) ? 'en' : 'pt' }));
const out = `// GERADO por tools/build-reviews.mjs — não editar à mão.\n// Fonte: ${fx.source}\nwindow.FIVERR = ${JSON.stringify({ score: fx.profile.score, count: fx.profile.count, checkedAt: '2026-11-14', reviews }, null, 1)};\n`;
fs.writeFileSync(new URL('../assets/js/reviews.js', import.meta.url), out);
console.log('ok:', reviews.length, 'avaliações;', reviews.filter(r => r.lang === 'en').map(r => r.user).join(', '));
