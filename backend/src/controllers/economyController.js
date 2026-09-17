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
  // --- COLEÇÃO NIGHT TERRORS ---
  {
    id: 'frame_dentes',
    category: 'frames',
    name: 'Mandíbula do Pesadelo',
    description: 'Presas aterradoras que cercam seu avatar com uma mordida sombria',
    price: 420,
    icon: '🦷',
    image: '/frames/night_terrors/dentes.gif',
    isAnimated: true
  },
  {
    id: 'frame_espectro',
    category: 'frames',
    name: 'Espectro dos Pesadelos',
    description: 'Entidade espectral que emerge dos terrores noturnos com distorção dimensional',
    price: 350,
    icon: '👁️‍🗨️',
    image: '/frames/night_terrors/espectro.gif',
    isAnimated: true
  },
  {
    id: 'frame_olho_abismo',
    category: 'frames',
    name: 'Olho do Abismo',
    description: 'Olhares cósmicos hipnóticos que fitam a escuridão absoluta do vácuo',
    price: 450,
    icon: '👁️',
    image: '/frames/night_terrors/olho_abismo.gif',
    isAnimated: true
  },
  // --- COLEÇÃO DARK FOLKLORE ---
  {
    id: 'frame_chifres_demoniacos',
    category: 'frames',
    name: 'Chifres Demoníacos',
    description: 'Chifres ancestrais corrompidos emitindo fumaça e poder místico',
    price: 390,
    icon: '😈',
    image: '/frames/dark_folklore/chifres_demoniacos.gif',
    isAnimated: true
  },
  {
    id: 'frame_damas_da_noite',
    category: 'frames',
    name: 'Damas da Noite',
    description: 'Flores noturnas encantadas com pétalas sombrias e névoa envenenada',
    price: 410,
    icon: '🥀',
    image: '/frames/dark_folklore/damas_da_noite.gif',
    isAnimated: true
  },
  {
    id: 'frame_mariposa_fantasma',
    category: 'frames',
    name: 'Mariposa Fantasma',
    description: 'Mariposas bioluminescentes que dançam ao redor do avatar guiando espíritos',
    price: 440,
    icon: '🦋',
    image: '/frames/dark_folklore/mariposa_fantasma.gif',
    isAnimated: true
  },
  // --- COLEÇÃO FALL FLORAGERS ---
  {
    id: 'frame_coelho_primavera',
    category: 'frames',
    name: 'Coelho da Primavera',
    description: 'Espírito sagrado dos bosques com orelhas mágicas e folhas vivas',
    price: 360,
    icon: '🐰',
    image: '/frames/fall_floragers/coelho_primavera.gif',
    isAnimated: true
  },
  {
    id: 'frame_florescer',
    category: 'frames',
    name: 'Florescer Místico',
    description: 'Encanto primaveril com botões de flores e pólen místico cintilante',
    price: 390,
    icon: '🌸',
    image: '/frames/fall_floragers/florescer.gif',
    isAnimated: true
  },
  {
    id: 'frame_primavera',
    category: 'frames',
    name: 'Primavera Silvestre',
    description: 'Aura suave da floresta com folhagens vivas e pétalas douradas fluindo',
    price: 370,
    icon: '🍃',
    image: '/frames/fall_floragers/primavera.gif',
    isAnimated: true
  },
  // --- MOLDURAS ANIMADAS CLÁSSICAS ---
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
    id: 'frame_fogo',
    category: 'frames',
    name: 'Chamas Infernais',
    description: 'Moldura animada de fogo ardente em alta definição',
    price: 280,
    icon: '🔥',
    image: '/frames/fogo.gif',
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
  {
    id: 'frame_matrix_neon',
    category: 'frames',
    name: 'Matrix Cibernética',
    description: 'Borda animada verde com fluxo de dados digital',
    price: 220,
    icon: '💻',
    cssClass: 'border-2 border-emerald-400 shadow-[0_0_14px_rgba(52,211,153,0.85)] ring-1 ring-emerald-500/60 animate-pulse'
  },
  {
    id: 'frame_sakura_bloom',
    category: 'frames',
    name: 'Pétalas de Sakura',
    description: 'Aura suave e floral em tons de rosa e cerejeira',
    price: 260,
    icon: '🌸',
    cssClass: 'border-2 border-pink-400 shadow-[0_0_15px_rgba(244,114,182,0.85)] ring-2 ring-rose-300/60'
  },
  {
    id: 'frame_void_vortex',
    category: 'frames',
    name: 'Vórtice do Vazio',
    description: 'Energia escura dimensional em violeta profundo',
    price: 380,
    icon: '🌀',
    cssClass: 'border-2 border-violet-500 shadow-[0_0_16px_rgba(139,92,246,0.9)] ring-2 ring-fuchsia-600/50'
  },
  {
    id: 'frame_electric_storm',
    category: 'frames',
    name: 'Tempestade de Raios',
    description: 'Descarga elétrica azul com relâmpagos pulsantes',
    price: 320,
    icon: '⚡',
    cssClass: 'border-2 border-sky-400 shadow-[0_0_16px_rgba(56,189,248,0.95)] ring-2 ring-blue-500/70'
  },
  {
    id: 'frame_blood_moon',
    category: 'frames',
    name: 'Lua de Sangue',
    description: 'Borda carmesim intensa inspirada em eclipses solares',
    price: 340,
    icon: '🩸',
    cssClass: 'border-2 border-red-600 shadow-[0_0_18px_rgba(220,38,38,0.9)] ring-2 ring-rose-900'
  },
  {
    id: 'frame_golden_emperor',
    category: 'frames',
    name: 'Imperador Dourado',
    description: 'Coroa brilhante com resplendor de ouro maciço',
    price: 450,
    icon: '👑',
    cssClass: 'border-2 border-yellow-300 shadow-[0_0_20px_rgba(253,224,71,0.95)] ring-2 ring-amber-400'
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

      // Suporte a preço promocional / rotação da vitrine (com limite seguro de até 65% de desconto)
      let finalPrice = item.price;
      if (req.body.price !== undefined && req.body.price !== null) {
        const clientPrice = Math.round(Number(req.body.price));
        if (clientPrice > 0 && clientPrice >= Math.floor(item.price * 0.35)) {
          finalPrice = clientPrice;
        }
      }

      if ((profile.nexus_coins || 0) < finalPrice) {
        return res.status(400).json({
          success: false,
          error: `Nexus Coins insuficientes. Você tem ${profile.nexus_coins || 0} e o item custa ${finalPrice}.`
        });
      }

      const newCoins = profile.nexus_coins - finalPrice;
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
        amount: -finalPrice,
        type: 'shop_purchase',
        description: `Compra na Loja: ${item.name}${finalPrice < item.price ? ' (Oferta Rotativa)' : ''}`
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

const FRAME_THEMES = {
  night_terrors: {
    id: 'night_terrors',
    name: 'Night Terrors',
    collectorTitle: 'Pesadelo Vivo 👁️',
    itemIds: ['frame_dentes', 'frame_espectro', 'frame_olho_abismo']
  },
  dark_folklore: {
    id: 'dark_folklore',
    name: 'Dark Folklore',
    collectorTitle: 'Lenda Folclórica 🥀',
    itemIds: ['frame_chifres_demoniacos', 'frame_damas_da_noite', 'frame_mariposa_fantasma']
  },
  fall_floragers: {
    id: 'fall_floragers',
    name: 'Fall Floragers',
    collectorTitle: 'Guardião Silvestre 🌸',
    itemIds: ['frame_coelho_primavera', 'frame_florescer', 'frame_primavera']
  }
};

/**
 * Presenteia um amigo com um item da Loja Nexus
 */
async function giftShopItem(req, res) {
  try {
    const senderId = req.user.id;
    const { recipientId, itemId, message } = req.body;

    if (!recipientId) {
      return res.status(400).json({ success: false, error: 'Destinatário não especificado.' });
    }

    if (recipientId === senderId) {
      return res.status(400).json({ success: false, error: 'Você não pode presentear a si mesmo. Use o botão Comprar!' });
    }

    let item = SHOP_CATALOG.find(i => i.id === itemId);

    if (isConfigured && supabase) {
      if (!item) {
        const { data: dbItem } = await supabase.from('shop_items').select('*').eq('id', itemId).single();
        if (dbItem) {
          item = {
            id: dbItem.id,
            name: dbItem.name,
            price: dbItem.price,
            category: dbItem.category,
            image: dbItem.image_url || dbItem.image,
            icon: dbItem.icon || '🎁'
          };
        }
      }

      if (!item) {
        return res.status(404).json({ success: false, error: 'Item não encontrado no catálogo.' });
      }

      const { data: senderProfile, error: senderErr } = await supabase
        .from('profiles')
        .select('nexus_coins, display_name, username')
        .eq('id', senderId)
        .single();

      if (senderErr || !senderProfile) {
        return res.status(500).json({ success: false, error: 'Perfil do remetente não encontrado.' });
      }

      const { data: recipientProfile, error: recipientErr } = await supabase
        .from('profiles')
        .select('nexus_coins, unlocked_items, display_name, username')
        .eq('id', recipientId)
        .single();

      if (recipientErr || !recipientProfile) {
        return res.status(404).json({ success: false, error: 'Destinatário não encontrado.' });
      }

      const recipientUnlocked = recipientProfile.unlocked_items || [];
      if (recipientUnlocked.includes(itemId)) {
        return res.status(400).json({
          success: false,
          error: `${recipientProfile.display_name || recipientProfile.username || 'Este usuário'} já possui este item!`
        });
      }

      const itemPrice = item.price;
      if ((senderProfile.nexus_coins || 0) < itemPrice) {
        return res.status(400).json({
          success: false,
          error: `Saldo insuficiente! Você tem ${senderProfile.nexus_coins || 0} e o presente custa ${itemPrice} Nexus Coins.`
        });
      }

      const newSenderCoins = senderProfile.nexus_coins - itemPrice;
      await supabase
        .from('profiles')
        .update({ nexus_coins: newSenderCoins })
        .eq('id', senderId);

      const newRecipientUnlocked = [...recipientUnlocked, itemId];
      await supabase
        .from('profiles')
        .update({ unlocked_items: newRecipientUnlocked })
        .eq('id', recipientId);

      const senderName = senderProfile.display_name || senderProfile.username || 'Alguém';
      const recipientName = recipientProfile.display_name || recipientProfile.username || 'Amigo';

      await supabase.from('nexus_transactions').insert([
        {
          user_id: senderId,
          amount: -itemPrice,
          type: 'shop_gift_sent',
          description: `Presente enviado para ${recipientName}: ${item.name}`
        },
        {
          user_id: recipientId,
          amount: 0,
          type: 'shop_gift_received',
          description: `Presente recebido de ${senderName}: ${item.name}`
        }
      ]);

      try {
        await supabase.from('user_gifts').insert({
          sender_id: senderId,
          recipient_id: recipientId,
          gift_id: itemId,
          gift_name: item.name,
          gift_icon: item.icon || '🎁',
          rarity: 'epic',
          price: itemPrice,
          quantity: 1,
          message: message ? message.trim() : `Presente da Loja Nexus: ${item.name}!`
        });
      } catch (errG) {
        console.warn('Registro em user_gifts opcional não inserido:', errG.message);
      }

      return res.json({
        success: true,
        message: `🎁 Você presenteou ${recipientName} com "${item.name}" com sucesso!`,
        senderCoins: newSenderCoins,
        item
      });
    }

    return res.json({
      success: true,
      message: `🎁 Presente enviado com sucesso!`,
      senderCoins: 100
    });
  } catch (error) {
    console.error('Erro em giftShopItem:', error);
    return res.status(500).json({ success: false, error: 'Erro ao processar envio de presente.' });
  }
}

/**
 * Compra o pacote completo de um tema com 25% de desconto automático,
 * abatendo proporcionalmente os itens que o usuário já possui.
 */
async function buyThemeBundle(req, res) {
  try {
    const userId = req.user.id;
    const { themeId } = req.body;

    const theme = FRAME_THEMES[themeId];
    if (!theme) {
      return res.status(404).json({ success: false, error: 'Coleção temática não encontrada.' });
    }

    if (isConfigured && supabase) {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('nexus_coins, unlocked_items, custom_title')
        .eq('id', userId)
        .single();

      if (error || !profile) {
        return res.status(500).json({ success: false, error: 'Erro ao carregar perfil do usuário.' });
      }

      const unlocked = profile.unlocked_items || [];
      const unownedIds = theme.itemIds.filter(id => !unlocked.includes(id));

      if (unownedIds.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Você já possui todas as peças desta coleção!'
        });
      }

      const unownedItems = unownedIds.map(id => {
        return SHOP_CATALOG.find(i => i.id === id) || { id, price: 400, name: id };
      });

      const originalTotal = unownedItems.reduce((sum, i) => sum + (i.price || 0), 0);
      const discountedPrice = Math.round(originalTotal * 0.75); // 25% OFF

      if ((profile.nexus_coins || 0) < discountedPrice) {
        return res.status(400).json({
          success: false,
          error: `Saldo insuficiente. O pacote custa ${discountedPrice} NC e você possui ${profile.nexus_coins || 0} NC.`
        });
      }

      const newCoins = profile.nexus_coins - discountedPrice;
      const newUnlocked = Array.from(new Set([...unlocked, ...unownedIds]));

      const updatePayload = {
        nexus_coins: newCoins,
        unlocked_items: newUnlocked
      };

      const ownsAllNow = theme.itemIds.every(id => newUnlocked.includes(id));
      if (ownsAllNow && theme.collectorTitle) {
        updatePayload.custom_title = theme.collectorTitle;
      }

      await supabase
        .from('profiles')
        .update(updatePayload)
        .eq('id', userId);

      await supabase.from('nexus_transactions').insert({
        user_id: userId,
        amount: -discountedPrice,
        type: 'shop_bundle_purchase',
        description: `Pacote Completo: ${theme.name} (${unownedIds.length} itens com 25% OFF)`
      });

      return res.json({
        success: true,
        message: `🎉 Pacote "${theme.name}" desbloqueado com 25% de desconto!`,
        totalCoins: newCoins,
        unlockedItems: newUnlocked,
        completedTheme: ownsAllNow ? theme : null,
        itemsAdded: unownedIds
      });
    }

    return res.json({
      success: true,
      message: `🎉 Pacote "${theme.name}" desbloqueado!`,
      totalCoins: 300,
      unlockedItems: theme.itemIds
    });
  } catch (error) {
    console.error('Erro em buyThemeBundle:', error);
    return res.status(500).json({ success: false, error: 'Erro ao processar compra de pacote.' });
  }
}

module.exports = {
  getShopCatalog,
  claimDailyReward,
  buyShopItem,
  equipShopItem,
  giftShopItem,
  buyThemeBundle,
  SHOP_CATALOG,
  FRAME_THEMES
};
