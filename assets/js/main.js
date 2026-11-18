// Comportamento do site: navegação, trabalhos, modal, avaliações, contato.
// Sem dependências. Dados em data.js e reviews.js.
(function () {
  'use strict';
  const D = window.SITE_DATA, FV = window.FIVERR;
  if (!D) return;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canHover = matchMedia('(hover: hover) and (pointer: fine)').matches;

  const ICON = {
    play: '<svg class="i i-fill" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>',
    star: '<svg class="i i-fill" viewBox="0 0 24 24" aria-hidden="true"><path d="m12 2.5 2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3 6.1 20.6l1.3-6.6L2.5 9.4l6.6-.8z"/></svg>',
  };
  const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const catLabel = id => (D.categories.find(c => c.id === id) || {}).label || id;

  document.documentElement.classList.add('js');

  /* ── NAV ─────────────────────────────────────────────── */
  const nav = $('.nav'), toggle = $('#navToggle'), menu = $('#navMenu');
  const onScroll = () => nav.classList.toggle('solid', scrollY > 24);
  addEventListener('scroll', onScroll, { passive: true }); onScroll();
  const closeMenu = () => { menu.classList.remove('open'); toggle.setAttribute('aria-expanded', 'false'); };
  toggle.addEventListener('click', () => {
    const open = menu.classList.toggle('open'); toggle.setAttribute('aria-expanded', String(open));
  });
  menu.addEventListener('click', e => { if (e.target.closest('a')) closeMenu(); });
  addEventListener('keydown', e => { if (e.key === 'Escape' && menu.classList.contains('open')) { closeMenu(); toggle.focus(); } });
  matchMedia('(min-width: 1101px)').addEventListener('change', closeMenu);

  const links = $$('#navMenu a[href^="#"]').filter(a => !a.classList.contains('nav-cta'));
  const spy = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    // seções sem link no menu (ex.: hero, contato) limpam o destaque
    links.forEach(a => a.setAttribute('aria-current', String(a.getAttribute('href') === '#' + e.target.id)));
  }), { rootMargin: '-45% 0px -50% 0px' });
  $$('main > section[id]').forEach(s => spy.observe(s));

  /* ── REVEAL ──────────────────────────────────────────── */
  const rv = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('vis'); rv.unobserve(e.target); } }), { threshold: 0.08 });
  $$('.reveal').forEach(n => reduce ? n.classList.add('vis') : rv.observe(n));

  /* ── PRÉVIAS DE VÍDEO (sob demanda, no máx. 2 ao mesmo tempo) ── */
  let carStop = () => {}, carResume = () => {};
  const active = new Set();
  function previewStop(v) { v.pause(); v.classList.remove('on'); active.delete(v); }
  function previewPlay(v) {
    if (reduce || !v.dataset.preview) return;
    if (!v.getAttribute('src')) v.src = v.dataset.preview;
    v.muted = true;
    v.play().then(() => v.classList.add('on')).catch(() => {});
    active.add(v);
    while (active.size > 2) previewStop(active.values().next().value);
  }
  const previewAllStop = () => { [...active].forEach(previewStop); carStop(); };
  const touchVideos = new Set();
  const reobserve = () => touchVideos.forEach(v => { viewObs.unobserve(v); viewObs.observe(v); });
  const viewObs = new IntersectionObserver(es => es.forEach(e => (e.isIntersecting ? previewPlay : previewStop)(e.target)), { threshold: 0.6 });
  function wirePreview(card, v) {
    if (reduce) return;
    if (canHover) {
      card.addEventListener('pointerenter', () => previewPlay(v)); card.addEventListener('pointerleave', () => previewStop(v));
      card.addEventListener('focus', () => previewPlay(v)); card.addEventListener('blur', () => previewStop(v));
    } else { viewObs.observe(v); touchVideos.add(v); }
  }
  document.addEventListener('visibilitychange', () => { if (document.hidden) previewAllStop(); else if (!(dlg && dlg.open)) { reobserve(); carResume(); } });

  /* ── MODAL ───────────────────────────────────────────── */
  const dlg = $('#videoModal'), stage = $('#modalStage'), mTitle = $('#modalTitle');
  let lastTrigger = null;
  function openModal(o, trigger) {
    lastTrigger = trigger; previewAllStop(); stage.textContent = '';
    if (o.kind === 'local') {
      const v = el('video'); v.controls = true; v.playsInline = true; v.autoplay = true; v.preload = 'metadata'; v.poster = o.poster; v.src = o.src;
      v.setAttribute('aria-label', o.title); stage.append(v);
    } else {
      const f = el('iframe'); f.src = 'https://www.youtube-nocookie.com/embed/' + o.id + '?autoplay=1&rel=0';
      f.title = o.title; f.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen'; f.allowFullscreen = true; stage.append(f);
    }
    mTitle.textContent = o.title; document.body.style.overflow = 'hidden'; dlg.showModal();
  }
  dlg.addEventListener('close', () => { stage.textContent = ''; document.body.style.overflow = ''; if (lastTrigger) lastTrigger.focus(); reobserve(); carResume(); });
  dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); });
  $('#modalClose').addEventListener('click', () => dlg.close());

  /* ── TRABALHOS: reel infinito (marquee por transform) ── */
  const car = $('#trabalhos [data-carousel]'), outer = $('.car-outer', car), track = $('[data-track]', car), pauseBtn = $('[data-toggle]', car), ytGrid = $('#ytGrid');
  function slide(w, clone) {
    const art = el('article', 'work-card car-slide'); art.dataset.slide = '';
    if (clone) art.setAttribute('aria-hidden', 'true');
    const btn = el('div', 'work-view');   /* só vitrine: não é clicável e não abre vídeo (os vídeos completos ficam em VEJA O RESULTADO) */
    btn.innerHTML = '<span class="work-media"><img src="' + w.poster + '" alt="" width="960" height="540" loading="lazy" decoding="async"><video muted loop autoplay playsinline preload="none" tabindex="-1" aria-hidden="true" data-preview="' + w.preview + '"></video></span>' +
      '<span class="work-meta"><span class="work-title">' + esc(w.title) + '</span><span class="work-tags"><span class="tag-main">' + esc(catLabel(w.cats[0])) + '</span><span>' + w.dur + '</span></span></span>';
    art.append(btn); return art;
  }
  /* trilha = metade A + metade B idênticas; a animação anda -50% e recomeça sem salto */
  let visible = new Set(), userPaused = false, carSeen = false, carHold = false, holdTimer = 0;
  const vids = () => $$('video', track);
  const allowed = () => !reduce && carSeen && !userPaused && !carHold && !document.hidden;
  function vSync(v) {
    if (allowed() && visible.has(v)) {
      if (!v.getAttribute('src')) v.src = v.dataset.preview;
      v.muted = true;
      v.playsInline = true;
      v.loop = true;
      const start = () => v.play().then(() => v.classList.add('on')).catch(() => {});
      if (v.readyState >= 2) start();
      else v.addEventListener('canplay', start, { once: true });
    } else {
      v.pause(); v.classList.remove('on');
      if (!visible.has(v) && v.getAttribute('src')) { v.removeAttribute('src'); v.load(); }
    }
  }
  const carSync = () => vids().forEach(vSync);
  const vObs = new IntersectionObserver(es => es.forEach(e => { e.isIntersecting ? visible.add(e.target) : visible.delete(e.target); vSync(e.target); }), { rootMargin: '0px 140px 0px 140px' });
  function build() {
    vids().forEach(v => vObs.unobserve(v)); visible = new Set(); track.textContent = '';
    D.WORKS.forEach(w => track.append(slide(w, false)));
    const base = track.scrollWidth || 1, reps = Math.max(1, Math.ceil((outer.clientWidth || innerWidth) / base));
    for (let i = 1; i < reps; i++) D.WORKS.forEach(w => track.append(slide(w, true)));
    const half = $$('[data-slide]', track).length;
    for (let i = 0; i < half; i++) track.append(slide(D.WORKS[i % D.WORKS.length], true));
    track.style.setProperty('--dur', Math.round((track.scrollWidth / 2) / 45) + 's');   /* ~45 px/s */
    vids().forEach(v => vObs.observe(v));
  }
  if (reduce) { outer.tabIndex = 0; outer.setAttribute('role', 'region'); outer.setAttribute('aria-label', 'Reel de edições (role para o lado)'); }   /* sem cards focáveis, a faixa rolável precisa ser alcançável pelo teclado */
  build();
  let rz = 0, lastW = innerWidth; addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => { if (Math.abs(innerWidth - lastW) > 40) { lastW = innerWidth; build(); } }, 250); }, { passive: true });
  new IntersectionObserver(es => { carSeen = es[0].isIntersecting; car.classList.toggle('is-offscreen', !carSeen); carSync(); }, { threshold: 0.05 }).observe(car);
  carStop = () => { carHold = true; car.classList.add('is-hold'); carSync(); };
  carResume = () => { carHold = false; car.classList.remove('is-hold'); carSync(); };
  pauseBtn.addEventListener('click', () => { userPaused = !userPaused; pauseBtn.setAttribute('aria-pressed', String(userPaused)); car.classList.toggle('is-paused', userPaused); carSync(); });
  /* mouse: pausa o movimento enquanto o ponteiro está sobre o reel (só mouse, para não grudar no toque) */
  outer.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') car.classList.add('is-hover'); });
  outer.addEventListener('pointerleave', () => car.classList.remove('is-hover'));
  /* toque: segura o movimento por 3 s para dar para tocar no card */
  outer.addEventListener('pointerdown', e => { if (e.pointerType === 'touch') { car.classList.add('is-hold'); clearTimeout(holdTimer); holdTimer = setTimeout(() => { if (!carHold) car.classList.remove('is-hold'); }, 3000); } }, { passive: true });
  /* foco por teclado traz o card à vista (o container rola); ao sair, volta ao início do movimento */
  outer.addEventListener('focusout', e => { if (!outer.contains(e.relatedTarget)) outer.scrollLeft = 0; });

  /* ── RESULTADO: YouTube ─────────────────────────────── */
  function ytCard(y) {
    const li = el('li', 'yt-card'); li.dataset.cats = y.cats.join(' ');
    const btn = el('button', 'yt-open'); btn.type = 'button'; btn.setAttribute('data-open', ''); btn.setAttribute('aria-label', 'Assistir no YouTube: ' + y.title);
    btn.innerHTML = '<span class="yt-thumb"><img src="https://i.ytimg.com/vi/' + y.id + '/hqdefault.jpg" alt="" width="480" height="360" loading="lazy" decoding="async"><span class="work-play">' + ICON.play + '</span></span>' +
      '<span class="yt-title">' + esc(y.title) + '</span><span class="yt-sub">YouTube</span>';
    btn.addEventListener('click', () => openModal({ kind: 'yt', id: y.id, title: y.title }, btn));
    const im = $('img', btn); im.addEventListener('error', () => im.remove());
    li.append(btn); return li;
  }
  D.YOUTUBE.forEach(y => ytGrid.append(ytCard(y)));

  const chipBox = $('#chips'), ytMore = $('#ytMore'), ytEmpty = $('#ytEmpty');
  const YT_VISIBLE = 6; let ytExpanded = false;
  function applyFilter(id) {
    $$('.chip', chipBox).forEach(c => c.setAttribute('aria-pressed', String(c.dataset.id === id)));
    const yts = $$('.yt-card', ytGrid); let n = 0;
    yts.forEach(c => {
      const match = id === 'all' || c.dataset.cats.split(' ').includes(id);
      const show = match && (id !== 'all' || ytExpanded || n < YT_VISIBLE); if (match) n++; c.hidden = !show;
    });
    ytEmpty.hidden = n > 0;
    ytMore.parentElement.hidden = !(id === 'all' && yts.length > YT_VISIBLE);
    $('#chipStatus').textContent = n ? 'Mostrando ' + $$('.yt-card:not([hidden])', ytGrid).length + ' vídeos do YouTube.' : 'Nenhum vídeo do YouTube nesta categoria.';
  }
  const all = [{ id: 'all', label: 'Todos' }, ...D.categories.filter(c => D.YOUTUBE.some(y => y.cats.includes(c.id)))];
  all.forEach(c => {
    const b = el('button', 'chip', esc(c.label)); b.type = 'button'; b.dataset.id = c.id; b.setAttribute('aria-pressed', 'false');
    b.addEventListener('click', () => applyFilter(c.id)); chipBox.append(b);
  });
  const ytMoreLabel = () => { ytMore.textContent = ytExpanded ? 'Ver menos' : 'Ver todos os ' + D.YOUTUBE.length + ' vídeos'; };
  ytMore.addEventListener('click', () => { ytExpanded = !ytExpanded; ytMoreLabel(); ytMore.setAttribute('aria-expanded', String(ytExpanded)); applyFilter('all'); });
  ytMoreLabel(); applyFilter('all');
  document.addEventListener('click', e => { const a = e.target.closest('[data-filter]'); if (a) applyFilter(a.dataset.filter); });

  /* ── MOTION ──────────────────────────────────────────── */
  const mg = $('#motionGrid');
  if (mg) D.MOTION.forEach(m => {
    const w = D.WORKS.find(x => x.id === m.work); if (!w) return;
    const fig = el('figure', 'motion-card reveal'); const btn = el('div', 'work-view');   /* vitrine, sem clique nem modal */
    btn.innerHTML = '<span class="work-media"><img src="' + w.poster + '" alt="" width="960" height="540" loading="lazy" decoding="async"><video muted loop playsinline preload="none" tabindex="-1" aria-hidden="true" data-preview="' + w.preview + '"></video></span>';
    wirePreview(btn, $('video', btn));
    fig.append(btn, el('figcaption', '', '<h3>' + esc(m.title) + '</h3><p>' + esc(m.text) + '</p>'));
    mg.append(fig); if (reduce) fig.classList.add('vis'); else rv.observe(fig);
  });

  /* ── AVALIAÇÕES (texto idêntico ao do Fiverr) ────────── */
  const rl = $('#reviewList');
  if (rl && FV) {
    const fmtScore = n => String(n).replace('.', ',');
    const fmtDate = d => new Date(d + 'T12:00:00').toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }).replace('.', '');
    FV.reviews.forEach((r, i) => {
      const f = el('figure', 'review' + (r.score < 4 ? ' is-low' : '')); f.dataset.user = r.user; f.dataset.score = r.score;
      f.innerHTML = '<span class="review-score">' + ICON.star + '<span aria-hidden="true">' + fmtScore(r.score) + '</span><span class="sr-only">Nota ' + fmtScore(r.score) + ' de 5</span></span>' +
        '<blockquote' + (r.lang === 'en' ? ' lang="en"' : '') + '>' + esc(r.text) + '</blockquote>' +
        '<figcaption><span>@' + esc(r.user) + '</span><span>' + esc(r.country) + '</span><span>' + fmtDate(r.date) + '</span><span>via Fiverr</span></figcaption>';
      if (i >= 6) f.hidden = true; rl.append(f);
    });
    const btn = $('#reviewMore'); let open = false;
    btn.textContent = 'Ver todas as ' + FV.reviews.length + ' avaliações';
    btn.addEventListener('click', () => {
      open = !open; $$('.review', rl).forEach((r, i) => { if (i >= 6) r.hidden = !open; });
      btn.textContent = open ? 'Ver menos' : 'Ver todas as ' + FV.reviews.length + ' avaliações'; btn.setAttribute('aria-expanded', String(open));
    });
    const d = new Date(FV.checkedAt + 'T12:00:00').toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
    $('#ratingDate').textContent = 'Dados do Fiverr conferidos em ' + d + '.';
  }

  /* ── DISCORD: copiar usuário ─────────────────────────── */
  const cp = $('#copyDiscord');
  if (cp) cp.addEventListener('click', async () => {
    const txt = cp.dataset.copy, msg = $('#copyMsg');
    try { await navigator.clipboard.writeText(txt); } catch (_) {
      const t = el('textarea'); t.value = txt; t.style.position = 'fixed'; t.style.opacity = '0'; document.body.append(t); t.select(); document.execCommand('copy'); t.remove();
    }
    msg.textContent = 'Usuário do Discord copiado: ' + txt; $('.cl span', cp).textContent = 'Copiado!';
    setTimeout(() => { $('.cl span', cp).textContent = 'Discord'; }, 2200);
  });
})();
