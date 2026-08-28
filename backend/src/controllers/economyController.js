const { supabase, isConfigured } = require('../config/supabase');
const { v4: uuidv4 } = require('uuid');

// Catálogo Oficial da Loja Nexus
const SHOP_CATALOG = [
  // --- MOLDURAS DE AVATAR ---
  {
    id: 'frame_beta',
    category: 'frames',
    name: 'Moldura BETA TESTER',
    description: 'Moldura holográfica animada exclusiva para testadores beta oficiais',
    price: 0,
    icon: '🧪',
    image: '/frames/beta.gif',
    isAnimated: true
  },
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
    name: 'Fogo Infernal',
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

  // --- CORES E TEMAS DE BALÃO DE CHAT ---
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

  // --- BADGES E TÍTULOS ---
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

  // --- CORES DE NOME GLOW ---
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

/**
 * Retorna o catálogo da loja e os dados de economia do usuário
 */
async function getShopCatalog(req, res) {
  try {
    const userId = req.user.id;

    if (isConfigured && supabase) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('nexus_coins, daily_streak, last_daily_claim, equipped_frame, equipped_bubble, equipped_badge, equipped_name_color, unlocked_items')
        .eq('id', userId)
        .single();

      return res.json({
        success: true,
        catalog: SHOP_CATALOG,
        userEconomy: {
          coins: profile?.nexus_coins || 100,
          dailyStreak: profile?.daily_streak || 0,
          lastDailyClaim: profile?.last_daily_claim || null,
          equippedFrame: profile?.equipped_frame || 'default',
          equippedBubble: profile?.equipped_bubble || 'default',
          equippedBadge: profile?.equipped_badge || 'none',
          equippedNameColor: profile?.equipped_name_color || 'default',
          unlockedItems: profile?.unlocked_items || ['frame_default', 'bubble_default']
        }
      });
    }

    return res.json({
      success: true,
      catalog: SHOP_CATALOG,
      userEconomy: {
        coins: 350,
        dailyStreak: 3,
        lastDailyClaim: null,
        equippedFrame: 'frame_cyber_neon',
        equippedBubble: 'bubble_cyber_violet',
        equippedBadge: 'badge_early_adopter',
        equippedNameColor: 'name_golden_glow',
        unlockedItems: ['frame_cyber_neon', 'bubble_cyber_violet', 'badge_early_adopter', 'name_golden_glow']
      }
    });
  } catch (error) {
    console.error('Erro em getShopCatalog:', error);
    return res.status(500).json({ success: false, error: 'Erro ao carregar catálogo da Loja.' });
  }
}

/**
 * Reivindica a recompensa diária de moedas
 */
async function claimDailyReward(req, res) {
  try {
    const userId = req.user.id;
    const now = new Date();

    if (isConfigured && supabase) {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('nexus_coins, daily_streak, last_daily_claim')
        .eq('id', userId)
        .single();

      if (error) return res.status(500).json({ success: false, error: error.message });

      const lastClaim = profile?.last_daily_claim ? new Date(profile.last_daily_claim) : null;

      // Verificar se já coletou hoje (mesmo dia UTC)
      if (lastClaim && lastClaim.toDateString() === now.toDateString()) {
        return res.status(400).json({
          success: false,
          error: 'Você já coletou sua recompensa diária hoje. Volte amanhã!'
        });
      }

      // Calcular streak: se o último claim foi ontem, incrementa streak; senão, reseta para 1
      let newStreak = 1;
      if (lastClaim) {
        const yesterday = new Date(now);
        yesterday.setDate(now.getDate() - 1);
        if (lastClaim.toDateString() === yesterday.toDateString()) {
          newStreak = (profile.daily_streak || 0) + 1;
        }
      }

      // Recompensa: 50 base + 25 por dia de streak (máx 250)
      const rewardCoins = Math.min(50 + (newStreak - 1) * 25, 250);
      const newTotalCoins = (profile?.nexus_coins || 0) + rewardCoins;

      await supabase
        .from('profiles')
        .update({
          nexus_coins: newTotalCoins,
          daily_streak: newStreak,
          last_daily_claim: now.toISOString()
        })
        .eq('id', userId);

      await supabase.from('nexus_transactions').insert({
        user_id: userId,
        amount: rewardCoins,
        type: 'daily_claim',
        description: `Recompensa Diária - Dia ${newStreak} de Sequência`
      });

      return res.json({
        success: true,
        rewardCoins,
        newStreak,
        totalCoins: newTotalCoins,
        message: `+${rewardCoins} Nexus Coins coletadas com sucesso! Sequência de ${newStreak} dia(s)!`
      });
    }

    return res.json({
      success: true,
      rewardCoins: 100,
      newStreak: 4,
      totalCoins: 450,
      message: '+100 Nexus Coins coletadas!'
    });
  } catch (error) {
    console.error('Erro em claimDailyReward:', error);
    return res.status(500).json({ success: false, error: 'Erro ao reivindicar recompensa diária.' });
  }
}

/**
 * Compra um item da Loja Nexus
 */
async function buyShopItem(req, res) {
  try {
    const userId = req.user.id;
    const { itemId } = req.body;

    let item = SHOP_CATALOG.find(i => i.id === itemId);

    if (isConfigured && supabase) {
      if (!item) {
        const { data: dbItem } = await supabase.from('shop_items').select('*').eq('id', itemId).single();
        if (dbItem) {
          item = {
            id: dbItem.id,
            name: dbItem.name,
            price: dbItem.price,
            category: dbItem.category
          };
        }
      }

      if (!item) {
        return res.status(404).json({ success: false, error: 'Item não encontrado no catálogo.' });
      }
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('nexus_coins, unlocked_items')
        .eq('id', userId)
        .single();

      if (error) return res.status(500).json({ success: false, error: error.message });

      const unlocked = profile.unlocked_items || [];
      if (unlocked.includes(itemId)) {
        return res.status(400).json({ success: false, error: 'Você já possui este item!' });
      }

      if ((profile.nexus_coins || 0) < item.price) {
        return res.status(400).json({
          success: false,
          error: `Nexus Coins insuficientes. Você tem ${profile.nexus_coins || 0} e o item custa ${item.price}.`
        });
      }

      const newCoins = profile.nexus_coins - item.price;
      const newUnlocked = [...unlocked, itemId];

      await supabase
        .from('profiles')
        .update({
          nexus_coins: newCoins,
          unlocked_items: newUnlocked
        })
        .eq('id', userId);

      await supabase.from('nexus_transactions').insert({
        user_id: userId,
        amount: -item.price,
        type: 'shop_purchase',
        description: `Compra na Loja: ${item.name}`
      });

      return res.json({
        success: true,
        message: `Você adquiriu "${item.name}" com sucesso!`,
        totalCoins: newCoins,
        unlockedItems: newUnlocked
      });
    }

    return res.json({
      success: true,
      message: `Você adquiriu "${item.name}" com sucesso!`,
      totalCoins: 200,
      unlockedItems: [itemId]
    });
  } catch (error) {
    console.error('Erro em buyShopItem:', error);
    return res.status(500).json({ success: false, error: 'Erro ao processar compra.' });
  }
}

/**
 * Equipa ou desequipa um item personalizado no perfil
 */
async function equipShopItem(req, res) {
  try {
    const userId = req.user.id;
    const { category, itemId } = req.body;

    const columnMap = {
      frames: 'equipped_frame',
      bubbles: 'equipped_bubble',
      badges: 'equipped_badge',
      name_colors: 'equipped_name_color'
    };

    const columnName = columnMap[category];
    if (!columnName) {
      return res.status(400).json({ success: false, error: 'Categoria inválida.' });
    }

    if (isConfigured && supabase) {
      await supabase
        .from('profiles')
        .update({ [columnName]: itemId })
        .eq('id', userId);

      return res.json({
        success: true,
        category,
        equippedId: itemId
      });
    }

    return res.json({
      success: true,
      category,
      equippedId: itemId
    });
  } catch (error) {
    console.error('Erro em equipShopItem:', error);
    return res.status(500).json({ success: false, error: 'Erro ao equipar item.' });
  }
}

module.exports = {
  getShopCatalog,
  claimDailyReward,
  buyShopItem,
  equipShopItem,
  SHOP_CATALOG
};
