/**
 * Catálogo Oficial de Presentes Animados e Capas de Perfil do Nexus Chat
 */

export const GIFT_RARITIES = {
  common: {
    id: 'common',
    label: 'Comum',
    badgeClass: 'bg-slate-700/60 text-slate-300 border-slate-600',
    borderClass: 'border-slate-700 hover:border-slate-500',
    glowClass: 'shadow-slate-700/30',
    color: '#94a3b8'
  },
  rare: {
    id: 'rare',
    label: 'Raro',
    badgeClass: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
    borderClass: 'border-cyan-500/50 hover:border-cyan-400',
    glowClass: 'shadow-cyan-500/30 shadow-lg',
    color: '#06b6d4'
  },
  epic: {
    id: 'epic',
    label: 'Épico',
    badgeClass: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
    borderClass: 'border-purple-500/50 hover:border-purple-400',
    glowClass: 'shadow-purple-500/40 shadow-xl',
    color: '#a855f7'
  },
  legendary: {
    id: 'legendary',
    label: 'Lendário',
    badgeClass: 'bg-amber-500/25 text-amber-300 border-amber-400/60 shadow-[0_0_8px_rgba(251,191,36,0.4)] animate-pulse',
    borderClass: 'border-amber-400/70 hover:border-amber-300 ring-1 ring-amber-400/30',
    glowClass: 'shadow-amber-500/50 shadow-2xl',
    color: '#f59e0b'
  },
  mythic: {
    id: 'mythic',
    label: 'Mítico',
    badgeClass: 'bg-gradient-to-r from-rose-500/30 via-purple-500/30 to-cyan-500/30 text-rose-300 border-rose-400/70 shadow-[0_0_12px_rgba(244,63,94,0.6)] animate-pulse',
    borderClass: 'border-rose-400/80 hover:border-cyan-300 ring-2 ring-rose-500/50',
    glowClass: 'shadow-rose-600/60 shadow-2xl',
    color: '#f43f5e'
  }
};

export const GIFT_CATALOG = [
  // --- COMUM (15 - 50 Coins) ---
  {
    id: 'gift_coffee',
    name: 'Café Quentinho',
    icon: '☕',
    rarity: 'common',
    price: 15,
    description: 'Um café expresso quentinho para alegrar o dia do seu amigo.',
    animation: 'animate-bounce',
    particleEmoji: '☕'
  },
  {
    id: 'gift_cookie',
    name: 'Cookie Mágico',
    icon: '🍪',
    rarity: 'common',
    price: 25,
    description: 'Crocante com gotas de chocolate de pura amizade.',
    animation: 'animate-pulse',
    particleEmoji: '🍪'
  },
  {
    id: 'gift_flower',
    name: 'Flor de Cerejeira',
    icon: '🌸',
    rarity: 'common',
    price: 40,
    description: 'Um toque delicado de carinho e harmonia no chat.',
    animation: 'animate-spin-slow',
    particleEmoji: '🌸'
  },
  {
    id: 'gift_balloons',
    name: 'Balões Festivos',
    icon: '🎈',
    rarity: 'common',
    price: 50,
    description: 'Balões coloridos flutuantes para comemorações!',
    animation: 'animate-bounce',
    particleEmoji: '🎈'
  },

  // --- RARO (100 - 250 Coins) ---
  {
    id: 'gift_pizza',
    name: 'Fatia Dourada',
    icon: '🍕',
    rarity: 'rare',
    price: 100,
    description: 'Uma fatia de pizza lendária com queijo cósmico.',
    animation: 'hover:rotate-12 transition-transform',
    particleEmoji: '🍕'
  },
  {
    id: 'gift_gamepad',
    name: 'Controle Arcade Retro',
    icon: '🎮',
    rarity: 'rare',
    price: 150,
    description: 'Para o melhor parceiro de jogos e conversas do Nexus.',
    animation: 'animate-pulse',
    particleEmoji: '🎮'
  },
  {
    id: 'gift_lightning',
    name: 'Raio Cósmico',
    icon: '⚡',
    rarity: 'rare',
    price: 200,
    description: 'Descarga de energia pura para turbinar o perfil.',
    animation: 'animate-bounce',
    particleEmoji: '⚡'
  },
  {
    id: 'gift_teddy',
    name: 'Ursinho Holográfico',
    icon: '🧸',
    rarity: 'rare',
    price: 250,
    description: 'Um abraço virtual fofo e caloroso.',
    animation: 'animate-pulse',
    particleEmoji: '🧸'
  },

  // --- ÉPICO (500 - 1000 Coins) ---
  {
    id: 'gift_rocket',
    name: 'Foguete Espacial Nexus',
    icon: '🚀',
    rarity: 'epic',
    price: 500,
    description: 'Rumo às estrelas! O símbolo máximo de ascensão rápida.',
    animation: 'animate-bounce',
    particleEmoji: '🚀'
  },
  {
    id: 'gift_trophy',
    name: 'Troféu de Ouro Puro',
    icon: '🏆',
    rarity: 'epic',
    price: 750,
    description: 'Homenagem de honra e reconhecimento na comunidade.',
    animation: 'animate-pulse',
    particleEmoji: '🏆'
  },
  {
    id: 'gift_diamond',
    name: 'Diamante Flutuante',
    icon: '💎',
    rarity: 'epic',
    price: 1000,
    description: 'Puro luxo e brilho eterno que impressiona a todos.',
    animation: 'animate-spin-slow',
    particleEmoji: '💎'
  },

  // --- LENDÁRIO (2500 - 5000 Coins) ---
  {
    id: 'gift_crown',
    name: 'Coroa Imperial Belmont',
    icon: '👑',
    rarity: 'legendary',
    price: 2500,
    description: 'A coroa soberana digna dos imperadores do Nexus.',
    animation: 'animate-bounce',
    particleEmoji: '👑'
  },
  {
    id: 'gift_dragon',
    name: 'Dragão Celestial de Fogo',
    icon: '🐉',
    rarity: 'legendary',
    price: 5000,
    description: 'Fogo místico e poder ancestral concedidos com suprema honra.',
    animation: 'animate-pulse',
    particleEmoji: '🔥'
  },

  // --- MÍTICO (10000 Coins) ---
  {
    id: 'gift_blackhole',
    name: 'Singularidade Cósmica Mítica',
    icon: '🌌',
    rarity: 'mythic',
    price: 10000,
    description: 'O presente mais raro, caro e supremo de todo o Nexus Chat.',
    animation: 'animate-spin-slow',
    particleEmoji: '✨'
  }
];

export const PRESET_BANNERS = [
  {
    id: 'banner_cyber_neon',
    name: 'Cyberpunk Grid',
    url: 'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?auto=format&fit=crop&w=1200&q=80',
    cssClass: 'bg-gradient-to-r from-purple-900 via-indigo-950 to-cyan-900'
  },
  {
    id: 'banner_belmont_gold',
    name: 'Belmont Gold Luxury',
    url: 'https://images.unsplash.com/photo-1519751138087-5bf79df62d5b?auto=format&fit=crop&w=1200&q=80',
    cssClass: 'bg-gradient-to-r from-amber-950 via-slate-900 to-yellow-950'
  },
  {
    id: 'banner_deep_cosmos',
    name: 'Deep Cosmos Nebula',
    url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=80',
    cssClass: 'bg-gradient-to-r from-slate-950 via-purple-950 to-blue-950'
  },
  {
    id: 'banner_sunset_neon',
    name: 'Synthwave Sunset',
    url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=80',
    cssClass: 'bg-gradient-to-r from-rose-900 via-purple-900 to-amber-900'
  },
  {
    id: 'banner_emerald_matrix',
    name: 'Emerald Matrix Code',
    url: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1200&q=80',
    cssClass: 'bg-gradient-to-r from-emerald-950 via-slate-900 to-teal-950'
  },
  {
    id: 'banner_obsidian_minimal',
    name: 'Dark Obsidian Sleek',
    url: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=1200&q=80',
    cssClass: 'bg-gradient-to-r from-slate-900 via-slate-950 to-slate-900'
  }
];
