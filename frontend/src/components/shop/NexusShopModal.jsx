import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase, isSupabaseConfigured } from '../../lib/supabaseClient';
import { SHOP_CATALOG, WALLPAPER_STYLES } from '../../lib/shopCatalog';
import { sounds } from '../../lib/sound';
import confetti from 'canvas-confetti';
import {
  ShoppingBag,
  Sparkles,
  Check,
  Flame,
  X,
  Palette,
  MessageSquare,
  Shield,
  Package,
  Image as ImageIcon,
  Crown,
  Eye,
  Zap,
  Award,
  Gift,
  Coins,
  RotateCcw
} from 'lucide-react';

export function NexusShopModal({ isOpen, onClose }) {
  const { user, updateProfile } = useAuth();
  const [activeTab, setActiveTab] = useState('frames'); // 'frames' | 'wallpapers' | 'bubbles' | 'badges' | 'name_colors' | 'inventory'
  const [catalog, setCatalog] = useState(SHOP_CATALOG);
  const [userCoins, setUserCoins] = useState(user?.nexus_coins || 100);
  const [dailyStreak, setDailyStreak] = useState(user?.daily_streak || 0);
  const [lastDailyClaim, setLastDailyClaim] = useState(user?.last_daily_claim || null);
  const [unlockedItems, setUnlockedItems] = useState(user?.unlocked_items || ['frame_default', 'bubble_default', 'wallpaper_default']);

  const [equippedFrame, setEquippedFrame] = useState(user?.equipped_frame || 'default');
  const [equippedWallpaper, setEquippedWallpaper] = useState(user?.equipped_wallpaper || 'default');
  const [equippedBubble, setEquippedBubble] = useState(user?.equipped_bubble || 'default');
  const [equippedBadge, setEquippedBadge] = useState(user?.equipped_badge || 'none');
  const [equippedNameColor, setEquippedNameColor] = useState(user?.equipped_name_color || 'default');

  // Preview Temporário de Itens no Provador Virtual
  const [previewFrameItem, setPreviewFrameItem] = useState(null);
  const [previewWallpaperItem, setPreviewWallpaperItem] = useState(null);
  const [previewBubbleItem, setPreviewBubbleItem] = useState(null);
  const [previewBadgeItem, setPreviewBadgeItem] = useState(null);
  const [previewNameColorItem, setPreviewNameColorItem] = useState(null);

  const [claiming, setClaiming] = useState(false);
  const [purchasingId, setPurchasingId] = useState(null);
  const [feedbackMsg, setFeedbackMsg] = useState({ text: '', type: '' });

  useEffect(() => {
    if (!isOpen || !user) return;
    setUserCoins(user.nexus_coins || 100);
    setDailyStreak(user.daily_streak || 0);
    setLastDailyClaim(user.last_daily_claim || null);
    setUnlockedItems(user.unlocked_items || ['frame_default', 'bubble_default', 'wallpaper_default']);
    setEquippedFrame(user.equipped_frame || 'default');
    setEquippedWallpaper(user.equipped_wallpaper || 'default');
    setEquippedBubble(user.equipped_bubble || 'default');
    setEquippedBadge(user.equipped_badge || 'none');
    setEquippedNameColor(user.equipped_name_color || 'default');

    loadRemoteData();
  }, [isOpen, user?.id]);

  // Sincronizar itens iniciais de preview com os itens equipados
  useEffect(() => {
    const frameObj = catalog.find(i => i.id === equippedFrame || i.id === `frame_${equippedFrame}`);
    const wallObj = catalog.find(i => i.id === equippedWallpaper || i.id === `wallpaper_${equippedWallpaper}`);
    const bubbleObj = catalog.find(i => i.id === equippedBubble || i.id === `bubble_${equippedBubble}`);
    const badgeObj = catalog.find(i => i.id === equippedBadge || i.id === `badge_${equippedBadge}`);
    const nameColorObj = catalog.find(i => i.id === equippedNameColor || i.id === `name_color_${equippedNameColor}` || i.id === `name_${equippedNameColor}`);

    setPreviewFrameItem(frameObj || null);
    setPreviewWallpaperItem(wallObj || null);
    setPreviewBubbleItem(bubbleObj || null);
    setPreviewBadgeItem(badgeObj || null);
    setPreviewNameColorItem(nameColorObj || null);
  }, [equippedFrame, equippedWallpaper, equippedBubble, equippedBadge, equippedNameColor, catalog]);

  const loadRemoteData = async () => {
    if (isSupabaseConfigured && supabase && user) {
      try {
        const [
          { data: profile },
          { data: customItems }
        ] = await Promise.all([
          supabase.from('profiles').select('nexus_coins, daily_streak, last_daily_claim, equipped_frame, equipped_wallpaper, equipped_bubble, equipped_badge, equipped_name_color, unlocked_items').eq('id', user.id).single(),
          supabase.from('shop_items').select('*').eq('is_active', true)
        ]);

        if (profile) {
          setUserCoins(profile.nexus_coins || 100);
          setDailyStreak(profile.daily_streak || 0);
          setLastDailyClaim(profile.last_daily_claim || null);
          setUnlockedItems(profile.unlocked_items || ['frame_default', 'bubble_default', 'wallpaper_default']);
          setEquippedFrame(profile.equipped_frame || 'default');
          setEquippedWallpaper(profile.equipped_wallpaper || 'default');
          setEquippedBubble(profile.equipped_bubble || 'default');
          setEquippedBadge(profile.equipped_badge || 'none');
          setEquippedNameColor(profile.equipped_name_color || 'default');
        }

        if (customItems && customItems.length > 0) {
          const formattedCustom = customItems.map(ci => ({
            id: ci.id,
            category: ci.category,
            name: ci.name,
            description: ci.description,
            price: ci.price,
            icon: ci.icon || '✨',
            cssClass: ci.css_class || '',
            imageUrl: ci.image_url
          }));
          const existingIds = new Set(formattedCustom.map(i => i.id));
          const baseFiltered = SHOP_CATALOG.filter(i => !existingIds.has(i.id));
          setCatalog([...baseFiltered, ...formattedCustom]);
        }
      } catch (err) {
        console.error('Erro ao buscar dados remotos da loja:', err);
      }
    }
  };

  const handleClaimDaily = async () => {
    try {
      setClaiming(true);
      const todayStr = new Date().toISOString().split('T')[0];

      if (lastDailyClaim === todayStr) {
        setFeedbackMsg({ text: 'Você já resgatou seu bônus diário hoje! Volte amanhã.', type: 'info' });
        return;
      }

      const rewardAmount = 50 + (dailyStreak * 10);
      const newStreak = dailyStreak + 1;
      const newCoins = userCoins + rewardAmount;

      setUserCoins(newCoins);
      setDailyStreak(newStreak);
      setLastDailyClaim(todayStr);

      if (isSupabaseConfigured && supabase && user) {
        await supabase.from('profiles').update({
          nexus_coins: newCoins,
          daily_streak: newStreak,
          last_daily_claim: todayStr
        }).eq('id', user.id);

        await supabase.from('nexus_transactions').insert({
          user_id: user.id,
          amount: rewardAmount,
          type: 'daily_reward',
          description: `Bônus Diário (Streak Dia ${newStreak})`
        });
      }

      if (updateProfile) {
        updateProfile({
          nexus_coins: newCoins,
          daily_streak: newStreak,
          last_daily_claim: todayStr
        });
      }

      sounds.playPop();
      confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
      setFeedbackMsg({ text: `🎉 Parabéns! Você recebeu +${rewardAmount} Nexus Coins!`, type: 'success' });
    } catch (err) {
      setFeedbackMsg({ text: 'Erro ao resgatar recompensa diária.', type: 'error' });
    } finally {
      setClaiming(false);
    }
  };

  const handlePreviewItem = (item) => {
    if (item.category === 'frames') setPreviewFrameItem(item);
    if (item.category === 'wallpapers') setPreviewWallpaperItem(item);
    if (item.category === 'bubbles') setPreviewBubbleItem(item);
    if (item.category === 'badges') setPreviewBadgeItem(item);
    if (item.category === 'name_colors') setPreviewNameColorItem(item);
    sounds.playPop();
  };

  const handleResetPreview = () => {
    const frameObj = catalog.find(i => i.id === equippedFrame || i.id === `frame_${equippedFrame}`);
    const wallObj = catalog.find(i => i.id === equippedWallpaper || i.id === `wallpaper_${equippedWallpaper}`);
    const bubbleObj = catalog.find(i => i.id === equippedBubble || i.id === `bubble_${equippedBubble}`);
    const badgeObj = catalog.find(i => i.id === equippedBadge || i.id === `badge_${equippedBadge}`);
    const nameColorObj = catalog.find(i => i.id === equippedNameColor || i.id === `name_color_${equippedNameColor}` || i.id === `name_${equippedNameColor}`);

    setPreviewFrameItem(frameObj || null);
    setPreviewWallpaperItem(wallObj || null);
    setPreviewBubbleItem(bubbleObj || null);
    setPreviewBadgeItem(badgeObj || null);
    setPreviewNameColorItem(nameColorObj || null);
    sounds.playPop();
  };

  const handleBuyItem = async (item) => {
    if (userCoins < item.price) {
      sounds.playError?.();
      setFeedbackMsg({ text: `Saldo insuficiente! Você precisa de mais ${item.price - userCoins} Nexus Coins.`, type: 'error' });
      return;
    }

    try {
      setPurchasingId(item.id);
      const newCoins = userCoins - item.price;
      const newUnlocked = [...unlockedItems, item.id];

      setUserCoins(newCoins);
      setUnlockedItems(newUnlocked);

      if (isSupabaseConfigured && supabase && user) {
        await supabase.from('profiles').update({
          nexus_coins: newCoins,
          unlocked_items: newUnlocked
        }).eq('id', user.id);

        await supabase.from('nexus_transactions').insert({
          user_id: user.id,
          amount: -item.price,
          type: 'shop_purchase',
          description: `Compra do item: ${item.name}`
        });
      }

      if (updateProfile) {
        updateProfile({
          nexus_coins: newCoins,
          unlocked_items: newUnlocked
        });
      }

      sounds.playPop();
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      setFeedbackMsg({ text: `✨ "${item.name}" desbloqueado com sucesso!`, type: 'success' });
    } catch (err) {
      setFeedbackMsg({ text: 'Erro ao realizar compra.', type: 'error' });
    } finally {
      setPurchasingId(null);
    }
  };

  const handleEquipItem = async (item) => {
    const fieldMap = {
      frames: 'equipped_frame',
      wallpapers: 'equipped_wallpaper',
      bubbles: 'equipped_bubble',
      badges: 'equipped_badge',
      name_colors: 'equipped_name_color'
    };

    const targetField = fieldMap[item.category];
    if (!targetField) return;

    const valueToSet = item.id;

    if (item.category === 'frames') {
      setEquippedFrame(valueToSet);
      setPreviewFrameItem(item);
    } else if (item.category === 'wallpapers') {
      setEquippedWallpaper(valueToSet);
      setPreviewWallpaperItem(item);
    } else if (item.category === 'bubbles') {
      setEquippedBubble(valueToSet);
      setPreviewBubbleItem(item);
    } else if (item.category === 'badges') {
      setEquippedBadge(valueToSet);
      setPreviewBadgeItem(item);
    } else if (item.category === 'name_colors') {
      setEquippedNameColor(valueToSet);
      setPreviewNameColorItem(item);
    }

    if (isSupabaseConfigured && supabase && user) {
      await supabase.from('profiles').update({
        [targetField]: valueToSet
      }).eq('id', user.id);
    }

    if (updateProfile) {
      updateProfile({
        [targetField]: valueToSet
      });
    }

    sounds.playPop();
    setFeedbackMsg({ text: `🎨 "${item.name}" equipado com sucesso!`, type: 'success' });
  };

  const handleUnequip = async (category) => {
    const fieldMap = {
      frames: { field: 'equipped_frame', val: 'default' },
      wallpapers: { field: 'equipped_wallpaper', val: 'default' },
      bubbles: { field: 'equipped_bubble', val: 'default' },
      badges: { field: 'equipped_badge', val: 'none' },
      name_colors: { field: 'equipped_name_color', val: 'default' }
    };

    const target = fieldMap[category];
    if (!target) return;

    if (category === 'frames') { setEquippedFrame('default'); setPreviewFrameItem(null); }
    if (category === 'wallpapers') { setEquippedWallpaper('default'); setPreviewWallpaperItem(null); }
    if (category === 'bubbles') { setEquippedBubble('default'); setPreviewBubbleItem(null); }
    if (category === 'badges') { setEquippedBadge('none'); setPreviewBadgeItem(null); }
    if (category === 'name_colors') { setEquippedNameColor('default'); setPreviewNameColorItem(null); }

    if (isSupabaseConfigured && supabase && user) {
      await supabase.from('profiles').update({
        [target.field]: target.val
      }).eq('id', user.id);
    }

    if (updateProfile) {
      updateProfile({
        [target.field]: target.val
      });
    }

    sounds.playPop();
  };

  if (!isOpen || !user) return null;

  const filteredItems = catalog.filter((i) => i.category === activeTab);
  const userInventoryItems = catalog.filter((i) => unlockedItems.includes(i.id));

  const todayStr = new Date().toISOString().split('T')[0];
  const canClaimDaily = lastDailyClaim !== todayStr;

  const categories = [
    { id: 'frames', label: 'Molduras', icon: Sparkles },
    { id: 'wallpapers', label: 'Planos de Fundo', icon: ImageIcon },
    { id: 'bubbles', label: 'Balões de Chat', icon: MessageSquare },
    { id: 'badges', label: 'Badges & Títulos', icon: Shield },
    { id: 'name_colors', label: 'Auras de Nome', icon: Palette },
    { id: 'inventory', label: 'Meu Inventário', icon: Package, badge: userInventoryItems.length }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/85 backdrop-blur-xl animate-fadeIn select-none overflow-hidden box-border">
      <div className="w-full max-w-5xl rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 md:p-6 shadow-2xl border border-amber-500/40 bg-gradient-to-b from-slate-900/95 via-background-darker/95 to-slate-950/95 flex flex-col h-full max-h-[96vh] sm:max-h-[92vh] overflow-hidden relative backdrop-blur-2xl min-w-0 box-border">
        {/* Glows Decorativos */}
        <div className="absolute -top-32 -right-32 w-80 h-80 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Topbar Responsiva: Título + Badge de Saldo + Botão Fechar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 sm:pb-4 border-b border-slate-800/80 gap-2.5 sm:gap-3 flex-shrink-0 min-w-0">
          {/* Linha Superior: Ícone + Título + Botão Fechar (visível em destaque no topo) */}
          <div className="flex items-center justify-between gap-2 min-w-0 w-full sm:w-auto">
            <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0 flex-1">
              <div className="relative flex-shrink-0">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-gradient-to-br from-amber-500 via-yellow-500 to-amber-600 text-black flex items-center justify-center shadow-lg shadow-amber-500/30 border border-yellow-300">
                  <ShoppingBag className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <span className="absolute -top-1 -right-1 p-0.5 bg-yellow-400 rounded-full text-black">
                  <Crown className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                  <h2 className="text-base sm:text-lg md:text-xl font-extrabold text-white tracking-tight truncate">
                    LOJA NEXUS
                  </h2>
                  <span className="text-[9px] sm:text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-extrabold uppercase flex-shrink-0">
                    Cosméticos
                  </span>
                </div>
                <p className="text-[11px] sm:text-xs text-slate-400 truncate hidden xs:block">
                  Personalize seu avatar, plano de fundo e balões
                </p>
              </div>
            </div>

            {/* Botão Fechar no Mobile */}
            <button
              onClick={onClose}
              className="sm:hidden p-1.5 rounded-xl text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-800 transition-all border border-slate-700/60 flex-shrink-0"
              title="Fechar loja"
              aria-label="Fechar loja"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Saldo de Moedas + Botão Fechar Desktop */}
          <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-3 flex-shrink-0 w-full sm:w-auto">
            {/* Badge de Saldo de Moedas */}
            <div className="flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl bg-gradient-to-r from-amber-500/20 via-yellow-500/20 to-amber-600/20 border border-amber-500/50 shadow-md flex-1 sm:flex-initial">
              <img src="/nexus-coin.jpg" alt="Moeda" className="w-4 h-4 sm:w-5 sm:h-5 rounded-full shadow flex-shrink-0" />
              <div className="min-w-0">
                <div className="text-[8px] sm:text-[9px] text-amber-300 font-extrabold uppercase tracking-wider">Meu Saldo</div>
                <div className="text-xs sm:text-sm font-extrabold text-white truncate">{userCoins} Coins</div>
              </div>
            </div>

            {/* Botão Fechar Desktop */}
            <button
              onClick={onClose}
              className="hidden sm:flex p-2 rounded-2xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition-all border border-slate-800 flex-shrink-0"
              title="Fechar loja"
              aria-label="Fechar loja"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Banner de Bônus Diário & Streak Holográfico */}
        <div className="mt-2.5 sm:mt-3.5 p-2.5 sm:p-3.5 rounded-2xl bg-gradient-to-r from-amber-950/40 via-slate-900 to-indigo-950/40 border border-amber-500/30 flex flex-col sm:flex-row items-center justify-between gap-2.5 sm:gap-3 shadow-lg flex-shrink-0 min-w-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 w-full sm:w-auto">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-gradient-to-br from-amber-500 to-yellow-600 flex items-center justify-center text-black font-extrabold text-base sm:text-lg shadow-md flex-shrink-0">
              🎁
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <span className="text-xs font-bold text-white truncate">Recompensa Diária</span>
                <span className="text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-0.2 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-extrabold flex items-center gap-1 flex-shrink-0">
                  <Flame className="w-3 h-3 text-orange-400" /> Streak: {dailyStreak}d
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-400 truncate">
                Resgate moedas gratuitas todos os dias para desbloquear itens.
              </p>
            </div>
          </div>

          <button
            onClick={handleClaimDaily}
            disabled={!canClaimDaily || claiming}
            className={`w-full sm:w-auto px-3 sm:px-4 py-2 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all shadow-md flex-shrink-0 ${
              canClaimDaily
                ? 'bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 text-black shadow-amber-500/25 active:scale-95'
                : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
            }`}
          >
            <Gift className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>{canClaimDaily ? `Resgatar +${50 + (dailyStreak * 10)} Coins` : 'Resgatado Hoje ✓'}</span>
          </button>
        </div>

        {/* PROVADOR VIRTUAL INTERATIVO / LIVE PREVIEW EM TEMPO REAL */}
        <div
          className={`mt-2.5 sm:mt-3.5 p-3 sm:p-4 rounded-2xl sm:rounded-3xl border border-amber-500/40 shadow-xl relative overflow-hidden transition-all duration-500 flex-shrink-0 min-w-0 ${
            previewWallpaperItem?.cssClass || 'bg-gradient-to-r from-slate-900 via-slate-900/90 to-amber-950/30'
          }`}
        >
          {/* Overlay suave para legibilidade */}
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-[2px] pointer-events-none" />

          <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 min-w-0">
            <div className="flex items-center gap-3 min-w-0 w-full sm:w-auto">
              {/* Avatar com a Moldura do Preview */}
              <div className="relative flex-shrink-0 inline-flex items-center justify-center">
                <img
                  src={user?.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${user?.id}`}
                  alt="Avatar Preview"
                  className={`w-12 h-12 sm:w-16 sm:h-16 rounded-full object-cover transition-all duration-300 ${
                    previewFrameItem?.cssClass || (!previewFrameItem?.image ? 'border-2 border-slate-700 shadow-md' : '')
                  }`}
                />
                {previewFrameItem?.image && (
                  <img
                    src={previewFrameItem.image}
                    alt="Moldura Preview"
                    className="absolute -inset-[22%] w-[144%] h-[144%] max-w-none pointer-events-none object-contain z-10 select-none drop-shadow-md"
                  />
                )}
                <span className="absolute -bottom-1 -right-1 p-0.5 sm:p-1 bg-amber-500 rounded-full text-black shadow-md animate-bounce z-20">
                  <Sparkles className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5" />
                </span>
              </div>

              {/* Informações do Perfil com Aura de Nome e Badge */}
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                  <span
                    className={`text-xs sm:text-sm font-extrabold transition-all duration-300 truncate max-w-[140px] sm:max-w-none ${
                      previewNameColorItem?.cssClass || 'text-white'
                    }`}
                  >
                    {user?.display_name || user?.username || 'Damon'}
                  </span>

                  {previewBadgeItem && (
                    <span className="text-[9px] sm:text-[10px] px-2 py-0.2 rounded-full font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/50 uppercase shadow-sm flex items-center gap-1 truncate max-w-[120px] sm:max-w-none">
                      <span>{previewBadgeItem.icon || '👑'}</span>
                      <span className="truncate">{previewBadgeItem.label || previewBadgeItem.name}</span>
                    </span>
                  )}
                </div>

                {/* Balão de Mensagem ao Vivo do Preview */}
                <div
                  className={`px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl text-[11px] sm:text-xs max-w-full sm:max-w-sm transition-all duration-300 shadow-lg ${
                    previewBubbleItem?.cssClass || 'bg-brand-600/30 border border-brand-500/40 text-slate-100'
                  }`}
                >
                  <p className="font-medium leading-relaxed truncate sm:whitespace-normal">
                    Preview: Seu avatar, aura e balão no chat! ✨
                  </p>
                </div>
              </div>
            </div>

            {/* Ações do Provador */}
            <div className="flex items-center justify-between sm:justify-end gap-2 flex-shrink-0 w-full sm:w-auto pt-1 sm:pt-0 border-t sm:border-t-0 border-slate-800/60">
              <span className="text-[9px] sm:text-[10px] text-amber-300 font-extrabold uppercase bg-amber-500/20 px-2 py-0.5 rounded-lg border border-amber-500/40">
                Provador Ativo
              </span>
              <button
                type="button"
                onClick={handleResetPreview}
                className="px-2.5 sm:px-3.5 py-1 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 text-[11px] sm:text-xs font-bold border border-slate-700 transition-all flex items-center gap-1 shadow-sm active:scale-95"
              >
                <RotateCcw className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                <span>Resetar Look</span>
              </button>
            </div>
          </div>
        </div>

        {/* Feedback Alert */}
        {feedbackMsg.text && (
          <div
            className={`mt-2.5 p-2.5 sm:p-3 rounded-xl sm:rounded-2xl text-xs font-semibold flex items-center justify-between animate-fadeIn flex-shrink-0 ${
              feedbackMsg.type === 'success'
                ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 shadow-lg shadow-emerald-500/10'
                : 'bg-rose-500/15 border border-rose-500/30 text-rose-300 shadow-lg shadow-rose-500/10'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0 flex-1 mr-2">
              <span className="flex-shrink-0">{feedbackMsg.type === 'success' ? '✨' : '⚠️'}</span>
              <span className="truncate">{feedbackMsg.text}</span>
            </div>
            <button onClick={() => setFeedbackMsg({ text: '', type: '' })} className="opacity-75 hover:opacity-100 flex-shrink-0 p-1">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Abas de Categorias */}
        <div className="flex bg-slate-900/80 p-1 sm:p-1.5 rounded-xl sm:rounded-2xl border border-slate-800/80 my-2.5 sm:my-3.5 overflow-x-auto no-scrollbar gap-1 flex-shrink-0 w-full max-w-full box-border">
          {categories.map((cat) => {
            const Icon = cat.icon;
            const isActive = activeTab === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => {
                  setActiveTab(cat.id);
                  setFeedbackMsg({ text: '', type: '' });
                }}
                className={`py-1.5 sm:py-2 px-2.5 sm:px-3.5 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap flex-shrink-0 ${
                  isActive
                    ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-black shadow-lg shadow-amber-500/20 font-extrabold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                <span>{cat.label}</span>
                {cat.badge !== undefined && (
                  <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-extrabold flex-shrink-0 ${
                    isActive ? 'bg-black/20 text-black' : 'bg-slate-800 text-slate-300'
                  }`}>
                    {cat.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Grade de Itens da Loja */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-3 sm:space-y-4 min-h-[220px] sm:min-h-[260px] min-w-0 w-full max-w-full box-border">
          {activeTab === 'inventory' ? (
            <div>
              <div className="flex items-center justify-between mb-2.5 sm:mb-3">
                <h3 className="text-xs font-extrabold text-slate-300 uppercase tracking-wide">
                  Meus Itens Desbloqueados ({userInventoryItems.length})
                </h3>
              </div>

              {userInventoryItems.length === 0 ? (
                <div className="text-center py-12 sm:py-16 text-slate-400 text-xs">
                  Você ainda não possui itens cosméticos. Explore as categorias para desbloquear!
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 sm:gap-3.5 w-full max-w-full">
                  {userInventoryItems.map((item) => {
                    const isEquipped =
                      equippedFrame === item.id ||
                      equippedWallpaper === item.id ||
                      equippedBubble === item.id ||
                      equippedBadge === item.id ||
                      equippedNameColor === item.id;

                    return (
                      <div
                        key={item.id}
                        className={`p-3 sm:p-4 rounded-2xl sm:rounded-3xl border transition-all flex flex-col justify-between shadow-xl min-w-0 box-border w-full ${
                          isEquipped
                            ? 'bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-900 border-emerald-500/60 shadow-emerald-500/10'
                            : 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="space-y-2 sm:space-y-2.5 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-xl sm:text-2xl flex-shrink-0">{item.icon}</span>
                            <span className="text-[9px] sm:text-[10px] px-2 py-0.2 rounded-full bg-slate-800 text-slate-400 font-semibold uppercase flex-shrink-0">
                              {item.category}
                            </span>
                          </div>

                          {/* Mini Visual Preview do Item no Card */}
                          <div className="p-2 sm:p-2.5 rounded-xl sm:rounded-2xl bg-background-dark/80 border border-slate-800/80 flex items-center justify-center min-h-[48px] sm:min-h-[55px] min-w-0">
                            {item.category === 'frames' && (
                              <div className="relative inline-flex items-center justify-center">
                                <img
                                  src={user?.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${user?.id}`}
                                  alt="preview"
                                  className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full object-cover flex-shrink-0 ${item.cssClass || ''}`}
                                />
                                {item.image && (
                                  <img
                                    src={item.image}
                                    alt="moldura"
                                    className="absolute -inset-[22%] w-[144%] h-[144%] max-w-none pointer-events-none object-contain z-10 select-none drop-shadow-md"
                                  />
                                )}
                              </div>
                            )}
                            {item.category === 'bubbles' && (
                              <div className={`px-2 sm:px-2.5 py-1 rounded-xl text-[10px] font-medium truncate ${item.cssClass}`}>
                                Exemplo de Balão
                              </div>
                            )}
                            {item.category === 'badges' && (
                              <span className="text-[9px] sm:text-[10px] px-2 sm:px-2.5 py-0.5 rounded-full font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/50 uppercase truncate">
                                {item.label || item.name}
                              </span>
                            )}
                            {item.category === 'name_colors' && (
                              <span className={`text-xs font-extrabold truncate ${item.cssClass}`}>
                                {user?.display_name || 'Damon'}
                              </span>
                            )}
                            {item.category === 'wallpapers' && (
                              <div className={`w-full h-7 sm:h-8 rounded-lg ${item.cssClass} border border-slate-700 flex items-center justify-center text-[10px] text-slate-300 font-bold truncate px-1`}>
                                Fundo do Chat
                              </div>
                            )}
                          </div>

                          <div className="min-w-0">
                            <h4 className="text-xs font-extrabold text-white truncate">{item.name}</h4>
                            <p className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5 leading-snug line-clamp-2">{item.description}</p>
                          </div>
                        </div>

                        <div className="mt-3 sm:mt-4 pt-2.5 sm:pt-3 border-t border-slate-800/80 flex items-center gap-1.5 sm:gap-2 w-full min-w-0">
                          <button
                            onClick={() => handlePreviewItem(item)}
                            className="p-1.5 sm:p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold flex-shrink-0"
                            title="Testar no provador"
                          >
                            <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          </button>
                          {isEquipped ? (
                            <button
                              onClick={() => handleUnequip(item.category)}
                              className="flex-1 py-1.5 sm:py-2 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-extrabold flex items-center justify-center gap-1 hover:bg-emerald-500/30 min-w-0 truncate"
                            >
                              <Check className="w-3.5 h-3.5 flex-shrink-0" /> <span className="truncate">Equipado</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => handleEquipItem(item)}
                              className="flex-1 py-1.5 sm:py-2 rounded-xl bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/40 text-xs font-extrabold flex items-center justify-center gap-1 transition-all min-w-0 truncate active:scale-95"
                            >
                              <Sparkles className="w-3.5 h-3.5 flex-shrink-0" /> <span className="truncate">Equipar</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 sm:gap-3.5 w-full max-w-full">
              {filteredItems.map((item) => {
                const isUnlocked = unlockedItems.includes(item.id);
                const isEquipped =
                  equippedFrame === item.id ||
                  equippedWallpaper === item.id ||
                  equippedBubble === item.id ||
                  equippedBadge === item.id ||
                  equippedNameColor === item.id;

                const canAfford = userCoins >= item.price;

                return (
                  <div
                    key={item.id}
                    className={`p-3 sm:p-4 rounded-2xl sm:rounded-3xl border transition-all flex flex-col justify-between shadow-xl group hover:scale-[1.01] min-w-0 box-border w-full ${
                      isEquipped
                        ? 'bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-900 border-emerald-500/60 shadow-emerald-500/10'
                        : isUnlocked
                        ? 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
                        : 'bg-slate-900/80 border-slate-800/80 hover:border-amber-500/40'
                    }`}
                  >
                    <div className="space-y-2 sm:space-y-2.5 min-w-0">
                      <div className="flex items-center justify-between">
                        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-xl sm:text-2xl shadow group-hover:scale-110 transition-transform flex-shrink-0">
                          {item.icon}
                        </div>

                        {/* Preço ou Status */}
                        {isUnlocked ? (
                          <span className="text-[9px] sm:text-[10px] px-2 sm:px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-extrabold flex items-center gap-1 flex-shrink-0">
                            <Check className="w-3 h-3" /> Desbloqueado
                          </span>
                        ) : (
                          <div className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 font-extrabold text-[11px] sm:text-xs shadow-sm flex-shrink-0">
                            <img src="/nexus-coin.jpg" alt="Moeda" className="w-3.5 h-3.5 rounded-full" />
                            <span>{item.price} Coins</span>
                          </div>
                        )}
                      </div>

                      {/* Mini Visual Preview do Item no Card */}
                      <div
                        onClick={() => handlePreviewItem(item)}
                        className="p-2 sm:p-2.5 rounded-xl sm:rounded-2xl bg-background-dark/80 border border-slate-800/80 flex items-center justify-center min-h-[48px] sm:min-h-[55px] cursor-pointer hover:border-amber-500/50 transition-all group/box min-w-0"
                        title="Clique para testar no provador"
                      >
                        {item.category === 'frames' && (
                          <img
                            src={user?.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${user?.id}`}
                            alt="preview"
                            className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl object-cover flex-shrink-0 ${item.cssClass}`}
                          />
                        )}
                        {item.category === 'bubbles' && (
                          <div className={`px-2 sm:px-2.5 py-1 rounded-xl text-[10px] font-medium truncate ${item.cssClass}`}>
                            Exemplo de Balão
                          </div>
                        )}
                        {item.category === 'badges' && (
                          <span className="text-[9px] sm:text-[10px] px-2 sm:px-2.5 py-0.5 rounded-full font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/50 uppercase shadow truncate">
                            {item.label || item.name}
                          </span>
                        )}
                        {item.category === 'name_colors' && (
                          <span className={`text-xs font-extrabold truncate ${item.cssClass}`}>
                            {user?.display_name || 'Damon'}
                          </span>
                        )}
                        {item.category === 'wallpapers' && (
                          <div className={`w-full h-7 sm:h-8 rounded-lg ${item.cssClass} border border-slate-700 flex items-center justify-center text-[10px] text-slate-300 font-bold truncate px-1`}>
                            Fundo do Chat
                          </div>
                        )}
                      </div>

                      <div className="min-w-0">
                        <h4 className="text-xs font-extrabold text-white group-hover:text-amber-300 transition-colors truncate">
                          {item.name}
                        </h4>
                        <p className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5 leading-snug line-clamp-2">{item.description}</p>
                      </div>
                    </div>

                    <div className="mt-3 sm:mt-4 pt-2.5 sm:pt-3 border-t border-slate-800/80 flex items-center gap-1.5 sm:gap-2 w-full min-w-0">
                      <button
                        onClick={() => handlePreviewItem(item)}
                        className="px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold flex items-center gap-1 transition-colors flex-shrink-0"
                        title="Testar no provador"
                      >
                        <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" />
                        <span>Testar</span>
                      </button>

                      {isEquipped ? (
                        <button
                          onClick={() => handleUnequip(item.category)}
                          className="flex-1 py-1.5 sm:py-2 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-extrabold flex items-center justify-center gap-1 hover:bg-emerald-500/30 min-w-0 truncate"
                        >
                          <Check className="w-3.5 h-3.5 flex-shrink-0" /> <span className="truncate">Equipado</span>
                        </button>
                      ) : isUnlocked ? (
                        <button
                          onClick={() => handleEquipItem(item)}
                          className="flex-1 py-1.5 sm:py-2 rounded-xl bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/40 text-xs font-extrabold flex items-center justify-center gap-1 transition-all min-w-0 truncate active:scale-95"
                        >
                          <Sparkles className="w-3.5 h-3.5 flex-shrink-0" /> <span className="truncate">Equipar</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => handleBuyItem(item)}
                          disabled={!canAfford || purchasingId === item.id}
                          className={`flex-1 py-1.5 sm:py-2 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1 shadow-md transition-all min-w-0 truncate active:scale-95 ${
                            canAfford
                              ? 'bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 text-black shadow-amber-500/25'
                              : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                          }`}
                        >
                          <ShoppingBag className="w-3.5 h-3.5 flex-shrink-0" />
                          <span className="truncate">{canAfford ? `Comprar (${item.price})` : 'Sem Saldo'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
