# Auditoria do portfólio (14/11/2026)

Fontes comparadas: repositório `Kaua-Lucas/Kaua-Lucas-Portfolio-Editor-de-video` (clone raso), site publicado em `portfolio-editor-de-video.vercel.app`, o experimento `index1.html` e os dados atuais do Fiverr (perfil, gigs e 18 avaliações). O site publicado e o `index.html` do repositório eram equivalentes na estrutura; o `index1.html` trazia o processo com linha do tempo, filtro por nicho e a lista de serviços, que **não** estavam no site publicado.

## O que existia
Página única (~1.300 linhas, CSS e JS inline), fontes Bebas Neue / DM Sans / Space Mono, Vercel estático, sem dependências. 7 vídeos locais (.webm, 82 MB no total), 9 vídeos do YouTube, 1 foto.

## Problemas encontrados
| # | Área | Problema | Resolução |
|---|---|---|---|
| 1 | Performance | Carrossel carregava 12 vídeos (6 + 6 clones) de 3 a 17 MB; hero baixava um .webm de 15 MB | Prévias mudas de 6–10 s (≈0,3–0,5 MB), pôsteres em webp, vídeo completo só no modal. 1ª tela: 650–750 KB |
| 2 | Comercial | Preço do Básico era US$15; no Fiverr está US$20 (Padrão US$25 e Premium US$35 conferem) | Preços do Fiverr, com data da conferência |
| 3 | Comercial | Prazos (5/6/7 dias), "3 revisões", "legendas", "color grading", "thumbnail" e "mais popular" não constam na gig | Removidos. Mantido só o que a gig descreve |
| 4 | Prova social | Nota 4,8 e "7 avaliações"; no Fiverr são 4,7 em 18. Rótulos "Pacote Básico/Premium" por avaliação não existem nos dados | Todas as 18 avaliações com texto, nota e usuário idênticos ao Fiverr; rótulos removidos |
| 5 | Estatísticas | "15+ projetos" e "100% entrega" sem fonte | Removidas. Entra a nota real do Fiverr |
| 6 | Conteúdo | Títulos dos vídeos do YouTube eram inventados ("Free Fire — Kill Compilation", "Epic Montage"…) e 5 vídeos tinham o mesmo nome | Títulos reais do YouTube; categorias deduzidas do título |
| 7 | Contato | Link do Discord `discord.com/users/esmaaisk` não funciona (exige ID numérico) | Botão que copia o usuário |
| 8 | Navegação | Menu escondido no celular (sem alternativa); `mix-blend-mode: difference` no nav; sem link de pular | Menu mobile acessível, nav sólido com blur, skip link |
| 9 | Acessibilidade | Vídeos de carrossel sem pausa; foco do modal; sem `prefers-reduced-motion` no JS; cinza #444 em texto | Dialog nativo, foco devolvido, movimento reduzido respeitado, contrastes revisados |
| 10 | SEO | Sem description, Open Graph, canonical, JSON-LD, robots, sitemap | Adicionados |
| 11 | Código | CSS/JS inline; efeito de brilho do cursor consumindo CPU; marquee repetindo o hero | Arquivos separados, tokens; brilho e marquee removidos (sem função) |
| 12 | Fontes | `preconnect` só para googleapis | Também para gstatic |
| 13 | Processo | No site publicado, o bloco de etapas mostrava estados como tarefas pendentes | Substituído pela demonstração de 8 etapas, rotulada como ilustrativa |

## Preservado
Identidade (preto, verde-limão, roxo, Bebas Neue), os 7 vídeos e a foto, o modal de vídeo, os filtros por nicho (do index1), a linha do tempo do processo (do index1), os links do Fiverr e do Instagram, o texto "Brasil" no rodapé.

## Pendências que dependem do Kauã
- Projetos reais do **EffectCraft**: a seção Motion usa trechos de vídeos já existentes (overlay, avatar, abertura). Para incluir os projetos em si, exportar em .webm e adicionar em `MOTION`/`WORKS` (`assets/js/data.js`).
- Um **projeto real para o Processo** (bruto → final, com durações reais). Enquanto isso a demonstração fica marcada como ilustrativa.
- Nomes de projeto/cliente: os títulos dos vídeos locais descrevem o que aparece na tela. Nenhum nome de cliente foi publicado.
- Vídeos do YouTube com título genérico ("Gameplay") e um com erro de digitação ("filososfia") no próprio YouTube: vale renomear lá.
- Exemplos de **stream highlights** e **Shorts/Reels/TikTok** verticais: hoje só há um highlights (YouTube) e nenhum vertical identificado.
