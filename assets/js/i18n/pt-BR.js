/* Português (Brasil) — idioma base. O texto do index.html é idêntico a este (tests/i18n.test.mjs confere).
   Todos os idiomas têm exatamente as mesmas chaves. {nome} = valor inserido pelo código.
   Não traduzir (conteúdo real): títulos dos vídeos do YouTube (data.js) e textos das avaliações do Fiverr (reviews.js). */
(self.__i18nQ = self.__i18nQ || []).push(['pt-BR', {
  meta: {
    title: "Kauã Lucas — Editor de vídeo para games, YouTube e vídeos curtos",
    description: "Editor de vídeo e programador. Transformo gravações longas em vídeos com ritmo: gameplay, YouTube, highlights, Shorts, Reels, TikTok e motion design. Peça uma prévia pelo Fiverr.",
    ogTitle: "Kauã Lucas — Editor de vídeo",
    ogDescription: "Gameplay, YouTube, highlights, vídeos curtos e motion design. Veja os trabalhos e peça uma prévia pelo Fiverr.",
    ogImageAlt: "Kauã Lucas, editor de vídeo: marca K Cortado sobre fundo preto",
    ogLocale: "pt_BR"
  },
  a11y: { skip: "Pular para o conteúdo" },
  nav: {
    label: "Principal", home: "Kauã Lucas, início", menu: "Menu",
    start: "Início", work: "Trabalhos", specialties: "Especialidades", process: "Processo", motion: "Motion",
    reviews: "Avaliações", about: "Sobre", hire: "Contratar", contact: "Contato"
  },
  lang: {
    label: "Idioma", button: "Idioma. Atual: {name}", auto: "Detectar automaticamente",
    changed: "Idioma alterado para {name}.", loadError: "Não foi possível carregar o idioma. Mantendo {name}."
  },
  hero: {
    label: "Apresentação",
    eyebrow: "Disponível para projetos",
    srTitle: " — editor de vídeo para games, YouTube e vídeos curtos",
    lead: "Pego horas de gravação e entrego o vídeo que <b>fica no ar</b>: corte, ritmo, legenda e elementos visuais feitos sob medida.",
    ctaPrimary: "Pedir prévia no Fiverr →",
    ctaWork: "Ver trabalhos",
    proof: "<span class='star' aria-hidden='true'>★</span> <b data-countto='{scoreRaw}' data-decimals='1'>{score}</b> em {count} avaliações no Fiverr",
    languages: "Português e inglês",
    scopeLabel: "Áreas de atuação",
    scope: { games: "Games e gameplay", highlights: "Stream highlights", youtube: "YouTube", short: "Shorts, Reels e TikTok", motion: "Motion design..." }
  },
  reel: {
    label: "Trabalhos recentes",
    title: "REEL DE <em>EDIÇÕES</em>",
    lead: "Trechos dos vídeos que editei, rodando sem som. Passe o mouse para pausar. Os vídeos completos estão logo abaixo, em Veja o resultado.",
    region: "Reel de trabalhos editados",
    regionScroll: "Reel de edições (role para o lado)",
    pause: "Pausar movimento"
  },
  result: {
    label: "No YouTube",
    title: "VEJA O <em>RESULTADO</em>",
    lead: "Vídeos publicados no meu canal, por categoria. Clique para assistir sem sair do site.",
    chips: "Filtrar vídeos do YouTube por categoria",
    empty: "Ainda não há vídeos do YouTube nesta categoria.",
    cta: "Gostou do estilo? Veja como contratar →"
  },
  cat: { all: "Todos", games: "Games", youtube: "YouTube", highlights: "Highlights", ritmo: "Ritmo e beat sync", motion: "Motion" },
  works: {
    conde: "Minecraft com overlay de interface",
    daniel: "Comentário com B-rolls de anime",
    compilado: "Gameplay de terror com legendas",
    matt: "Terror com legendas coloridas",
    demo: "Reel de demonstração",
    titulo: "Gameplay com webcam",
    nii: "Gameplay com avatar animado"
  },
  yt: {
    watch: "Assistir no YouTube: {title}",
    status: "Mostrando {n} vídeos do YouTube.",
    statusOne: "Mostrando 1 vídeo do YouTube.",
    statusNone: "Nenhum vídeo do YouTube nesta categoria.",
    more: "Ver todos os {n} vídeos",
    less: "Ver menos"
  },
  spec: {
    label: "Especialidades",
    title: "CINCO FORMATOS, <em>UM CRITÉRIO</em>",
    lead: "Em todos eles a pergunta é a mesma: o que precisa estar na tela para quem assiste continuar assistindo.",
    games: {
      title: "Games e gameplay",
      text: "Corto no tempo da jogada, deixo o humor e a tensão respirarem e uso som e legenda para acompanhar o ritmo do jogo.",
      tags: ["cortes dinâmicos", "sound design", "legendas", "sincronia com a batida"],
      link: "Ver games"
    },
    highlights: {
      title: "Stream highlights",
      text: "Horas de live viram os melhores momentos, com contexto suficiente para o clipe funcionar sozinho.",
      tags: ["decupagem", "seleção de momentos", "ritmo"],
      link: "Ver highlights"
    },
    youtube: {
      title: "YouTube",
      text: "Estrutura para vídeos longos: o que fica, o que sai e onde entra o apoio visual para segurar a atenção.",
      tags: ["storytelling", "retenção", "B-rolls", "tratamento de áudio"],
      link: "Ver YouTube"
    },
    short: {
      title: "Shorts, Reels e TikTok",
      text: "Formato vertical com gancho nos primeiros segundos, cortes curtos e legenda legível em tela pequena.",
      tags: ["ganchos", "legendas dinâmicas", "cortes estratégicos"],
      link: "Como contratar"
    },
    motion: {
      title: "Motion design",
      text: "Animações, gráficos e overlays sob medida, quando o vídeo pede algo que não existe pronto.",
      tags: ["animações", "gráficos e vetores", "transições", "overlays"],
      link: "Ver motion"
    }
  },
  process: {
    label: "Como eu trabalho",
    title: "DA GRAVAÇÃO BRUTA <em>À ENTREGA</em>",
    lead: "Oito etapas, na ordem em que acontecem. Veja a linha do tempo encolher enquanto B-rolls, textos, áudio e legendas entram.",
    badgeTitle: "Demonstração ilustrativa",
    badgeText: "Durações e trechos da linha do tempo são exemplos. Esta demonstração ainda não contém exemplos de mídia.",
    tablist: "Etapas do processo de edição",
    clock: "Duração do material (exemplo)",
    noMedia: "Ainda não há exemplo de mídia nesta etapa.",
    noMediaTag: "Sem exemplo de mídia ainda",
    cardAria: "Etapa {n}: {tab}. Ainda não há exemplo de mídia nesta etapa.",
    sr: "Etapa {n} de {total}: {title}. Duração do material de exemplo: {dur}.",
    play: "Ver demonstração", stop: "Pausar",
    prev: "‹ Anterior", prevAria: "Etapa anterior", next: "Próxima ›", nextAria: "Próxima etapa",
    note: "Linha do tempo ilustrativa: V = vídeo, TX = texto, CC = legendas, A = áudio.",
    music: "música + efeitos",
    seg: { clip: "trecho {n}", silence: "silêncio", repeat: "repetição", error: "erro", irrelevant: "sem relevância" },
    broll: { prefix: "B-ROLL · {label}", illustration: "ilustração", image: "imagem", extra: "vídeo extra", graphic: "gráfico" },
    tx: { title: "título", highlight: "destaque", text: "texto" },
    compare: { before: "ANTES", after: "DEPOIS", example: "exemplo: {pct}% mais curto" },
    steps: {
      organize: {
        tab: "Organização dos arquivos", title: "Organização dos arquivos",
        text: "Antes de cortar, organizo tudo: pastas, nomes das takes e referências do cliente. Projeto grande sem organização vira retrabalho.",
        list: ["Pastas por tipo de material", "Nomes claros nas takes", "Briefing e referências abertos ao lado"]
      },
      rough: {
        tab: "Decupagem inicial", title: "Decupagem inicial",
        text: "Primeira passada pela gravação inteira. Tiro silêncios, repetições e erros e marco o que pode servir.",
        list: ["Silêncios e pausas longas fora", "Repetições e erros de gravação fora", "Trechos sem relevância descartados"]
      },
      review: {
        tab: "Segunda análise editorial", title: "Segunda análise editorial",
        text: "Reviso só o que sobrou, agora com olhar de espectador: este trecho ajuda a história ou só ocupa tempo?",
        list: ["Redundâncias que sobraram", "Continuidade e ritmo da fala", "Transições entre as frases"]
      },
      narrative: {
        tab: "Construção da narrativa", title: "Construção da narrativa",
        text: "Ordem, ritmo e pausas. Marco as mudanças de assunto e decido onde o vídeo respira e onde acelera.",
        list: ["Marcadores de mudança de assunto", "Abertura e gancho", "Ritmo entre os blocos"]
      },
      broll: {
        tab: "B-rolls e elementos visuais", title: "B-rolls e elementos visuais",
        text: "A fala ganha apoio onde precisa: imagem, gráfico, texto de destaque ou animação. Cada elemento tem uma função.",
        list: ["B-rolls e imagens de apoio", "Textos de destaque e gráficos", "O preview sai do apresentador quando o B-roll entra"]
      },
      audio: {
        tab: "Tratamento de áudio", title: "Tratamento de áudio",
        text: "Voz nivelada e limpa, música e efeitos sonoros por baixo da fala, não por cima.",
        list: ["Nivelamento e limpeza da voz", "Trilha e efeitos sonoros", "Mixagem final"]
      },
      captions: {
        tab: "Legendas e finalização", title: "Legendas e finalização",
        text: "Legendas sincronizadas, zooms e ajustes visuais para fechar a identidade do vídeo.",
        list: ["Legendas sincronizadas com a fala", "Zooms, shakes e ajustes visuais", "Revisão final do vídeo inteiro"]
      },
      delivery: {
        tab: "Exportação e entrega", title: "Exportação e entrega",
        text: "Exporto no formato da plataforma e envio para você revisar. Ajustes são combinados antes do fechamento.",
        list: ["Formato e resolução da plataforma de destino", "Entrega pelo Fiverr", "Revisões até você ficar satisfeito"]
      }
    }
  },
  motion: {
    label: "Motion design",
    title: "ELEMENTOS VISUAIS <em>SOB MEDIDA</em>",
    lead: "Além de cortar, eu construo: overlays, personagens animados, transições e gráficos. Uso programação e o EffectCraft para criar o que não existe pronto.",
    conde: { title: "Overlay de interface sobre o gameplay", text: "Elemento gráfico desenhado e animado para conversar com o jogo, não só colado por cima." },
    nii: { title: "Personagem animado em cena", text: "Avatar ilustrado que reage ao que acontece no gameplay." },
    demo: { title: "Aberturas e gráficos de apoio", text: "Animações de entrada e telas gráficas que dão identidade ao vídeo." }
  },
  reviews: {
    label: "Prova social",
    title: "O QUE DIZEM <em>OS CLIENTES</em>",
    rating: "Nota {score} em {count} avaliações",
    real: "Avaliações reais do Fiverr, com o texto original dos clientes.",
    checked: "Dados do Fiverr conferidos em {date}.",
    note: "Textos e notas reproduzidos como aparecem no Fiverr, inclusive a avaliação mais baixa.",
    more: "Ver todas as {n} avaliações", less: "Ver menos",
    score: "Nota {score} de 5", via: "via Fiverr"
  },
  about: {
    label: "Sobre mim",
    title: "EDITO O QUE FICA. <em>PROGRAMO O QUE FALTA.</em>",
    p1: "Sou Kauã Lucas, editor de vídeo e programador, autodidata. Comecei criando e editando os meus próprios conteúdos e hoje atendo clientes de vários países pelo Fiverr: Brasil, Portugal, Estados Unidos e outros.",
    p2: "Antes de editar, alinho o objetivo do vídeo e o estilo do canal com você, a partir de um vídeo de referência ou do link do canal. Também edito uma prévia antes do pedido, para você ver se o caminho faz sentido.",
    p3: "Como também programo, consigo criar overlays, animações e pequenas automações quando o projeto pede algo que não existe pronto. Uso ferramentas de IA como apoio em partes do processo. As decisões de corte, ritmo e narrativa são minhas.",
    facts: {
      baseLabel: "Base", base: "Brasil",
      languagesLabel: "Idiomas", languages: "Português (fluente), inglês (conversacional)",
      toolsLabel: "Ferramentas", tools: "Filmcraft, EffectCraft, ferramentas de automações, photocraft, kdenlive...",
      whereLabel: "Onde contratar"
    }
  },
  hire: {
    label: "Contratação",
    title: "COMO <em>CONTRATAR</em>",
    steps: {
      talk: { title: "Conversa", text: "Mande o link do seu canal ou um vídeo de referência e diga o que você quer do vídeo." },
      preview: { title: "Prévia", text: "Edito um trecho para você ver se o estilo e o ritmo fazem sentido, antes de fechar o pedido." },
      order: { title: "Pedido e entrega", text: "O pedido é feito pelo Fiverr. O prazo é combinado conforme a minha disponibilidade e o tamanho do material." }
    },
    plans: {
      basic: { len: "Vídeo de até 30 min", name: "Básico" },
      standard: { len: "Vídeo de até 60 min", name: "Padrão" },
      premium: { len: "Vídeo de até 120 min", name: "Premium" },
      choose: "Escolher no Fiverr ↗"
    },
    fine: "Valores em dólar (US$) conforme a minha página no Fiverr em 14/11/2026. O preço final pode variar com a duração do vídeo, a quantidade de material e a complexidade da edição. Se tiver dúvida, fale comigo antes de pedir.",
    included: {
      title: "Em todos os pacotes",
      items: [
        "Edição personalizada, seguindo suas orientações ou com sugestões criativas",
        "Música livre de direitos autorais",
        "Cortes limpos e ritmo dinâmico",
        "Efeitos: tela verde, transições e câmera lenta",
        "Zoom, shake, glitch e outros efeitos visuais",
        "Sincronia com a batida (beat sync)"
      ]
    },
    terms: {
      title: "Condições",
      items: [
        "Prévia antes do pedido, se você enviar o vídeo ou falar comigo antes",
        "Revisões até você ficar satisfeito",
        "Prazo combinado conforme disponibilidade e tamanho do material",
        "Arquivos aceitos: vídeo MP4, MOV e AVI; áudio MP3 e WAV; imagens JPG, PNG e GIF",
        "Atendimento em português e em inglês",
        "Costuma responder em cerca de 1 hora, segundo o Fiverr"
      ]
    }
  },
  contact: {
    label: "Vamos trabalhar juntos",
    title: "VAMOS EDITAR O SEU <em>PRÓXIMO VÍDEO?</em>",
    fiverrTitle: "Pedir uma prévia",
    fiverrNote: "kaua_lucas · resposta em cerca de 1 hora (segundo o Fiverr)",
    discordNote: "Toque para copiar o usuário",
    copied: "Copiado!",
    copiedMsg: "Usuário do Discord copiado: {user}"
  },
  footer: { thanks: "Obrigado por assistir.", copy: "© 2026 Kauã Lucas · Editor de vídeo · Brasil", top: "Voltar ao topo ↑" },
  modal: { close: "Fechar vídeo" },
  cursor: { view: "VER" }
}]);
