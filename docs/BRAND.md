# Marca — K Cortado

**Ideia em uma frase:** um K cujas pernas são cortadas a 60° — o mesmo corte que o site usa como regra de movimento ("O Corte").
Foi escolhido o **conceito A (K Cortado)** entre os três estudados; B (Trilhas Cortadas) e C (Quadro Cortado) seguem como alternativas na prancha de conceitos.

## Geometria
- Grade 256×256, altura útil 224 (y 16→240). Todos os ângulos a 60° exatos (dx = altura / tan 60°).
- Três peças: haste (osso `#f5f5f0`), perna superior (lime `#c8f135`), perna inferior (roxo `#8b5cf6`). Vão entre as pernas = 12 u (18 u na versão pequena).
- SVGs só com `<path>`: sem `<text>`, imagem, filtro, máscara ou clipPath. O texto do lockup foi convertido em contornos (Bebas Neue).

## Arquivos (`assets/brand/`)
| Arquivo | Uso |
|---|---|
| `kl-mark.svg` | símbolo colorido (fundo escuro) |
| `kl-mark-black.svg` / `kl-mark-white.svg` | uma cor, fundos claros / escuros |
| `kl-mark-small.svg` | **16–32 px**: haste e pernas mais grossas, vão maior |
| `kl-logo-horizontal(.svg/-black/-white)` | símbolo + KAUÃ.LUCAS |
| `favicon.svg/.ico`, `favicon-16/32/48.png`, `apple-touch-icon.png`, `icon-192/512.png`, `icon-maskable-512.png` | navegador, iOS, manifest |
| `kl-parts.json` | caminhos das 3 peças (o site anima o rodapé e a abertura com elas) |
Regerar tudo: `python3 tools/build-brand.py` (precisa de `rsvg-convert` e Pillow). OG: `node tools/build-og.mjs`.

## Uso
- **Área de proteção:** largura da haste (60 u) em todos os lados.
- **Tamanho mínimo:** símbolo 16 px (usar `kl-mark-small.svg` abaixo de 32 px); lockup horizontal 96 px de largura.
- **Cor:** colorido só sobre `#0a0a0a`/`#121212`. Sobre fundo claro, usar a versão preta. **Lime sobre branco não é permitido** (contraste ≈1,2:1).
- **Uma cor:** preto ou branco, nunca lime sozinho.
- **Não fazer:** girar, esticar, trocar as cores das pernas, adicionar sombra/brilho, reduzir o vão, escrever o nome em outra fonte.

## Notas e limites
- Fontes: Bebas Neue, DM Sans e Space Mono são OFL (licenças em `assets/fonts/`); permitem uso em logo.
- **Não é liberação legal.** Antes de registrar ou investir em material impresso, fazer busca de marca (INPI no Brasil) e busca reversa de imagem.
- Testes feitos: renderização a 64/32/16 px, preto sobre branco, branco sobre preto, escala de cinza, verificação estrutural dos SVGs (ver `tests/site.test.mjs`).
