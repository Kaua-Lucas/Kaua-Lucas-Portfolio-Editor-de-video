# Design System — Portfólio Kauã Lucas (fonte da verdade)

## Posicionamento
"Editor que decide o que fica no corte." Público prioritário: criadores de conteúdo de games, streamers e canais pequenos/médios no Brasil e em Portugal, mais clientes de língua inglesa via Fiverr. Diferencial: decisão editorial + capacidade de construir elementos visuais sob medida (programação). IA é ferramenta de apoio, nunca a identidade.

## Estilo (ui-ux-pro-max: Agência criativa / Portfólio pessoal / Jogos)
- Manda: **Editorial escuro com movimento contido** (Minimalism + Motion-driven). Justificativa: o conteúdo é vídeo; a interface precisa sumir e deixar o trabalho protagonista, com personalidade vinda de tipografia, não de efeitos.
- Anti-padrões: gradiente roxo/rosa genérico, cards sem hierarquia, 3D, brilho que segue o cursor, emoji como ícone, tema "SaaS".

## Tokens
| Token | Valor | Uso |
|---|---|---|
| --bg | #0A0A0A | fundo base |
| --surface | #121212 / #181818 | superfícies |
| --text | #F5F5F0 | texto principal (≈18:1) |
| --text-2 | #A8A8A2 | texto secundário (≈8:1) |
| --lime | #C8F135 | acento primário, CTA, foco |
| --purple | #8B5CF6 | acento secundário (formas, bordas) |
| --purple-text | #B7A0FB | roxo para texto pequeno (≥4.5:1) |
| --line | rgba(255,255,255,.10) | divisórias |
Texto sobre --lime usa --bg (≈15:1). Cinza #444 do projeto antigo não é usado para texto.

## Tipografia (mantida da identidade)
Self-hosted em `assets/fonts` (sem Google Fonts). Bebas Neue (display, caixa alta) · DM Sans (corpo 16–18px, line-height 1.6) · Space Mono (rótulos, 11–13px, caixa alta, tracking 0.12em). `font-display: swap`, preload só de Bebas e DM Sans. Escala fluida com `clamp()`.

## Espaço, raio, camadas
Escala 4/8 (4,8,12,16,24,32,48,64,96,128). Raio 2px (botões/cards: pouco arredondamento = editorial). Container 1200px. z-index: 0 conteúdo, 10 nav, 100 menu, 1000 modal.

## Marca
K Cortado (docs/BRAND.md): haste osso + pernas lime/roxo cortadas a 60°. O ângulo de 60° é a base de todo o movimento.

## Movimento (revisado: "O Corte")
Vocabulário: corte (clip-path a 60°), deslize (ao longo do eixo do corte), segura. Lenis (lerp 0,1) + GSAP/ScrollTrigger/SplitText locais. Máx. 1–2 animações por vista; nunca bloquear leitura; sem conteúdo essencial só por animação.
Base: só `transform`/`opacity`. Micro 150–250ms, entrada de seção 500ms, easing `cubic-bezier(.2,.8,.2,1)`. Nada anima sozinho em loop exceto prévias de vídeo mudas visíveis. `prefers-reduced-motion`: sem transições de entrada, sem prévias automáticas, demonstração do processo só manual.

## Componentes
Botão primário (lime), secundário (contorno), chip de filtro (toggle com aria-pressed), card de trabalho (pôster + prévia + rótulos), linha de especialidade (número grande + texto), modal de vídeo (dialog), linha do tempo do processo (tablist), card de avaliação (blockquote), plano (3 colunas → 1).

## Responsivo
Mobile-first: 375 / 768 / 1024 / 1440. Navegação mobile em menu com aria-expanded. Alvos ≥44px. Sem scroll horizontal.

## Regras de conteúdo
Nada de números, preços, avaliações ou entregáveis sem fonte. Fonte comercial = gig no Fiverr (conferida em 2026-11-14). Dados ilustrativos sempre rotulados.
