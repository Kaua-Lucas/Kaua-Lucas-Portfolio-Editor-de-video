# Plano — Reformulação do portfólio

**Objetivo:** transformar o portfólio em apresentação profissional que converte visitantes em pedidos no Fiverr, sem inventar dados.
**Arquitetura:** site estático (HTML + CSS + JS puro, sem build e sem dependências em runtime), como já é publicado na Vercel. Migrar para framework não se justifica: uma página, sem estado complexo.
**Spec:** design-system/MASTER.md · **Auditoria:** docs/AUDITORIA.md

## Estrutura de arquivos
- index.html — marcação semântica das 9 seções, SEO, JSON-LD
- assets/css/styles.css — tokens + componentes
- assets/js/reviews.js — avaliações (gerado de tests/fixtures/fiverr-reviews.json por tools/build-reviews.mjs)
- assets/js/data.js — trabalhos, especialidades, planos, etapas do processo
- assets/js/main.js — nav, filtros, modal, prévias sob demanda, avaliações, cópia do Discord
- assets/js/process.js — demonstração do processo (portada de index1.html)
- assets/media/previews|posters — mídia leve gerada com ffmpeg a partir de videos/
- tests/site.test.mjs — verificação automatizada (puppeteer-core + Chrome)

## Tarefas
1. Testes primeiro (vermelho contra o index.html antigo): console limpo, sem overflow em 375/768/1440, âncoras válidas, alt em imagens, h1 único, links externos com rel, arquivos referenciados existem, avaliações idênticas ao fixture, nenhum preço US$15, modal abre/fecha com Esc e devolve foco, processo navegável por teclado, no máx. 3 vídeos tocando.
2. Mídia: pôsteres webp + prévias mudas (6–10 s) + vídeo completo só no modal (preload none).
3. CSS e HTML das seções 01–09.
4. JS: filtros, modal, prévia por hover/visibilidade, processo.
5. Verificação: rodar suíte, screenshots em 375/768/1440, medir peso da página inicial.

## Critérios de aceitação
Os 14 do briefing + peso inicial (HTML+CSS+JS+mídia crítica) < 1,5 MB e nenhum vídeo completo baixado antes de clique.
