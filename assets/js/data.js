// ───────────────────────────────────────────────────────────────
// CONTEÚDO EDITÁVEL DO PORTFÓLIO
// Para adicionar um trabalho: copie um objeto de WORKS, ajuste os
// campos e (se for vídeo local) gere prévia + pôster:
//   ffmpeg -ss 20 -t 6 -i videos/ARQUIVO.webm -an -vf scale=640:-2,fps=24 \
//     -c:v libvpx-vp9 -crf 38 -b:v 0 assets/media/previews/ID.webm
//   ffmpeg -ss 21 -i videos/ARQUIVO.webm -frames:v 1 -vf scale=960:-2 \
//     assets/media/posters/ID.webp
// Os títulos abaixo descrevem o que aparece no vídeo; troque por nomes
// de projeto quando o cliente autorizar.
// ───────────────────────────────────────────────────────────────
window.SITE_DATA = {
  // categorias usadas nos filtros (só aparecem as que têm pelo menos 1 vídeo)
  categories: [
    { id: 'games', label: 'Games' },
    { id: 'youtube', label: 'YouTube' },
    { id: 'highlights', label: 'Highlights' },
    { id: 'ritmo', label: 'Ritmo e beat sync' },
    { id: 'motion', label: 'Motion' },
  ],

  // Vídeos locais (arquivo completo abre no modal; prévia muda aparece no card)
  WORKS: [
    { id: 'conde', title: 'Minecraft com overlay de interface', cats: ['games', 'motion'], dur: '2:54', featured: true, span: 6, src: 'videos/sr conde WEB.webm', poster: 'assets/media/posters/conde.webp', preview: 'assets/media/previews/conde.webm' },
    { id: 'daniel', title: 'Comentário com B-rolls de anime', cats: ['youtube'], dur: '1:31', featured: true, span: 6, src: 'videos/danielWEB.webm', poster: 'assets/media/posters/daniel.webp', preview: 'assets/media/previews/daniel.webm' },
    { id: 'compilado', title: 'Gameplay de terror com legendas', cats: ['games'], dur: '2:11', span: 4, src: 'videos/compiladoWEB (2).webm', poster: 'assets/media/posters/compilado.webp', preview: 'assets/media/previews/compilado.webm' },
    { id: 'matt', title: 'Terror com legendas coloridas', cats: ['games'], dur: '2:24', span: 4, src: 'videos/mattWEB.webm', poster: 'assets/media/posters/matt.webp', preview: 'assets/media/previews/matt.webm' },
    { id: 'demo', title: 'Reel de demonstração', cats: ['games', 'motion'], dur: '1:31', span: 4, src: 'videos/demonstracaoWEB.webm', poster: 'assets/media/posters/demo.webp', preview: 'assets/media/previews/demo.webm' },
    { id: 'titulo', title: 'Gameplay com webcam', cats: ['games'], dur: '0:51', span: 6, src: 'videos/título.webm', poster: 'assets/media/posters/titulo.webp', preview: 'assets/media/previews/titulo.webm' },
    { id: 'nii', title: 'Gameplay com avatar animado', cats: ['games', 'motion'], dur: '0:13', span: 6, src: 'videos/NII&LINEWEB.webm', poster: 'assets/media/posters/nii.webp', preview: 'assets/media/previews/nii.webm' },
  ],

  // Vídeos publicados no YouTube. Títulos conferidos no YouTube em 14/11/2026.
  YOUTUBE: [
    { id: 'YtU0kspTOSM', title: 'Venda de imóveis', cats: ['youtube'] },
    { id: '3f6bPSSR6No', title: 'Área de saúde', cats: ['youtube'] },
    { id: 'UJgr6Dq5aW4', title: 'GTA V (part1)', cats: ['games'] },
    { id: '9p1nuqNJA7g', title: 'Apresentação do canal', cats: ['youtube'] },
    { id: '8Q6gq_Hfnic', title: 'Video demonstração jogo de tiro', cats: ['games'] },
    { id: 'BpdDvB5bqQU', title: 'Vídeo promocional', cats: ['youtube'] },
    { id: '1zsSh3UaGTU', title: 'Filosofia — anime', cats: ['youtube'] },
    { id: 'bRo6Nezca0I', title: 'Anime', cats: ['youtube'] },
    { id: 'JmGvjzg7Spo', title: 'Gameplay', cats: ['games'] },
    { id: '7fPIulej_cI', title: 'Gameplay', cats: ['games'] },
    { id: 'Vv3mjxGqcnI', title: 'Gameplay', cats: ['games'] },
    { id: 'qi2fQkn5_0A', title: 'Gameplay', cats: ['games'] },
    { id: 'Hm982iuA5Z8', title: 'Gameplay', cats: ['games'] },
    { id: '9Lfu_nJ2NV0', title: 'Histórias', cats: ['youtube'] },
    { id: 'eKsDG3bdM-E', title: 'Gameplay', cats: ['games'] },
    { id: 'DrvUUCnNVHo', title: 'Compilado dos melhores momentos editados', cats: ['highlights', 'games'] },
    { id: 'BPeeUh8YBbY', title: 'Batida no ritmo musical', cats: ['ritmo'] },
  ],

  // Seção Motion: só entram peças que existem de fato. Para incluir um
  // projeto do EffectCraft, exporte em .webm, gere prévia/pôster e
  // adicione aqui com `tool: 'EffectCraft'`.
  MOTION: [
    { work: 'conde', title: 'Overlay de interface sobre o gameplay', text: 'Elemento gráfico desenhado e animado para conversar com o jogo, não só colado por cima.' },
    { work: 'nii', title: 'Personagem animado em cena', text: 'Avatar ilustrado que reage ao que acontece no gameplay.' },
    { work: 'demo', title: 'Aberturas e gráficos de apoio', text: 'Animações de entrada e telas gráficas que dão identidade ao vídeo.' },
  ],

  // Demonstração do processo. ILUSTRATIVA: durações e trechos são de exemplo.
  PROCESS: {
    steps: [
      { tab: 'Organização dos arquivos', title: 'Organização dos arquivos', text: 'Antes de cortar, organizo tudo: pastas, nomes das takes e referências do cliente. Projeto grande sem organização vira retrabalho.', list: ['Pastas por tipo de material', 'Nomes claros nas takes', 'Briefing e referências abertos ao lado'] },
      { tab: 'Decupagem inicial', title: 'Decupagem inicial', text: 'Primeira passada pela gravação inteira. Tiro silêncios, repetições e erros e marco o que pode servir.', list: ['Silêncios e pausas longas fora', 'Repetições e erros de gravação fora', 'Trechos sem relevância descartados'] },
      { tab: 'Segunda análise editorial', title: 'Segunda análise editorial', text: 'Reviso só o que sobrou, agora com olhar de espectador: este trecho ajuda a história ou só ocupa tempo?', list: ['Redundâncias que sobraram', 'Continuidade e ritmo da fala', 'Transições entre as frases'] },
      { tab: 'Construção da narrativa', title: 'Construção da narrativa', text: 'Ordem, ritmo e pausas. Marco as mudanças de assunto e decido onde o vídeo respira e onde acelera.', list: ['Marcadores de mudança de assunto', 'Abertura e gancho', 'Ritmo entre os blocos'] },
      { tab: 'B-rolls e elementos visuais', title: 'B-rolls e elementos visuais', text: 'A fala ganha apoio onde precisa: imagem, gráfico, texto de destaque ou animação. Cada elemento tem uma função.', list: ['B-rolls e imagens de apoio', 'Textos de destaque e gráficos', 'O preview sai do apresentador quando o B-roll entra'] },
      { tab: 'Tratamento de áudio', title: 'Tratamento de áudio', text: 'Voz nivelada e limpa, música e efeitos sonoros por baixo da fala, não por cima.', list: ['Nivelamento e limpeza da voz', 'Trilha e efeitos sonoros', 'Mixagem final'] },
      { tab: 'Legendas e finalização', title: 'Legendas e finalização', text: 'Legendas sincronizadas, zooms e ajustes visuais para fechar a identidade do vídeo.', list: ['Legendas sincronizadas com a fala', 'Zooms, shakes e ajustes visuais', 'Revisão final do vídeo inteiro'] },
      { tab: 'Exportação e entrega', title: 'Exportação e entrega', text: 'Exporto no formato da plataforma e envio para você revisar. Ajustes são combinados antes do fechamento.', list: ['Formato e resolução da plataforma de destino', 'Entrega pelo Fiverr', 'Revisões até você ficar satisfeito'] },
    ],
    // d = duração em segundos [bruto, 1ª decupagem, 2ª análise]; 0 = removido
    segs: [
      { t: 'keep', d: [40, 40, 34] }, { t: 'silêncio', d: [20, 0, 0] }, { t: 'keep', d: [60, 60, 48], m: 1 }, { t: 'repetição', d: [30, 0, 0] },
      { t: 'keep', d: [50, 50, 42] }, { t: 'erro', d: [15, 0, 0] }, { t: 'keep', d: [70, 70, 56], m: 1 }, { t: 'sem relevância', d: [45, 0, 0] },
      { t: 'keep', d: [55, 55, 46] }, { t: 'silêncio', d: [25, 0, 0] }, { t: 'keep', d: [65, 65, 52], m: 1 }, { t: 'repetição', d: [35, 0, 0] },
      { t: 'keep', d: [45, 45, 40] }, { t: 'sem relevância', d: [30, 0, 0] }, { t: 'keep', d: [60, 60, 50], m: 1 },
    ],
    broll: [{ seg: 2, a: 0.2, len: 0.5, l: 'ilustração' }, { seg: 6, a: 0.3, len: 0.4, l: 'imagem' }, { seg: 10, a: 0.1, len: 0.5, l: 'vídeo extra' }, { seg: 14, a: 0.4, len: 0.4, l: 'gráfico' }],
    tx: [{ seg: 0, a: 0.1, len: 0.5, l: 'título' }, { seg: 6, a: 0.1, len: 0.3, l: 'destaque' }, { seg: 12, a: 0.2, len: 0.5, l: 'texto' }],
  },
};
