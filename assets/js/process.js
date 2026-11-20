// Demonstração do processo de edição (ilustrativa).
// Ideia original da linha do tempo: index1.html (experimento). Aqui foi
// reescrita com 8 etapas, teclado completo e sem autoplay.
(function () {
  const D = window.SITE_DATA && window.SITE_DATA.PROCESS, I = window.I18N;
  const root = document.getElementById('procStage');
  if (!D || !I || !root) return;
  const t = I.t;   /* textos em assets/js/i18n/*.js (process.*); data.js guarda só as chaves */
  const step = i => { const k = 'process.steps.' + D.steps[i] + '.'; return { tab: t(k + 'tab'), title: t(k + 'title'), text: t(k + 'text'), list: t(k + 'list') }; };

  const $ = id => document.getElementById(id);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const RAW = D.segs.reduce((s, g) => s + g.d[0], 0);
  const N = D.steps.length;
  let cur = 0, timer = null, shown = RAW, visible = false;

  const fmt = s => { s = Math.round(s); return Math.floor(s / 60) + ':' + ('0' + (s % 60)).slice(-2); };
  const mk = (parent, cls, txt) => { const e = document.createElement('div'); e.className = cls; if (txt) e.textContent = txt; parent.appendChild(e); return e; };

  // ── construção das faixas ──
  const segText = (g, i) => g.t === 'keep' ? t('process.seg.clip', { n: i + 1 }) : t('process.seg.' + g.t);
  const segEls = D.segs.map((g, i) => mk($('lV1'), g.t === 'keep' ? 'tl-keep' : 'tl-bad', segText(g, i)));
  const mkEls = D.segs.map(g => { if (!g.m) return null; const e = document.createElement('i'); e.className = 'tl-mk'; $('lV1').appendChild(e); return e; });
  const brollText = b => t('process.broll.prefix', { label: t('process.broll.' + b.l) });
  const bEls = D.broll.map(b => mk($('lV2'), 'tl-b', brollText(b)));
  const tEls = D.tx.map(b => mk($('lTX'), 'tl-t', t('process.tx.' + b.l)));
  const cc = mk($('lCC'), 'tl-cc'); const a1 = mk($('lA1'), 'tl-a1'); const a2 = mk($('lA2'), 'tl-a2', t('process.music'));
  $('lV1').style.overflow = 'visible';
  const head = $('procHead');

  let total = RAW;
  function layout(stage) {
    const k = stage < 1 ? 0 : stage === 1 ? 1 : 2; // etapa 0 mostra o bruto; 1 = 1ª decupagem; 2+ = 2ª análise
    let x = 0;
    D.segs.forEach((g, i) => {
      g.l = x; g.w = g.d[k]; x += g.w;
      const e = segEls[i]; e.style.left = (g.l / RAW) * 100 + '%'; e.style.width = (g.w / RAW) * 100 + '%'; e.style.opacity = g.w ? 1 : 0;
      if (mkEls[i]) mkEls[i].style.left = (g.l / RAW) * 100 + '%';
    });
    const put = (arr, els) => arr.forEach((b, i) => { const g = D.segs[b.seg]; els[i].style.left = ((g.l + g.w * b.a) / RAW) * 100 + '%'; els[i].style.width = ((g.w * b.len) / RAW) * 100 + '%'; });
    put(D.broll, bEls); put(D.tx, tEls);
    [cc, a1, a2].forEach(e => { e.style.width = (x / RAW) * 100 + '%'; });
    total = x;
  }

  function tween(to) {
    const out = $('procDur');
    if (reduce) { shown = to; out.textContent = fmt(to); return; }
    const from = shown, t0 = performance.now();
    (function f(t) { const p = Math.min(1, (t - t0) / 900); shown = from + (to - from) * p; out.textContent = fmt(shown); if (p < 1) requestAnimationFrame(f); })(t0);
  }

  function compare() {
    const pct = Math.round((1 - total / RAW) * 100);
    $('procCmp').innerHTML =
      '<div class="cm"><span>' + t('process.compare.before') + '</span><div style="width:100%"></div><span>' + fmt(RAW) + '</span></div>' +
      '<div class="cm after"><span>' + t('process.compare.after') + '</span><div style="width:' + (total / RAW) * 100 + '%"></div><span>' + fmt(total) + '</span></div>' +
      '<div class="cm"><span></span><span>' + t('process.compare.example', { pct }) + '</span><span></span></div>';
  }

  // ── etapa atual ──
  function setPane(s) {
    const pane = $('procPv'); const tag = $('procTag');
    tag.textContent = t('process.noMediaTag');
    $('procCardN').textContent = ('0' + (cur + 1)).slice(-2); $('procCardT').textContent = s.tab;
    pane.setAttribute('aria-label', t('process.cardAria', { n: cur + 1, tab: s.tab }));
  }

  function go(n, focusTab, quiet) {
    cur = Math.max(0, Math.min(N - 1, n));
    const s = step(cur);
    root.classList.toggle('is-raw', cur === 0);
    root.classList.toggle('has-mk', cur >= 3);
    root.classList.toggle('has-b', cur >= 4);
    root.classList.toggle('has-au', cur >= 5);
    root.classList.toggle('has-cc', cur >= 6);
    root.classList.toggle('has-final', cur >= 7);
    $('procTl').classList.toggle('is-raw', cur === 0);
    layout(cur); tween(total);
    $('procTitle').textContent = s.title; $('procText').textContent = s.text;
    $('procList').innerHTML = s.list.map(l => '<li>' + l + '</li>').join('');
    $('procProg').style.width = ((cur + 1) / N) * 100 + '%';
    const pv = $('procPrev'), nx = $('procNext');
    const ae = document.activeElement;
    if (ae === pv && cur === 0) nx.focus(); else if (ae === nx && cur === N - 1) pv.focus();
    pv.disabled = cur === 0; nx.disabled = cur === N - 1;
    document.querySelectorAll('#procTabs [role=tab]').forEach((b, i) => { b.setAttribute('aria-selected', i === cur); b.tabIndex = i === cur ? 0 : -1; });
    $('procPanel').setAttribute('aria-labelledby', 'tab' + cur);
    if (cur >= 7) compare();
    if (!quiet) $('procSr').textContent = t('process.sr', { n: cur + 1, total: N, title: s.title, dur: fmt(total) });
    setPane(s);
    if (focusTab) document.querySelectorAll('#procTabs [role=tab]')[cur].focus();
  }

  // ── cabeça de reprodução (só após B-roll; pausa fora da tela) ──
  function loop(t) {
    if (visible && cur >= 4 && !reduce) head.style.left = ((t / 9000) % 1) * (total / RAW) * 100 + '%';
    requestAnimationFrame(loop);
  }
  function stop() { clearInterval(timer); timer = null; $('procPlay').textContent = t('process.play'); $('procPlay').setAttribute('aria-pressed', 'false'); }

  // ── controles ──
  D.steps.forEach((k, i) => {
    const b = document.createElement('button');
    b.type = 'button'; b.id = 'tab' + i; b.setAttribute('role', 'tab'); b.setAttribute('aria-controls', 'procPanel');
    b.innerHTML = '<i>' + ('0' + (i + 1)).slice(-2) + '</i><span>' + step(i).tab + '</span>';
    b.addEventListener('click', () => { stop(); go(i); });
    $('procTabs').appendChild(b);
  });
  $('procTabs').addEventListener('keydown', e => {
    const map = { ArrowDown: cur + 1, ArrowRight: cur + 1, ArrowUp: cur - 1, ArrowLeft: cur - 1, Home: 0, End: N - 1 };
    if (!(e.key in map)) return;
    e.preventDefault(); stop(); go(map[e.key], true);
  });
  $('procPrev').addEventListener('click', () => { stop(); go(cur - 1); });
  $('procNext').addEventListener('click', () => { stop(); go(cur + 1); });
  $('procPlay').addEventListener('click', () => {
    if (timer) { stop(); return; }
    if (cur >= N - 1) go(0);
    $('procPlay').textContent = t('process.stop'); $('procPlay').setAttribute('aria-pressed', 'true');
    timer = setInterval(() => { if (cur >= N - 1) { stop(); return; } go(cur + 1); }, reduce ? 7000 : 5000);
  });
  new IntersectionObserver(e => {
    visible = e[0].isIntersecting;
    if (!visible) stop();
  }, { threshold: 0.25 }).observe(root);

  /* troca de idioma: refaz os textos da demonstração sem mexer na etapa atual, no andamento nem no foco */
  I.onChange(() => {
    D.segs.forEach((g, i) => { segEls[i].textContent = segText(g, i); });
    D.broll.forEach((b, i) => { bEls[i].textContent = brollText(b); });
    D.tx.forEach((b, i) => { tEls[i].textContent = t('process.tx.' + b.l); });
    a2.textContent = t('process.music');
    document.querySelectorAll('#procTabs [role=tab] span').forEach((sp, i) => { sp.textContent = step(i).tab; });
    if (timer) $('procPlay').textContent = t('process.stop');
    go(cur, false, true); $('procSr').textContent = '';   /* sem anunciar: o texto antigo ficaria no idioma errado */
  });

  go(0); requestAnimationFrame(loop);
})();
