// Mapa de molduras animadas em GIF
export const FRAME_ANIMATED_ASSETS = {
  frame_espirito: '/frames/Espirito.gif',
  frame_rosas: '/frames/Rosas.gif',
  frame_espectro: '/frames/espectro.gif',
  frame_fogo: '/frames/fogo.gif',
};

// Mapa de molduras em CSS / Bordas estilizadas
export const FRAME_CSS_STYLES = {
  frame_cyber_neon: 'border-2 border-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.8)] animate-pulse',
  frame_belmont_gold: 'border-2 border-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.9)] ring-2 ring-amber-500/50',
  frame_inferno: 'border-2 border-rose-500 shadow-[0_0_14px_rgba(244,63,94,0.9)] ring-1 ring-orange-500',
  frame_galaxy: 'border-2 border-purple-400 shadow-[0_0_16px_rgba(192,132,252,0.9)] ring-2 ring-indigo-500'
};

// Catálogo Oficial da Loja Nexus e Itens de Personalização
export const SHOP_CATALOG = [
  // --- MOLDURAS ANIMADAS DE ALTA DEFINIÇÃO (GIFS) ---
  {
    id: 'frame_espirito',
    category: 'frames',
    name: 'Espírito Espectral',
    description: 'Moldura mística animada com aura de espíritos e almas',
    price: 350,
    icon: '👻',
    image: '/frames/Espirito.gif',
    isAnimated: true
  },
  {
    id: 'frame_rosas',
    category: 'frames',
    name: 'Rosas Carmesim',
    description: 'Moldura animada de rosas góticas flutuantes',
    price: 300,
    icon: '🌹',
    image: '/frames/Rosas.gif',
    isAnimated: true
  },
  {
    id: 'frame_espectro',
    category: 'frames',
    name: 'Espectro Cósmico',
    description: 'Moldura animada com distorção de energia dimensional',
    price: 250,
    icon: '🔮',
    image: '/frames/espectro.gif',
    isAnimated: true
  },
  {
    id: 'frame_fogo',
    category: 'frames',
    name: 'Chamas Infernais',
    description: 'Moldura animada de fogo ardente em alta definição',
    price: 280,
    icon: '🔥',
    image: '/frames/fogo.gif',
    isAnimated: true
  },

  // --- MOLDURAS DE AVATAR ESTILIZADAS (FRAMES) ---
  {
    id: 'frame_cyber_neon',
    category: 'frames',
    name: 'Cyberpunk Neon',
    description: 'Borda animada ciano e magenta brilhante',
    price: 150,
    icon: '✨',
    cssClass: 'border-2 border-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.8)] animate-pulse'
  },
  {
    id: 'frame_belmont_gold',
    category: 'frames',
    name: 'Ouro Real Belmont',
    description: 'Brasão real dourado com aura imperial',
    price: 300,
    icon: '👑',
    cssClass: 'border-2 border-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.9)] ring-2 ring-amber-500/50'
  },
  {
    id: 'frame_inferno',
    category: 'frames',
    name: 'Fogo Neon',
    description: 'Chamas ardentes em vermelho e laranja',
    price: 250,
    icon: '🔥',
    cssClass: 'border-2 border-rose-500 shadow-[0_0_14px_rgba(244,63,94,0.9)] ring-1 ring-orange-500'
  },
  {
    id: 'frame_galaxy',
    category: 'frames',
    name: 'Galáxia Cosmos',
    description: 'Aura roxa estelar com poeira cósmica',
    price: 400,
    icon: '🌌',
    cssClass: 'border-2 border-purple-400 shadow-[0_0_16px_rgba(192,132,252,0.9)] ring-2 ring-indigo-500'
  },

  // --- PLANOS DE FUNDO DE CONVERSA (WALLPAPERS) ---
  {
    id: 'wallpaper_cyber_grid',
    category: 'wallpapers',
    name: 'Cyber Grid Neon',
    description: 'Grade futurista com linhas ciano e azul escuro',
    price: 350,
    icon: '🌐',
    cssClass: 'bg-[radial-gradient(#06b6d4_1px,transparent_1px)] [background-size:20px_20px] bg-slate-950'
  },
  {
    id: 'wallpaper_belmont_palace',
    category: 'wallpapers',
    name: 'Palácio Belmont Real',
    description: 'Aura nobre dourada com brasões translúcidos',
    price: 600,
    icon: '👑',
    cssClass: 'bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-950/40 via-slate-950 to-black border-amber-500/10'
  },
  {
    id: 'wallpaper_dark_nebula',
    category: 'wallpapers',
    name: 'Nebulosa Cosmos',
    description: 'Poeira cósmica violeta e estrelas distantes',
    price: 450,
    icon: '✨',
    cssClass: 'bg-[radial-gradient(ellipse_at_bottom,_var(--tw-gradient-stops))] from-purple-950/50 via-slate-950 to-black'
  },
  {
    id: 'wallpaper_synthwave',
    category: 'wallpapers',
    name: 'Synthwave Sunset',
    description: 'Gradiente retrô dos anos 80 em magenta e azul',
    price: 400,
    icon: '🌇',
    cssClass: 'bg-gradient-to-b from-indigo-950/60 via-slate-950 to-rose-950/40'
  },
  {
    id: 'wallpaper_deep_obsidian',
    category: 'wallpapers',
    name: 'Obsidian Minimalista',
    description: 'Preto puro com textura geométrica sutil',
    price: 200,
    icon: '🖤',
    cssClass: 'bg-slate-950 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:24px_24px]'
  },

  // --- CORES E TEMAS DE BALÃO DE CHAT (BUBBLES) ---
  {
    id: 'bubble_cyber_violet',
    category: 'bubbles',
    name: 'Violeta Cyberpunk',
    description: 'Gradiente elétrico de roxo para azul neon',
    price: 200,
    icon: '💬',
    cssClass: 'bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 text-white shadow-lg shadow-purple-500/20'
  },
  {
    id: 'bubble_royal_gold',
    category: 'bubbles',
    name: 'Ouro Imperial',
    description: 'Dourado real metálico sofisticado',
    price: 350,
    icon: '🪙',
    cssClass: 'bg-gradient-to-r from-amber-600 via-yellow-600 to-amber-700 text-amber-50 shadow-lg shadow-amber-500/25 border border-amber-400/40'
  },
  {
    id: 'bubble_matrix_emerald',
    category: 'bubbles',
    name: 'Matrix Esmeralda',
    description: 'Verde hacker brilhante de alta tecnologia',
    price: 180,
    icon: '🟢',
    cssClass: 'bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-lg shadow-emerald-500/20 border border-emerald-400/30'
  },
  {
    id: 'bubble_rose_velvet',
    category: 'bubbles',
    name: 'Rosa Veludo',
    description: 'Rosa magenta vibrante e moderno',
    price: 220,
    icon: '🌸',
    cssClass: 'bg-gradient-to-r from-pink-600 to-rose-600 text-white shadow-lg shadow-pink-500/20'
  },

  // --- TÍTULOS & BADGES DE PRESTÍGIO ---
  {
    id: 'badge_belmont_vip',
    category: 'badges',
    name: 'VIP Belmont',
    description: 'Selo oficial de membro de honra da Belmont Conference',
    price: 500,
    icon: '👑',
    label: 'VIP Belmont'
  },
  {
    id: 'badge_early_adopter',
    category: 'badges',
    name: 'Early Adopter',
    description: 'Pioneiro das primeiras versões do Nexus Chat',
    price: 100,
    icon: '⚡',
    label: 'Pioneiro ⚡'
  },
  {
    id: 'badge_diamond',
    category: 'badges',
    name: 'Membro Diamante',
    description: 'Distintivo de prestígio e raridade máxima',
    price: 800,
    icon: '💎',
    label: 'Diamante 💎'
  },
  {
    id: 'badge_chat_master',
    category: 'badges',
    name: 'Mestre do Chat',
    description: 'Selo para os comunicadores mais ativos',
    price: 250,
    icon: '🔥',
    label: 'Chat Master 🔥'
  },

  // --- CORES DE NOME & BRILHO GLOW ---
  {
    id: 'name_rainbow_glow',
    category: 'name_colors',
    name: 'Arco-Íris Mágico',
    description: 'Nome com gradiente multicolorido',
    price: 300,
    icon: '🌈',
    cssClass: 'bg-gradient-to-r from-red-400 via-amber-300 via-green-300 to-sky-400 bg-clip-text text-transparent font-extrabold'
  },
  {
    id: 'name_golden_glow',
    category: 'name_colors',
    name: 'Brilho Dourado',
    description: 'Texto dourado com sombra iluminada',
    price: 200,
    icon: '✨',
    cssClass: 'text-amber-300 font-extrabold drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]'
  },
  {
    id: 'name_electric_cyan',
    category: 'name_colors',
    name: 'Ciano Elétrico',
    description: 'Azul ciano de alta energia',
    price: 180,
    icon: '⚡',
    cssClass: 'text-cyan-400 font-extrabold drop-shadow-[0_0_8px_rgba(34,211,238,0.6)]'
  }
];

export const WALLPAPER_STYLES = {
  wallpaper_cyber_grid: 'bg-[radial-gradient(#06b6d4_1px,transparent_1px)] [background-size:20px_20px] bg-slate-950',
  wallpaper_belmont_palace: 'bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-950/40 via-slate-950 to-black',
  wallpaper_dark_nebula: 'bg-[radial-gradient(ellipse_at_bottom,_var(--tw-gradient-stops))] from-purple-950/50 via-slate-950 to-black',
  wallpaper_synthwave: 'bg-gradient-to-b from-indigo-950/60 via-slate-950 to-rose-950/40',
  wallpaper_deep_obsidian: 'bg-slate-950 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:24px_24px]'
};
