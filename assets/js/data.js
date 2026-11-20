// ───────────────────────────────────────────────────────────────
// CONTEÚDO EDITÁVEL DO PORTFÓLIO
// Para adicionar um trabalho: copie um objeto de WORKS, ajuste os
// campos e (se for vídeo local) gere prévia + pôster:
//   ffmpeg -ss 20 -t 6 -i videos/ARQUIVO.webm -an -vf scale=640:-2,fps=24 \
//     -c:v libvpx-vp9 -crf 38 -b:v 0 assets/media/previews/ID.webm
//   ffmpeg -ss 21 -i videos/ARQUIVO.webm -frames:v 1 -vf scale=960:-2 \
//     assets/media/posters/ID.webp
// Os títulos (works.<id>) ficam em assets/js/i18n/*.js e descrevem o que aparece
// no vídeo; troque por nomes de projeto quando o cliente autorizar.
// ───────────────────────────────────────────────────────────────
window.SITE_DATA = {
  // categorias usadas nos filtros (só aparecem as que têm pelo menos 1 vídeo). Rótulos: i18n, chave cat.<id>
  categories: [
    { id: 'games' }, { id: 'youtube' }, { id: 'highlights' }, { id: 'ritmo' }, { id: 'motion' },
  ],

  // Vídeos locais (arquivo completo abre no modal; prévia muda aparece no card)
  WORKS: [
    { id: 'conde', cats: ['games', 'motion'], dur: '2:54', featured: true, span: 6, src: 'videos/sr conde WEB.webm', poster: 'assets/media/posters/conde.webp', preview: 'assets/media/previews/conde.webm' },
    { id: 'daniel', cats: ['youtube'], dur: '1:31', featured: true, span: 6, src: 'videos/danielWEB.webm', poster: 'assets/media/posters/daniel.webp', preview: 'assets/media/previews/daniel.webm' },
    { id: 'compilado', cats: ['games'], dur: '2:11', span: 4, src: 'videos/compiladoWEB (2).webm', poster: 'assets/media/posters/compilado.webp', preview: 'assets/media/previews/compilado.webm' },
    { id: 'matt', cats: ['games'], dur: '2:24', span: 4, src: 'videos/mattWEB.webm', poster: 'assets/media/posters/matt.webp', preview: 'assets/media/previews/matt.webm' },
    { id: 'demo', cats: ['games', 'motion'], dur: '1:31', span: 4, src: 'videos/demonstracaoWEB.webm', poster: 'assets/media/posters/demo.webp', preview: 'assets/media/previews/demo.webm' },
    { id: 'titulo', cats: ['games'], dur: '0:51', span: 6, src: 'videos/título.webm', poster: 'assets/media/posters/titulo.webp', preview: 'assets/media/previews/titulo.webm' },
    { id: 'nii', cats: ['games', 'motion'], dur: '0:13', span: 6, src: 'videos/NII&LINEWEB.webm', poster: 'assets/media/posters/nii.webp', preview: 'assets/media/previews/nii.webm' },
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
  // adicione aqui com `tool: 'EffectCraft'` e crie motion.<id> nos dicionários.
  MOTION: [
    { work: 'conde' }, { work: 'nii' }, { work: 'demo' },
  ],

  // Demonstração do processo. ILUSTRATIVA: durações e trechos são de exemplo.
  // t / l são chaves de tradução (process.seg.*, process.broll.*, process.tx.*).
  PROCESS: {
    steps: ['organize', 'rough', 'review', 'narrative', 'broll', 'audio', 'captions', 'delivery'],   // textos: i18n, chave process.steps.<k>
    // d = duração em segundos [bruto, 1ª decupagem, 2ª análise]; 0 = removido
    segs: [
      { t: 'keep', d: [40, 40, 34] }, { t: 'silence', d: [20, 0, 0] }, { t: 'keep', d: [60, 60, 48], m: 1 }, { t: 'repeat', d: [30, 0, 0] },
      { t: 'keep', d: [50, 50, 42] }, { t: 'error', d: [15, 0, 0] }, { t: 'keep', d: [70, 70, 56], m: 1 }, { t: 'irrelevant', d: [45, 0, 0] },
      { t: 'keep', d: [55, 55, 46] }, { t: 'silence', d: [25, 0, 0] }, { t: 'keep', d: [65, 65, 52], m: 1 }, { t: 'repeat', d: [35, 0, 0] },
      { t: 'keep', d: [45, 45, 40] }, { t: 'irrelevant', d: [30, 0, 0] }, { t: 'keep', d: [60, 60, 50], m: 1 },
    ],
    broll: [{ seg: 2, a: 0.2, len: 0.5, l: 'illustration' }, { seg: 6, a: 0.3, len: 0.4, l: 'image' }, { seg: 10, a: 0.1, len: 0.5, l: 'extra' }, { seg: 14, a: 0.4, len: 0.4, l: 'graphic' }],
    tx: [{ seg: 0, a: 0.1, len: 0.5, l: 'title' }, { seg: 6, a: 0.1, len: 0.3, l: 'highlight' }, { seg: 12, a: 0.2, len: 0.5, l: 'text' }],
  },
};
