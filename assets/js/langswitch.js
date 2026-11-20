/* Seletor de idioma do cabeçalho (globo + sigla). Monta o menu a partir de I18N.languages,
   então um idioma novo aparece aqui sozinho. Padrão de menu acessível: botão com aria-expanded,
   itens role="menuitemradio", setas/Home/End, Esc devolve o foco ao botão. */
(() => {
  'use strict';
  const I = window.I18N, box = document.getElementById('lang');
  if (!I || !box) return;
  const btn = document.getElementById('langBtn'), menu = document.getElementById('langMenu'), code = document.getElementById('langCode');
  const navToggle = document.getElementById('navToggle'), navMenu = document.getElementById('navMenu');
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  /* bandeiras simplificadas em SVG (o emoji de bandeira não aparece no Windows) */
  const FLAGS = {
    br: '<rect width="20" height="14" fill="#009c3b"/><path d="M10 1.6 18.4 7 10 12.4 1.6 7z" fill="#ffdf00"/><circle cx="10" cy="7" r="3" fill="#002776"/>',
    us: '<rect width="20" height="14" fill="#fff"/><path d="M0 0h20v2H0zM0 4h20v2H0zM0 8h20v2H0zM0 12h20v2H0z" fill="#b22234"/><rect width="9" height="8" fill="#3c3b6e"/><path d="M1.6 1.6h.8M4.4 1.6h.8M7.2 1.6h.8M3 3.6h.8M5.8 3.6h.8M1.6 5.6h.8M4.4 5.6h.8M7.2 5.6h.8" stroke="#fff" stroke-width=".8"/>',
    es: '<rect width="20" height="14" fill="#aa151b"/><rect y="3.5" width="20" height="7" fill="#f1bf00"/>',
  };
  const flag = f => '<svg class="lang-flag" viewBox="0 0 20 14" aria-hidden="true" focusable="false">' + (FLAGS[f] || '') + '</svg>';
  const CHECK = '<svg class="i lang-check" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>';

  menu.innerHTML = I.languages.map(l =>
    '<button class="lang-opt" type="button" role="menuitemradio" aria-checked="false" tabindex="-1" data-lang="' + l.code + '" lang="' + l.code + '">' + flag(l.flag) + '<span class="lang-name">' + esc(l.name) + '</span>' + CHECK + '</button>'
  ).join('') +
    '<div class="lang-sep" role="separator"></div>' +
    '<button class="lang-opt lang-auto" type="button" role="menuitemcheckbox" aria-checked="false" tabindex="-1" data-auto data-i18n="lang.auto">' + esc(I.t('lang.auto')) + '</button>' +
    '<p class="lang-note" id="langNote" role="status" hidden></p>';
  const items = () => [...menu.querySelectorAll('.lang-opt')];
  const note = menu.querySelector('#langNote');
  let noteTimer = 0;

  function paint() {
    const m = I.meta(I.lang) || I.meta(I.base);
    code.textContent = m.short;
    btn.setAttribute('aria-label', m.short + ' — ' + I.t('lang.button', { name: m.name }));   /* o nome acessível começa pelo texto visível (WCAG 2.5.3) */
    items().forEach(o => o.setAttribute('aria-checked', String(o.hasAttribute('data-auto') ? I.source === 'auto' : o.dataset.lang === I.lang)));
  }

  const isOpen = () => !menu.hidden;
  function open(focusFirst) {
    if (navMenu && navMenu.classList.contains('open') && navToggle) navToggle.click();   /* só um menu aberto por vez no celular */
    menu.hidden = false; btn.setAttribute('aria-expanded', 'true'); box.classList.add('is-open');
    const list = items();
    (focusFirst === 'last' ? list[list.length - 1] : list.find(o => o.getAttribute('aria-checked') === 'true' && !o.hasAttribute('data-auto')) || list[0]).focus();
  }
  function close(back) {
    if (!isOpen()) return;
    menu.hidden = true; btn.setAttribute('aria-expanded', 'false'); box.classList.remove('is-open');
    if (back) btn.focus();
  }
  function showNote(msg) {
    note.textContent = msg; note.hidden = false; clearTimeout(noteTimer);
    noteTimer = setTimeout(() => { note.hidden = true; }, 5000);
  }

  async function choose(o) {
    note.hidden = true; box.classList.add('is-busy'); btn.setAttribute('aria-busy', 'true');
    let ok;
    try { ok = o.hasAttribute('data-auto') ? (await I.auto(), true) : await I.set(o.dataset.lang); } catch (_) { ok = false; }
    box.classList.remove('is-busy'); btn.removeAttribute('aria-busy');
    if (ok) close(true); else showNote(I.t('lang.loadError', { name: (I.meta(I.lang) || I.meta(I.base)).name }));
  }

  btn.addEventListener('click', () => (isOpen() ? close(true) : open()));
  btn.addEventListener('keydown', e => {
    if (e.key === 'ArrowDown') { e.preventDefault(); if (!isOpen()) open(); else items()[0].focus(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); if (!isOpen()) open('last'); else items().pop().focus(); }
  });
  menu.addEventListener('click', e => { const o = e.target.closest('.lang-opt'); if (o) choose(o); });
  menu.addEventListener('keydown', e => {
    const list = items(), i = list.indexOf(document.activeElement);
    if (e.key === 'ArrowDown') { e.preventDefault(); list[(i + 1) % list.length].focus(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); list[(i - 1 + list.length) % list.length].focus(); }
    else if (e.key === 'Home') { e.preventDefault(); list[0].focus(); }
    else if (e.key === 'End') { e.preventDefault(); list[list.length - 1].focus(); }
    else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(true); }
    else if (e.key === 'Tab') close(false);
  });
  document.addEventListener('pointerdown', e => { if (isOpen() && !box.contains(e.target)) close(false); });
  document.addEventListener('focusin', e => { if (isOpen() && !box.contains(e.target)) close(false); });
  if (navToggle) navToggle.addEventListener('click', () => close(false));

  I.onState(paint); I.onChange(paint); paint();
  document.documentElement.classList.add('has-lang');   /* só mostra o seletor quando ele funciona */
})();
