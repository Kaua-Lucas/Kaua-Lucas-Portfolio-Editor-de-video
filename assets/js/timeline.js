/* Régua de edição: navegação complementar (desktop). Funciona sem GSAP.
   - cada seção vira um "clipe" com largura proporcional à altura real da seção
   - o playhead marca a "linha de leitura" (vai do topo ao rodapé da tela conforme a rolagem)
   - o timecode mapeia a posição para um reel de 02:30 a 30 fps (decorativo; aria-hidden) */
(() => {
  const dock = document.getElementById('timeline');
  if (!dock) return;
  const track = dock.querySelector('.tl-track'), head = dock.querySelector('.tl-head'), tc = dock.querySelector('.tl-tc');
  const clips = [...dock.querySelectorAll('[data-tl-clip]')];
  const secs = clips.map(c => document.getElementById(c.dataset.target));
  if (secs.some(s => !s)) return;
  const REEL = 150, FPS = 30;
  let tops = [], docH = 1, trackW = 1, raf = 0, last = '';

  function layout() {
    const heights = secs.map(s => s.offsetHeight), total = heights.reduce((a, b) => a + b, 0) || 1;
    clips.forEach((c, i) => { c.style.flex = `${heights[i] / total} 1 0`; });
    docH = document.documentElement.scrollHeight; trackW = track.clientWidth || 1;
    tops = secs.map(s => s.getBoundingClientRect().top + scrollY);
    paint();
  }

  const pad = n => String(n).padStart(2, '0');
  const timecode = x => { const f = Math.round(x * REEL * FPS); return `${pad(Math.floor(f / (FPS * 3600)))}:${pad(Math.floor(f / (FPS * 60)) % 60)}:${pad(Math.floor(f / FPS) % 60)}:${pad(f % FPS)}`; };

  function paint() {
    raf = 0;
    const max = Math.max(1, docH - innerHeight), p = Math.min(1, Math.max(0, scrollY / max));
    const x = Math.min(1, Math.max(0, (scrollY + p * innerHeight) / docH));     /* linha de leitura */
    head.style.transform = `translate3d(${(x * trackW).toFixed(1)}px,0,0)`;
    const t = timecode(x); if (t !== tc.textContent) tc.textContent = t;
    tc.style.setProperty('--tc-x', x * trackW < 48 ? '0%' : x * trackW > trackW - 48 ? '-100%' : '-50%');
    const ft = document.querySelector('footer'); if (ft) dock.classList.toggle('is-away', ft.getBoundingClientRect().top < innerHeight - 8);   /* no rodapé a régua sai, para não parecer um segundo rodapé */
    const line = scrollY + p * innerHeight;
    let a = 0; tops.forEach((top, i) => { if (top <= line + 1) a = i; });
    const id = secs[a].id; if (id !== last) { last = id; clips.forEach((c, i) => c.classList.toggle('is-active', i === a)); }
  }
  const schedule = () => { if (!raf) raf = requestAnimationFrame(paint); };

  dock.addEventListener('click', e => {
    const c = e.target.closest('[data-tl-clip]'); if (!c) return;
    if (window.__motion && window.__motion.lenis) return;          /* Lenis cuida das âncoras (e do scroll-padding do nav) */
    e.preventDefault();
    const el = document.getElementById(c.dataset.target);
    scrollTo({ top: el.getBoundingClientRect().top + scrollY - (c.dataset.target === 'hero' ? 0 : 68), behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  });

  addEventListener('scroll', schedule, { passive: true });
  addEventListener('resize', layout, { passive: true });
  if ('ResizeObserver' in window) new ResizeObserver(() => layout()).observe(document.body);
  document.fonts && document.fonts.ready.then(layout);
  addEventListener('load', layout);
  layout();
})();
