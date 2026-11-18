# Portfólio — Kauã Lucas

Site estático (HTML + CSS + JS puro, sem build). Publicado na Vercel.

## Estrutura
```
index.html              marcação das 9 seções (02 tem o reel e a subseção #resultado), SEO, JSON-LD
assets/css/styles.css   tokens + componentes (decisões em design-system/MASTER.md)
assets/js/data.js       ⇐ EDITE AQUI: trabalhos, YouTube, motion, etapas do processo
assets/js/reviews.js    GERADO a partir de tests/fixtures/fiverr-reviews.json
assets/js/main.js       navegação, reel infinito, filtros do YouTube, modal, prévias, avaliações
assets/js/process.js    demonstração do processo
assets/js/timeline.js   régua de edição (navegação complementar, ≥1100px)
assets/js/motion.js     movimento: Lenis + GSAP (abertura, títulos, reveals, contadores, cursor)
assets/brand/           marca K Cortado (SVG/PNG/favicons) — ver docs/BRAND.md
assets/fonts/           fontes self-hosted (woff2, subset latin)
assets/vendor/          GSAP 3.15.1, ScrollTrigger, SplitText, Lenis 1.3.27 (locais, sem CDN)
tools/                  build-brand.py, build-og.mjs
assets/media/           prévias (.webm mudos), pôsteres (.webp), og.jpg
videos/ imgs/           mídia original (vídeos completos abrem só no modal)
tests/                  verificação automatizada (puppeteer-core + Chrome)
docs/                   AUDITORIA.md e plano de implementação
```

## Rodar local
```
python3 -m http.server 8080      # ou qualquer servidor estático
```

## Atualizar avaliações ou preços
1. Edite `tests/fixtures/fiverr-reviews.json` (texto e nota exatamente como no Fiverr).
2. `node tools/build-reviews.mjs` regenera `assets/js/reviews.js`.
3. Os preços ficam em `index.html` (seção `#contratar`, atributos `data-usd`). O teste confere com o fixture.
4. Atualize também o número em `#hero` e `#avaliacoes` (nota e quantidade).

## Adicionar um vídeo
Veja o comentário no topo de `assets/js/data.js` (comandos `ffmpeg` para prévia e pôster).

## Reel e RESULTADO
- Seção 02 ("REEL DE EDIÇÕES"): reel infinito dos vídeos locais (`WORKS` em `data.js`), sem categorias. A trilha tem duas metades idênticas e anda -50% por CSS (só `transform`). Só os vídeos visíveis carregam e tocam a prévia, sempre sem áudio; saindo da tela, o `src` é descarregado.
- Pausa: botão "Pausar movimento", mouse por cima, foco por teclado, modal aberto, toque (3 s) e quando o reel sai da tela. Com `prefers-reduced-motion` ele não gira nem toca e vira uma faixa rolável.
- Subseção `#resultado` ("VEJA O RESULTADO"): vídeos do YouTube (`YOUTUBE` em `data.js`) com os botões de categoria, que filtram só essa lista.

## Testes
```
cd tests && npm install && npm test        # 48 testes
node shots.mjs 375                          # screenshots por seção em tests/shots/
```
Requer Chrome (`CHROME_PATH` se não estiver em /usr/bin/google-chrome). As dependências são só de teste; o site não tem nenhuma em runtime.

## Movimento ("O Corte")
Regra única: o corte a 60° do K. Entradas por clip-path diagonal e deslize no eixo do corte, depois pausa. No máximo 1–2 coisas animando por tela.
- Progressive enhancement: o HTML já traz o conteúdo final. `html.mo` só existe se o visitante não pediu menos movimento; se o GSAP/Lenis não carregar, a marca é removida logo após o `load` (limite de 4 s).
- `prefers-reduced-motion`: sem Lenis, sem GSAP, sem cursor, reel vira faixa rolável, nada fica oculto.
- Lenis para quando o modal ou o menu mobile estão abertos; toque continua nativo. Âncoras usam `scroll-padding-top`.
- A régua inferior (`#timeline`) é decorativa/complementar (`aria-hidden`); o menu principal é o caminho acessível.
- O hero para o vídeo depois de 3 voltas (WCAG 2.2.2); o reel tem botão "Pausar movimento".
- Cache: `/assets/css|js` revalidam a cada acesso; fontes, vendor, brand e media ficam 30 dias (mude o nome do arquivo se trocar um deles).
