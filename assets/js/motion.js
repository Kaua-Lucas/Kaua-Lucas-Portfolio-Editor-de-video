/* Camada de movimento "O Corte" — Lenis + GSAP (progressive enhancement).
   Regras: só roda sem prefers-reduced-motion; se algo falhar, a página volta ao normal (conteúdo sempre visível).
   Vocabulário: corte (clip-path a 60°), deslize (ao longo do eixo do corte), segura. */
(() => {
  const root = document.documentElement;
  const api = window.__motion = { ready: false, lenis: null, reelRate: () => 1 };
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;       /* sem Lenis, sem GSAP, sem classe .mo */
  if (!window.gsap || !window.ScrollTrigger || !window.SplitText || !window.Lenis) return;   /* o script inline remove .mo em 4 s */

  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const TAN = 0.57735;                                                       /* tan 30° → dx por dy de uma linha a 60° */
  const fine = () => matchMedia('(pointer: fine)').matches;

  function init() {
    gsap.registerPlugin(ScrollTrigger, SplitText);
    ScrollTrigger.config({ ignoreMobileResize: true });

    /* ── Lenis: rolagem com inércia curta; toque continua nativo ── */
    const lenis = new Lenis({ lerp: 0.1, smoothWheel: true, anchors: true, stopInertiaOnNavigate: true });
    api.lenis = lenis;
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(t => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    const watch = (el, attr, fn) => el && new MutationObserver(fn).observe(el, { attributes: true, attributeFilter: [attr] });
    const modal = $('#videoModal'), toggle = $('#navToggle');
    const sync = () => { (modal && modal.open) || (toggle && toggle.getAttribute('aria-expanded') === 'true') ? lenis.stop() : lenis.start(); };
    watch(modal, 'open', sync); watch(toggle, 'aria-expanded', sync);

    /* ── estados iniciais (antes de liberar a página: nada pisca) ── */
    const nameLines = $$('.hero-name > span:not(.sr-only)');
    const heroSplit = SplitText.create(nameLines, { type: 'chars', mask: 'chars', charsClass: 'char', aria: 'auto' });
    const logoParts = { s: $('.nav .logo .k-s'), u: $('.nav .logo .k-u'), l: $('.nav .logo .k-l') };
    const intro = [$('#hero .eyebrow'), $('.hero-lead'), $('.hero-cta'), $('.hero-proof'), $('.scope')].filter(Boolean);
    const media = null;
    const cutShape = (el, x) => { const s = (el.offsetHeight / Math.max(1, el.offsetWidth)) * TAN * 100; return `polygon(${-s}% 0%, ${x}% 0%, ${x - s}% 100%, ${-s}% 100%)`; };
    const cutOpen = el => (el.offsetHeight / Math.max(1, el.offsetWidth)) * TAN * 100 + 100;
    const generic = $$('.reveal').filter(e => !e.matches('.sec-head, [data-cut]') && !e.closest('[data-cut]'));
    const heads = $$('.sec-head');
    const cuts = $$('[data-cut]').filter(e => e !== media);

    gsap.set(heroSplit.chars, { yPercent: 110, xPercent: -60 });
    gsap.set(intro, { opacity: 0, y: 26 });
    gsap.set(logoParts.s, { scaleY: 0, transformOrigin: '50% 100%' });
    gsap.set(logoParts.u, { x: -TAN * 80, y: 80, opacity: 0 });
    gsap.set(logoParts.l, { x: -TAN * 80, y: -80, opacity: 0 });
    gsap.set(generic, { opacity: 0, y: 38 });
    heads.forEach(h => gsap.set($$('.sec-label, .sec-lead, .sec-num', h), { opacity: 0, y: 18 }));
    cuts.forEach(el => gsap.set(el, { clipPath: cutShape(el, 0) }));
    $$('[data-countto]').filter(el => el.closest('[aria-hidden="true"]')).forEach(el => { el.dataset.final = el.textContent.trim(); el.textContent = (0).toFixed(+el.dataset.decimals || 0).replace('.', ','); });

    window.__moReady = true; api.ready = true; root.classList.add('mo-ready');   /* libera a página já com os estados definidos */

    /* ── abertura: o nome entra pelo eixo do corte; a marca desliza para o lugar ── */
    const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
    tl.to(logoParts.s, { scaleY: 1, duration: 0.7, clearProps: 'transform' }, 0)
      .to(logoParts.u, { x: 0, y: 0, opacity: 1, duration: 0.8, clearProps: 'all' }, 0.12)
      .to(logoParts.l, { x: 0, y: 0, opacity: 1, duration: 0.8, clearProps: 'all' }, 0.2)
      .to(heroSplit.chars, { yPercent: 0, xPercent: 0, duration: 1, stagger: 0.04, clearProps: 'all' }, 0.1)
      .to(intro, { opacity: 1, y: 0, duration: 0.8, stagger: 0.09, clearProps: 'transform,opacity,visibility' }, 0.55);

    /* ── hero ao rolar: as duas linhas do nome deslizam em sentidos opostos, como as pernas do K ── */
    const st = { trigger: '#hero', start: 'top top', end: 'bottom top', scrub: 0.6 };
    if (nameLines[0]) gsap.to(nameLines[0], { xPercent: -6, ease: 'none', scrollTrigger: st });
    if (nameLines[1]) gsap.to(nameLines[1], { xPercent: 6, ease: 'none', scrollTrigger: st });

    /* ── títulos: linhas sobem por trás de uma máscara ── */
    heads.forEach(h => {
      const title = $('.sec-title', h);
      const meta = $$('.sec-label, .sec-lead, .sec-num', h);
      ScrollTrigger.create({ trigger: h, start: 'top 85%', once: true, onEnter: () => gsap.to(meta, { opacity: 1, y: 0, duration: 0.8, stagger: 0.08, ease: 'power3.out', clearProps: 'transform,opacity,visibility' }) });
      if (title) SplitText.create(title, {
        type: 'lines', mask: 'lines', linesClass: 'line', autoSplit: true, aria: 'auto',
        onSplit: self => gsap.from(self.lines, { yPercent: 108, duration: 1, ease: 'expo.out', stagger: 0.09, clearProps: 'all', scrollTrigger: { trigger: title, start: 'top 90%', once: true } })
      });
    });
    const big = $('.contact-big');
    if (big) SplitText.create(big, { type: 'lines', mask: 'lines', linesClass: 'line', autoSplit: true, aria: 'auto', onSplit: self => gsap.from(self.lines, { yPercent: 108, duration: 1, ease: 'expo.out', stagger: 0.1, clearProps: 'all', scrollTrigger: { trigger: big, start: 'top 88%', once: true } }) });

    /* ── blocos: entram em lote; fotos e painéis entram com o corte ── */
    ScrollTrigger.batch(generic, { start: 'top 90%', once: true, onEnter: els => gsap.to(els, { opacity: 1, y: 0, duration: 0.9, stagger: 0.09, ease: 'power3.out', clearProps: 'transform,opacity,visibility' }) });
    cuts.forEach(el => ScrollTrigger.create({ trigger: el, start: 'top 88%', once: true, onEnter: () => gsap.to(el, { clipPath: cutShape(el, cutOpen(el)), duration: 1.2, ease: 'power3.inOut', clearProps: 'clipPath' }) }));

    /* ── contadores com valor real ── */
    $$('[data-countto]').filter(el => el.closest('[aria-hidden="true"]')).forEach(el => {
      const to = parseFloat(el.dataset.countto), dec = +el.dataset.decimals || 0, o = { v: 0 };
      ScrollTrigger.create({ trigger: el, start: 'top 92%', once: true, onEnter: () => gsap.to(o, { v: to, duration: 1.5, delay: 0.5, ease: 'power2.out', onUpdate: () => { el.textContent = o.v.toFixed(dec).replace('.', ','); }, onComplete: () => { el.textContent = el.dataset.final; } }) });
    });

    /* ── reel acelera com a velocidade da rolagem ── */
    const car = $('#trabalhos [data-carousel]'), trackEl = car && $('[data-track]', car);
    let anim = null, rate = 1;
    gsap.ticker.add(() => {
      if (!trackEl) return;
      anim = anim && anim.effect && anim.effect.target === trackEl ? anim : (trackEl.getAnimations().find(a => a.animationName === 'reel') || null);
      const off = car.classList.contains('is-offscreen');
      const target = off ? 1 : 1 + Math.min(Math.abs(lenis.velocity) * 0.12, 6);
      rate = off ? 1 : rate + (target - rate) * 0.12;                         /* fora da tela: volta ao normal, nunca fica "congelado" acelerado */
      if (Math.abs(rate - 1) < 0.04) rate = 1;
      const q = Math.round(rate * 20) / 20;                                  /* passos de 0,05: poucas escritas, sem travar o compositor */
      if (anim && Math.abs(anim.playbackRate - q) > 0.0499) anim.updatePlaybackRate(q);
    });
    api.reelRate = () => (anim ? anim.playbackRate : 1);

    /* ── rodapé: a marca se monta com a rolagem ── */
    const fm = $$('#footMark path');
    if (fm.length === 3) {
      const ft = gsap.timeline({ scrollTrigger: { trigger: 'footer', start: 'top 92%', end: 'bottom bottom', scrub: 0.5 }, defaults: { ease: 'none' } });
      ft.fromTo(fm[0], { scaleY: 0.2, transformOrigin: '50% 100%' }, { scaleY: 1 }, 0)
        .fromTo(fm[1], { x: -TAN * 120, y: 120 }, { x: 0, y: 0 }, 0)
        .fromTo(fm[2], { x: -TAN * 120, y: -120 }, { x: 0, y: 0 }, 0);
    }

    /* ── só com mouse: cursor-contexto e botões magnéticos ── */
    let cur = null, on = false, qx, qy;
    const ensure = () => {
      cur = document.createElement('div'); cur.className = 'cursor'; cur.setAttribute('aria-hidden', 'true'); cur.textContent = 'VER'; document.body.append(cur);
      gsap.set(cur, { xPercent: -50, yPercent: -50, scale: 0.4, autoAlpha: 0 });
      qx = gsap.quickTo(cur, 'x', { duration: 0.35, ease: 'power3' }); qy = gsap.quickTo(cur, 'y', { duration: 0.35, ease: 'power3' });
      root.classList.add('has-cursor');
    };
    const show = v => { if (v === on) return; on = v; gsap.to(cur, { scale: v ? 1 : 0.4, autoAlpha: v ? 1 : 0, duration: 0.25, overwrite: 'auto' }); };
    document.addEventListener('pointermove', e => {
      if (e.pointerType !== 'mouse') return;
      if (!cur) ensure();
      qx(e.clientX); qy(e.clientY);
      show(!!e.target.closest('.yt-open') && !(modal && modal.open));
    }, { passive: true });
    root.addEventListener('mouseleave', () => cur && show(false));
    $$('.btn-primary, .cc.primary').forEach(el => {
      const mx = gsap.quickTo(el, 'x', { duration: 0.5, ease: 'power3' }), my = gsap.quickTo(el, 'y', { duration: 0.5, ease: 'power3' });
      el.addEventListener('pointermove', e => { if (e.pointerType !== 'mouse') return; const r = el.getBoundingClientRect(); mx((e.clientX - r.left - r.width / 2) * 0.22); my((e.clientY - r.top - r.height / 2) * 0.3); });
      el.addEventListener('pointerleave', () => { mx(0); my(0); });
    });

    /* ── layout muda quando fontes e imagens chegam ── */
    document.fonts && document.fonts.ready.then(() => ScrollTrigger.refresh());
    addEventListener('load', () => ScrollTrigger.refresh());
    /* filtros, "ver mais" e etapas do processo mudam a altura da página: os gatilhos precisam acompanhar */
    if ('ResizeObserver' in window) { let h = document.body.offsetHeight, t = 0; new ResizeObserver(() => { clearTimeout(t); t = setTimeout(() => { if (Math.abs(document.body.offsetHeight - h) > 2) { h = document.body.offsetHeight; ScrollTrigger.refresh(); } }, 150); }).observe(document.body); }
  }

  try { init(); } catch (err) {
    /* falha em qualquer etapa: devolve a página ao estado normal */
    console.warn('motion: desativado —', err && err.message);
    root.classList.remove('mo', 'mo-ready'); api.ready = false;
    try { api.lenis && api.lenis.destroy(); gsap.killTweensOf('*'); ScrollTrigger.getAll().forEach(t => t.kill()); } catch (e) { /* nada */ }
    document.querySelectorAll('[style]').forEach(el => { if (/visibility|opacity|clip-path|transform/.test(el.getAttribute('style') || '') && !el.closest('.car, #videoModal, svg')) el.removeAttribute('style'); });
  }
})();
