/* i18n — tradução do site. Sem dependências.

   Como funciona
   - O HTML é escrito em português (BASE): sem JavaScript, ou antes dele, o visitante já lê o site completo.
   - Os textos de cada idioma ficam em assets/js/i18n/<código>.js. Só o português vai no HTML; os demais
     são carregados sob demanda (e o idioma salvo é pré-carregado por um script no <head> do index.html).
   - Marcação:  data-i18n="chave"            → textContent
                data-i18n-html="chave"       → innerHTML (só texto nosso, com <b>/<em>)
                data-i18n-attr="aria-label:chave alt:outra.chave" → atributos
     Textos montados por JS usam I18N.t('chave', { parâmetros }).
   - Ordem de decisão do idioma: escolha manual salva > detecção por país (IP) > idioma do navegador > BASE.
   - Para acrescentar um idioma: crie o arquivo do dicionário, cadastre-o em LANGUAGES (com os países) e pronto;
     o seletor do cabeçalho monta o item sozinho.

   Detecção do país (nunca pede GPS): 1) /api/geo (função da Vercel, país vem do cabeçalho da própria
   hospedagem; nada é enviado a terceiros) → 2) api.country.is (reserva) → 3) idioma do navegador.
   O resultado é guardado: com idioma salvo não há consulta; um país descoberto vale por 24 h; uma falha
   evita novas tentativas por 1 h. */
(() => {
  'use strict';

  const BASE = 'pt-BR';        /* idioma do HTML e reserva para chaves que faltarem */
  const FALLBACK = 'en';       /* países sem tradução própria */
  const LS_LANG = 'kl.lang';   /* { lang, source: 'manual' | 'auto' } */
  const LS_GEO = 'kl.geo';     /* { country, at } ou { fail: true, at } */
  const GEO_OK_MS = 24 * 3600e3, GEO_FAIL_MS = 3600e3, GEO_TIMEOUT = 2500, LOAD_TIMEOUT = 8000;
  const GEO_SOURCES = [
    { url: 'api/geo', third: false },
    { url: 'https://api.country.is/', third: true },
  ];

  /* flag: nome do desenho no seletor · countries: países (ISO 3166-1) que sugerem este idioma */
  const LANGUAGES = [
    { code: 'pt-BR', short: 'PT', name: 'Português (Brasil)', locale: 'pt-BR', flag: 'br', countries: ['BR', 'PT', 'AO', 'MZ', 'CV', 'GW', 'ST', 'TL'] },
    { code: 'en', short: 'EN', name: 'English (United States)', locale: 'en-US', flag: 'us', countries: ['US', 'GB', 'CA', 'AU', 'NZ', 'IE'] },
    { code: 'es', short: 'ES', name: 'Español (España)', locale: 'es-ES', flag: 'es', countries: ['ES', 'MX', 'AR', 'CO', 'CL', 'PE', 'VE', 'EC', 'GT', 'CU', 'BO', 'DO', 'HN', 'PY', 'SV', 'NI', 'CR', 'PA', 'UY', 'PR', 'GQ'] },
  ];

  const SRC = document.currentScript && document.currentScript.src;
  const DIR = SRC ? SRC.replace(/[?#].*$/, '').replace(/[^/]*$/, '') + 'i18n/' : 'assets/js/i18n/';

  const dicts = {};              /* código → mapa plano { 'nav.work': 'Trabalhos', … } */
  const loading = {};            /* código → Promise do carregamento */
  const hooks = { before: [], change: [], state: [] };
  const mem = {};                /* reserva quando o localStorage não está disponível */
  const warned = {};
  let current = BASE, source = 'default', shared = {}, seq = 0, started = false, detecting = null, live = null;

  const meta = code => LANGUAGES.find(l => l.code === code);
  const supported = code => !!meta(code);

  /* ── armazenamento (localStorage com reserva em memória) ───────── */
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (_) { return k in mem ? mem[k] : null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (_) { mem[k] = v; } },
  };
  const readJSON = k => { try { return JSON.parse(store.get(k) || 'null'); } catch (_) { return null; } };
  const savedPref = () => { const s = readJSON(LS_LANG); return s && typeof s === 'object' && supported(s.lang) ? s : null; };   /* ignora valor corrompido ou de idioma removido */

  /* ── dicionários ──────────────────────────────────────────────── */
  function flatten(node, prefix, out) {
    if (typeof node === 'string') out[prefix] = node;
    else if (Array.isArray(node)) { out[prefix] = node; node.forEach((v, i) => flatten(v, prefix + '.' + i, out)); }
    else if (node && typeof node === 'object') Object.keys(node).forEach(k => flatten(node[k], prefix ? prefix + '.' + k : k, out));
    return out;
  }
  function register(code, tree) {
    if (!supported(code)) { console.warn('i18n: idioma não cadastrado:', code); return; }
    dicts[code] = flatten(tree, '', {});
  }
  /* os arquivos de dicionário empurram [código, árvore] para esta fila; funciona em qualquer ordem de carga */
  const queued = window.__i18nQ;
  window.__i18nQ = { push(entry) { register(entry[0], entry[1]); return 1; } };
  if (Array.isArray(queued)) queued.forEach(entry => register(entry[0], entry[1]));

  function load(code) {
    if (!supported(code)) return Promise.reject(new Error('idioma desconhecido'));
    if (dicts[code]) return Promise.resolve();
    if (loading[code]) return loading[code];
    return (loading[code] = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      const fail = err => { clearTimeout(timer); s.remove(); delete loading[code]; reject(err); };
      const timer = setTimeout(() => fail(new Error('tempo esgotado')), LOAD_TIMEOUT);
      s.async = true; s.src = DIR + code + '.js';
      s.onload = () => { clearTimeout(timer); if (dicts[code]) resolve(); else fail(new Error('dicionário vazio')); };
      s.onerror = () => fail(new Error('falha de rede'));
      document.head.append(s);
    }));
  }

  /* ── tradução e formatação ────────────────────────────────────── */
  const raw = key => {
    const d = dicts[current];
    if (d && key in d) return d[key];
    const b = dicts[BASE];
    return b && key in b ? b[key] : undefined;
  };
  function t(key, p) {
    const v = raw(key);
    if (v === undefined) { if (!warned[key]) { warned[key] = 1; console.warn('i18n: chave sem tradução:', key); } return key; }
    if (typeof v !== 'string') return v;                       /* lista */
    return v.replace(/\{(\w+)\}/g, (m, n) => { const x = p && n in p ? p[n] : shared[n]; return x == null ? m : x; });
  }
  const locale = () => (meta(current) || meta(BASE)).locale;
  const num = (n, decimals = 0) => new Intl.NumberFormat(locale(), { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(n);
  const date = (iso, opts) => new Date(iso + 'T12:00:00').toLocaleDateString(locale(), opts);
  function updateShared() {
    const F = window.FIVERR;                                  /* nota e quantidade vêm das avaliações reais (reviews.js) */
    shared = F ? { score: num(F.score, 1), scoreRaw: F.score, count: F.count } : {};
  }

  /* ── aplicação no DOM ─────────────────────────────────────────── */
  const pick = (root, sel) => { const r = root.nodeType === 1 && root.matches(sel) ? [root] : []; return r.concat([...root.querySelectorAll(sel)]); };
  function numbers(root) {                                     /* contadores: valor final no formato do idioma */
    pick(root, '[data-countto]').forEach(el => {
      const txt = num(parseFloat(el.dataset.countto), +el.dataset.decimals || 0);
      el.dataset.final = txt;
      if (!el.hasAttribute('data-counting')) el.textContent = txt;   /* data-counting: o movimento está animando este número */
    });
  }
  function apply(root = document) {
    pick(root, '[data-i18n]').forEach(el => { const v = t(el.dataset.i18n); if (typeof v === 'string' && el.textContent !== v) el.textContent = v; });
    pick(root, '[data-i18n-html]').forEach(el => { const v = t(el.dataset.i18nHtml); if (typeof v === 'string') el.innerHTML = v; });
    pick(root, '[data-i18n-attr]').forEach(el => el.dataset.i18nAttr.trim().split(/\s+/).forEach(pair => {
      const i = pair.indexOf(':'); if (i < 1) return;
      const v = t(pair.slice(i + 1)); if (typeof v === 'string') el.setAttribute(pair.slice(0, i), v);
    }));
    numbers(root);
  }

  const emit = (list, arg) => list.slice().forEach(fn => { try { fn(arg); } catch (e) { console.error('i18n: erro em um ouvinte:', e); } });
  function announce(msg) {                                     /* leitores de tela: avisa a troca sem mexer no foco */
    if (!live) {
      live = document.createElement('p'); live.className = 'sr-only'; live.id = 'i18nLive'; live.setAttribute('role', 'status'); live.setAttribute('aria-live', 'polite');
      document.body.append(live);
    }
    live.textContent = ''; setTimeout(() => { live.textContent = msg; }, 60);
  }

  /* ── troca de idioma ──────────────────────────────────────────── */
  function commit(code, src, initial) {
    const from = current, changed = code !== from;
    if (changed) emit(hooks.before, { from, to: code });
    current = code; source = src; updateShared();
    document.documentElement.lang = meta(code).locale;
    if (initial && code === BASE) numbers(document);           /* o HTML já está em BASE: nada a reescrever */
    else if (changed || initial) apply(document);
    if (changed) emit(hooks.change, { lang: code, from, initial: !!initial });
    emit(hooks.state, { lang: code, source: src });
    if (changed && !initial) announce(t('lang.changed', { name: meta(code).name }));
  }
  const save = (code, src) => store.set(LS_LANG, JSON.stringify({ lang: code, source: src }));

  /* opts: source ('manual' | 'auto'), persist (padrão: sim), initial */
  async function set(code, opts = {}) {
    if (!supported(code)) return false;
    const my = ++seq, src = opts.source || 'manual';
    try { await load(code); } catch (err) {
      console.warn('i18n: não foi possível carregar o idioma', code, '-', err.message);
      if (my === seq) announce(t('lang.loadError', { name: meta(current).name }));
      return false;
    }
    if (my !== seq) return false;                              /* uma troca mais nova chegou enquanto carregava */
    if (opts.persist !== false) save(code, src);
    commit(code, src, !!opts.initial);
    return true;
  }

  /* ── detecção automática ──────────────────────────────────────── */
  async function getJSON(url, ms, third) {
    const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), ms);
    try {
      const r = await fetch(url, { signal: ctl.signal, cache: 'no-store', credentials: third ? 'omit' : 'same-origin', referrerPolicy: third ? 'no-referrer' : undefined });
      if (!r.ok || !/json/i.test(r.headers.get('content-type') || '')) throw new Error('resposta inválida');
      return await r.json();
    } finally { clearTimeout(timer); }
  }
  const forCountry = cc => (LANGUAGES.find(l => l.countries.includes(cc)) || meta(FALLBACK)).code;
  function forBrowser() {
    const tags = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || ''];
    for (const tag of tags) {
      const base = String(tag).toLowerCase().split('-')[0];
      const hit = LANGUAGES.find(l => l.code.toLowerCase().split('-')[0] === base);
      if (hit) return hit.code;
    }
    return FALLBACK;
  }
  /* devolve { lang, country, via: 'ip' | 'browser' }; nunca rejeita */
  function detect() {
    if (detecting) return detecting;
    const run = (async () => {
      const g = readJSON(LS_GEO), now = Date.now();
      if (g && g.country && now - g.at < GEO_OK_MS) return { lang: forCountry(g.country), country: g.country, via: 'ip' };
      if (!(g && g.fail && now - g.at < GEO_FAIL_MS)) {
        for (const s of GEO_SOURCES) {
          try {
            const j = await getJSON(s.url, GEO_TIMEOUT, s.third);
            const cc = String((j && j.country) || '').toUpperCase();
            if (/^[A-Z]{2}$/.test(cc)) { store.set(LS_GEO, JSON.stringify({ country: cc, at: now })); return { lang: forCountry(cc), country: cc, via: 'ip' }; }
          } catch (_) { /* tenta a próxima fonte */ }
        }
        store.set(LS_GEO, JSON.stringify({ fail: true, at: now }));
      }
      return { lang: forBrowser(), country: null, via: 'browser' };
    })();
    detecting = run; run.then(() => { detecting = null; });
    return run;
  }
  /* "Detectar automaticamente": descarta a escolha manual e usa o país atual */
  async function auto() {
    const r = await detect();
    try { localStorage.removeItem(LS_LANG); } catch (_) { delete mem[LS_LANG]; }
    await set(r.lang, { source: 'auto', persist: r.via === 'ip' });   /* só pelo navegador: não grava, tenta o país de novo depois */
    return r;
  }

  function start() {
    if (started) return api;
    started = true;
    const saved = savedPref();
    if (saved) {
      set(saved.lang, { source: saved.source === 'manual' ? 'manual' : 'auto', persist: false, initial: true });
    } else {
      updateShared(); numbers(document);
      detect().then(r => {
        if (savedPref()) return;                               /* o visitante escolheu enquanto a consulta rodava: a escolha manda */
        return set(r.lang, { source: 'auto', persist: r.via === 'ip' });
      });
    }
    return api;
  }

  const on = (list, fn) => { list.push(fn); return () => { const i = list.indexOf(fn); if (i >= 0) list.splice(i, 1); }; };
  const api = {
    languages: LANGUAGES, base: BASE,
    t, num, date, apply, set, auto, start,
    get: key => raw(key), has: key => raw(key) !== undefined,
    preload: load, meta,
    get lang() { return current; }, get source() { return source; },
    onBeforeChange: fn => on(hooks.before, fn),                /* { from, to } — antes de o DOM mudar */
    onChange: (fn, o) => { if (o && o.immediate) fn({ lang: current, from: current, initial: true }); return on(hooks.change, fn); },
    onState: fn => on(hooks.state, fn),                        /* idioma ou origem (manual/auto) mudou */
  };
  window.I18N = api;
  start();
})();
