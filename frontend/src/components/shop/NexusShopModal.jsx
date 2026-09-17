import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase, isSupabaseConfigured } from '../../lib/supabaseClient';
import {
  SHOP_CATALOG,
  WALLPAPER_STYLES,
  FRAME_ANIMATED_ASSETS,
  FRAME_THEMES,
  registerDynamicFrames,
  getFrameAsset,
  getFrameStyle
} from '../../lib/shopCatalog';
import {
  calculateFrameRotation,
  formatRemainingRotationTime,
  getAdminRotationOffset
} from '../../lib/shopRotation';
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
  EyeOff,
  Zap,
  Gift,
  Coins,
  RotateCcw,
  Clock,
  Tag,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
  CheckCircle2
} from 'lucide-react';
import { ShopGiftModal } from './ShopGiftModal';

function getFormattedClaimDate(claimValue) {
  if (!claimValue) return null;
  if (typeof claimValue === 'string') {
    return claimValue.slice(0, 10);
  }
  try {
    return new Date(claimValue).toISOString().slice(0, 10);
  } catch (e) {
    return null;
  }
}

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

  // Item selecionado para presentear um amigo via ShopGiftModal
  const [giftTargetItem, setGiftTargetItem] = useState(null);

  // Preview Temporário de Itens no Provador Virtual
  const [previewFrameItem, setPreviewFrameItem] = useState(null);
  const [previewWallpaperItem, setPreviewWallpaperItem] = useState(null);
  const [previewBubbleItem, setPreviewBubbleItem] = useState(null);
  const [previewBadgeItem, setPreviewBadgeItem] = useState(null);
  const [previewNameColorItem, setPreviewNameColorItem] = useState(null);

  // Toggle para colapsar/expandir o Provador Virtual
  const [showFittingRoom, setShowFittingRoom] = useState(false);

  const [claiming, setClaiming] = useState(false);
  const [purchasingId, setPurchasingId] = useState(null);
  const [feedbackMsg, setFeedbackMsg] = useState({ text: '', type: '' });

  // Rotação de Molduras (Ciclos de 3 dias / 72h) & Filtro de Coleção
  const [framesViewMode, setFramesViewMode] = useState('rotation'); // 'rotation' | 'night_terrors' | 'dark_folklore' | 'fall_floragers' | 'all'
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [adminOffset, setAdminOffset] = useState(getAdminRotationOffset());

  // Ticker em tempo real para a contagem regressiva da rotação da loja
  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);

    const onRotationChanged = () => {
      setAdminOffset(getAdminRotationOffset());
      setCurrentTime(Date.now());
    };
    window.addEventListener('nexus_shop_rotation_changed', onRotationChanged);

    return () => {
      clearInterval(interval);
      window.removeEventListener('nexus_shop_rotation_changed', onRotationChanged);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !user) return;
    setUserCoins(user.nexus_coins || 100);
    setDailyStreak(user.daily_streak || 0);
    const localDaily = user?.id ? localStorage.getItem(`nexus_last_daily_${user.id}`) : null;
    setLastDailyClaim(user.last_daily_claim || localDaily || null);
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
    const frameObj = catalog.find((i) => i.id === equippedFrame || i.id === `frame_${equippedFrame}`);
    const wallObj = catalog.find((i) => i.id === equippedWallpaper || i.id === `wallpaper_${equippedWallpaper}`);
    const bubbleObj = catalog.find((i) => i.id === equippedBubble || i.id === `bubble_${equippedBubble}`);
    const badgeObj = catalog.find((i) => i.id === equippedBadge || i.id === `badge_${equippedBadge}`);
    const nameColorObj = catalog.find((i) => i.id === equippedNameColor || i.id === `name_color_${equippedNameColor}` || i.id === `name_${equippedNameColor}`);

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
          const localDaily = user?.id ? localStorage.getItem(`nexus_last_daily_${user.id}`) : null;
          setLastDailyClaim(profile.last_daily_claim || localDaily || null);
          setUnlockedItems(profile.unlocked_items || ['frame_default', 'bubble_default', 'wallpaper_default']);
          setEquippedFrame(profile.equipped_frame || 'default');
          setEquippedWallpaper(profile.equipped_wallpaper || 'default');
          setEquippedBubble(profile.equipped_bubble || 'default');
          setEquippedBadge(profile.equipped_badge || 'none');
          setEquippedNameColor(profile.equipped_name_color || 'default');
        }

        if (customItems && customItems.length > 0) {
          registerDynamicFrames(customItems);
          const catalogMap = new Map(SHOP_CATALOG.map((item) => [item.id, { ...item }]));
          customItems.forEach((ci) => {
            const existing = catalogMap.get(ci.id) || {};
            catalogMap.set(ci.id, {
              ...existing,
              id: ci.id,
              category: ci.category,
              name: ci.name || existing.name,
              description: ci.description || existing.description,
              price: typeof ci.price === 'number' ? ci.price : existing.price,
              icon: ci.icon || existing.icon || '✨',
              cssClass: ci.css_class || existing.cssClass || '',
              imageUrl: ci.image_url || existing.image || null,
              image: ci.image_url || existing.image || getFrameAsset(ci.id) || null,
              theme: existing.theme || null,
              themeName: existing.themeName || null,
              themeBanner: existing.themeBanner || null,
              isAnimated: existing.isAnimated || Boolean(ci.image_url || getFrameAsset(ci.id))
            });
          });
          setCatalog(Array.from(catalogMap.values()));
        }
      } catch (err) {
        console.error('Erro ao buscar dados remotos da loja:', err);
      }
    }
  };

  const handleClaimDaily = async () => {
    try {
      setClaiming(true);
      const todayStr = new Date().toISOString().slice(0, 10);
      const lastClaimDate = getFormattedClaimDate(lastDailyClaim) || (user?.id ? localStorage.getItem(`nexus_last_daily_${user.id}`) : null);

      if (lastClaimDate === todayStr) {
        setFeedbackMsg({ text: 'Você já resgatou seu bônus diário hoje! Volte amanhã.', type: 'info' });
        return;
      }

      const nowIso = new Date().toISOString();
      const rewardAmount = 50 + dailyStreak * 10;
      const newStreak = dailyStreak + 1;
      const newCoins = userCoins + rewardAmount;

      setUserCoins(newCoins);
      setDailyStreak(newStreak);
      setLastDailyClaim(nowIso);
      if (user?.id) {
        localStorage.setItem(`nexus_last_daily_${user.id}`, todayStr);
      }

      if (isSupabaseConfigured && supabase && user) {
        await supabase.from('profiles').update({
          nexus_coins: newCoins,
          daily_streak: newStreak,
          last_daily_claim: nowIso
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
          last_daily_claim: nowIso
        });
      }

      sounds.playPop();
      confetti({ particleCount: 90, spread: 70, origin: { y: 0.6 } });
      setFeedbackMsg({ text: `🎉 Bônus resgatado! Você recebeu +${rewardAmount} Nexus Coins!`, type: 'success' });
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
    setShowFittingRoom(true);
    sounds.playPop();
  };

  const handleResetPreview = () => {
    const frameObj = catalog.find((i) => i.id === equippedFrame || i.id === `frame_${equippedFrame}`);
    const wallObj = catalog.find((i) => i.id === equippedWallpaper || i.id === `wallpaper_${equippedWallpaper}`);
    const bubbleObj = catalog.find((i) => i.id === equippedBubble || i.id === `bubble_${equippedBubble}`);
    const badgeObj = catalog.find((i) => i.id === equippedBadge || i.id === `badge_${equippedBadge}`);
    const nameColorObj = catalog.find((i) => i.id === equippedNameColor || i.id === `name_color_${equippedNameColor}` || i.id === `name_${equippedNameColor}`);

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
      setFeedbackMsg({ text: `Saldo insuficiente! Faltam ${item.price - userCoins} Nexus Coins.`, type: 'error' });
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

        const purchaseDesc = item.discountPercent
          ? `Compra na Loja: ${item.name} (-${item.discountPercent}% Promoção)`
          : `Compra do item: ${item.name}`;

        await supabase.from('nexus_transactions').insert({
          user_id: user.id,
          amount: -item.price,
          type: 'shop_purchase',
          description: purchaseDesc
        });
      }

      if (updateProfile) {
        updateProfile({
          nexus_coins: newCoins,
          unlocked_items: newUnlocked
        });
      }

      sounds.playPop();
      confetti({ particleCount: 110, spread: 70, origin: { y: 0.6 } });
      setFeedbackMsg({ text: `✨ "${item.name}" desbloqueado com sucesso!`, type: 'success' });
    } catch (err) {
      setFeedbackMsg({ text: 'Erro ao realizar compra.', type: 'error' });
    } finally {
      setPurchasingId(null);
    }
  };

  // Cálculo inteligente dos pacotes temáticos com 25% de desconto e abatimento proporcional
  const getThemeBundleDetails = (theme) => {
    if (!theme) return null;
    const themeItemIds = theme.itemIds || [];
    const themeItems = themeItemIds.map(
      (id) => catalog.find((i) => i.id === id) || { id, price: 400, name: id }
    );
    const ownedItems = themeItems.filter((i) => unlockedItems.includes(i.id));
    const unownedItems = themeItems.filter((i) => !unlockedItems.includes(i.id));
    const ownedCount = ownedItems.length;
    const totalCount = themeItems.length;
    const isCompleted = totalCount > 0 && ownedCount === totalCount;
    const progressPercent = totalCount > 0 ? Math.round((ownedCount / totalCount) * 100) : 0;
    const originalPrice = unownedItems.reduce((acc, curr) => acc + (curr.price || 0), 0);
    const bundlePrice = Math.round(originalPrice * 0.75); // 25% OFF
    const savings = originalPrice - bundlePrice;

    return {
      theme,
      themeItems,
      ownedItems,
      unownedItems,
      ownedCount,
      totalCount,
      isCompleted,
      progressPercent,
      originalPrice,
      bundlePrice,
      savings
    };
  };

  const handleBuyBundle = async (theme, bundle) => {
    if (!bundle || bundle.unownedItems.length === 0) {
      setFeedbackMsg({ text: 'Você já possui todas as molduras desta coleção!', type: 'success' });
      return;
    }

    if (userCoins < bundle.bundlePrice) {
      sounds.playError?.();
      setFeedbackMsg({
        text: `Saldo insuficiente! Faltam ${bundle.bundlePrice - userCoins} Nexus Coins para o Pacote.`,
        type: 'error'
      });
      return;
    }

    const bundleKey = `bundle_${theme.id}`;
    try {
      setPurchasingId(bundleKey);
      const newCoins = userCoins - bundle.bundlePrice;
      const unownedIds = bundle.unownedItems.map((i) => i.id);
      const newUnlocked = Array.from(new Set([...unlockedItems, ...unownedIds]));

      const willComplete = newUnlocked.filter((id) => (theme.itemIds || []).includes(id)).length === (theme.itemIds || []).length;

      setUserCoins(newCoins);
      setUnlockedItems(newUnlocked);

      if (isSupabaseConfigured && supabase && user) {
        const updatePayload = {
          nexus_coins: newCoins,
          unlocked_items: newUnlocked
        };
        if (willComplete && theme.collectorBadge) {
          updatePayload.custom_title = theme.collectorBadge;
        }

        await supabase.from('profiles').update(updatePayload).eq('id', user.id);

        await supabase.from('nexus_transactions').insert({
          user_id: user.id,
          amount: -bundle.bundlePrice,
          type: 'shop_bundle_purchase',
          description: `Pacote Completo: ${theme.name} (${unownedIds.length} itens com 25% OFF)`
        });
      }

      if (updateProfile) {
        updateProfile({
          nexus_coins: newCoins,
          unlocked_items: newUnlocked,
          ...(willComplete && theme.collectorBadge ? { custom_title: theme.collectorBadge } : {})
        });
      }

      sounds.playPop();
      confetti({
        particleCount: 150,
        spread: 90,
        origin: { y: 0.55 },
        colors: ['#fbbf24', '#f59e0b', '#ec4899', '#a855f7', '#38bdf8']
      });

      const completionText = willComplete ? ` 🏆 Coleção 100% Completa! Título "${theme.collectorBadge}" conquistado!` : '';
      setFeedbackMsg({
        text: `🎉 Pacote "${theme.name}" adquirido com sucesso (-25% OFF)!${completionText}`,
        type: 'success'
      });
    } catch (err) {
      console.error('Erro ao comprar pacote:', err);
      setFeedbackMsg({ text: 'Erro ao processar compra do pacote.', type: 'error' });
    } finally {
      setPurchasingId(null);
    }
  };

  const handleEquipCollectorTitle = async (theme) => {
    if (!theme?.collectorBadge) return;
    try {
      if (isSupabaseConfigured && supabase && user) {
        await supabase.from('profiles').update({ custom_title: theme.collectorBadge }).eq('id', user.id);
      }
      if (updateProfile) {
        updateProfile({ custom_title: theme.collectorBadge });
      }
      sounds.playPop();
      confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
      setFeedbackMsg({
        text: `🏆 Título de Colecionador "${theme.collectorBadge}" equipado no seu perfil!`,
        type: 'success'
      });
    } catch (err) {
      setFeedbackMsg({ text: 'Erro ao equipar título.', type: 'error' });
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

  const allFrameItems = useMemo(() => {
    return catalog.filter((i) => i.category === 'frames');
  }, [catalog]);

  const rotationData = useMemo(() => {
    return calculateFrameRotation(allFrameItems, adminOffset, currentTime);
  }, [allFrameItems, adminOffset, currentTime]);

  const filteredItems = useMemo(() => {
    if (activeTab === 'frames') {
      if (framesViewMode === 'rotation') {
        return rotationData.rotatingFrames;
      }
      if (framesViewMode === 'night_terrors' || framesViewMode === 'dark_folklore' || framesViewMode === 'fall_floragers') {
        return allFrameItems
          .filter((f) => f.theme === framesViewMode)
          .map((f) => {
            const inRotation = rotationData.rotatingFrames.find((r) => r.id === f.id);
            return inRotation || f;
          });
      }
      return allFrameItems.map((f) => {
        const inRotation = rotationData.rotatingFrames.find((r) => r.id === f.id);
        return inRotation || f;
      });
    }
    return catalog.filter((i) => i.category === activeTab);
  }, [activeTab, framesViewMode, rotationData, allFrameItems, catalog]);

  // Mapeia TODOS os itens desbloqueados garantindo que nenhum item jamais suma do inventário
  const userInventoryItems = (unlockedItems || [])
    .filter((id) => id && id !== 'frame_default' && id !== 'bubble_default' && id !== 'wallpaper_default' && id !== 'default' && id !== 'none')
    .map((id) => {
      const found = catalog.find((i) => i.id === id);
      if (found) return found;

      const isFrame = id.startsWith('frame_') || Boolean(getFrameAsset(id));
      const isBubble = id.startsWith('bubble_');
      const isBadge = id.startsWith('badge_');
      const isWallpaper = id.startsWith('wallpaper_');
      const isNameColor = id.startsWith('name_');

      return {
        id,
        category: isFrame ? 'frames' : isBubble ? 'bubbles' : isBadge ? 'badges' : isWallpaper ? 'wallpapers' : isNameColor ? 'name_colors' : 'frames',
        name: id === 'frame_beta' ? 'Moldura BETA TESTER' : id.replace(/^(frame_|bubble_|badge_|wallpaper_|name_)/, '').replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
        description: id === 'frame_beta' ? 'Moldura animada exclusiva para testadores beta' : 'Item exclusivo desbloqueado',
        price: 0,
        icon: isFrame ? (id === 'frame_beta' ? '🧪' : '🖼️') : isBubble ? '💬' : isBadge ? '👑' : isWallpaper ? '🌐' : '✨',
        image: getFrameAsset(id) || null,
        cssClass: getFrameStyle(id) || ''
      };
    });

  const todayStr = new Date().toISOString().slice(0, 10);
  const lastClaimDate = getFormattedClaimDate(lastDailyClaim) || (user?.id ? localStorage.getItem(`nexus_last_daily_${user.id}`) : null);
  const canClaimDaily = lastClaimDate !== todayStr;

  const categories = [
    { id: 'frames', label: 'Molduras', icon: Sparkles, count: allFrameItems.length },
    { id: 'wallpapers', label: 'Planos de Fundo', icon: ImageIcon },
    { id: 'bubbles', label: 'Balões de Chat', icon: MessageSquare },
    { id: 'badges', label: 'Badges & Títulos', icon: Shield },
    { id: 'name_colors', label: 'Auras de Nome', icon: Palette },
    { id: 'inventory', label: 'Meu Inventário', icon: Package, badge: userInventoryItems.length }
  ];

  // Informação do tema selecionado atualmente (se houver)
  const currentThemeMeta = FRAME_THEMES.find((t) => t.id === framesViewMode);

  // Verifica se há alguma customização ativa no Provador
  const isPreviewModified =
    previewFrameItem?.id !== (equippedFrame === 'default' ? null : equippedFrame) ||
    previewWallpaperItem?.id !== (equippedWallpaper === 'default' ? null : equippedWallpaper) ||
    previewBubbleItem?.id !== (equippedBubble === 'default' ? null : equippedBubble) ||
    previewBadgeItem?.id !== (equippedBadge === 'none' ? null : equippedBadge) ||
    previewNameColorItem?.id !== (equippedNameColor === 'default' ? null : equippedNameColor);

  if (!isOpen || !user) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center safe-modal-overlay bg-black/80 backdrop-blur-md animate-fadeIn select-none overflow-hidden box-border">
      {/* Modal Card Principal: Fullscreen no Mobile com cantos arredondados no Desktop */}
      <div className="w-full max-w-5xl h-full sm:h-[92vh] sm:max-h-[860px] rounded-none sm:rounded-3xl border-0 sm:border border-slate-800/80 bg-slate-950/95 flex flex-col overflow-hidden relative shadow-2xl backdrop-blur-2xl box-border">
        
        {/* Glow de Iluminação Suave Profissional */}
        <div className="absolute -top-40 right-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-40 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* ============================================================ */}
        {/* 1. TOPBAR COMPACTA & PROFISSIONAL (Mobile-First)             */}
        {/* ============================================================ */}
        <header className="px-3.5 sm:px-6 py-2.5 sm:py-3.5 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md flex items-center justify-between gap-2.5 flex-shrink-0 z-20 min-w-0">
          {/* Lado Esquerdo: Logo + Título */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-amber-400 via-amber-500 to-yellow-600 text-slate-950 flex items-center justify-center shadow-md shadow-amber-500/20 font-black flex-shrink-0">
              <ShoppingBag className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h1 className="text-sm sm:text-base font-black text-white tracking-tight uppercase truncate">
                  Loja Nexus
                </h1>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30 uppercase hidden xs:inline">
                  Cosméticos
                </span>
              </div>
            </div>
          </div>

          {/* Lado Direito: Bônus Diário + Saldo + Fechar */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 flex-shrink-0">
            {/* Botão Compacto de Bônus Diário */}
            <button
              onClick={handleClaimDaily}
              disabled={!canClaimDaily || claiming}
              title={canClaimDaily ? 'Resgatar bônus gratuito de moedas!' : 'Bônus diário já resgatado hoje'}
              className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-[11px] sm:text-xs font-extrabold flex items-center gap-1.5 transition-all shadow-sm ${
                canClaimDaily
                  ? 'bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 text-slate-950 hover:brightness-110 active:scale-95 shadow-amber-500/20 animate-pulse'
                  : 'bg-slate-900 text-slate-400 border border-slate-800 cursor-default opacity-80'
              }`}
            >
              <Gift className="w-3.5 h-3.5 flex-shrink-0 text-current" />
              <span className="hidden sm:inline">
                {canClaimDaily ? `+${50 + dailyStreak * 10} Coins` : `Streak ${dailyStreak}d`}
              </span>
              <span className="sm:hidden font-black">
                {canClaimDaily ? 'Bônus' : `${dailyStreak}d ✓`}
              </span>
            </button>

            {/* Badge de Saldo de Moedas */}
            <div className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 shadow-inner">
              <img src="/nexus-coin.jpg" alt="Moeda" className="w-4 h-4 rounded-full shadow flex-shrink-0" />
              <span className="text-xs sm:text-sm font-black text-amber-300 tracking-tight">{userCoins}</span>
            </div>

            {/* Toggle Provador Virtual (Mobile & Desktop) */}
            <button
              onClick={() => setShowFittingRoom((prev) => !prev)}
              className={`p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-1 ${
                showFittingRoom
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : 'bg-slate-900 text-slate-300 hover:text-white border-slate-800'
              }`}
              title="Alternar visualização do provador"
            >
              <Eye className="w-4 h-4 flex-shrink-0 text-amber-400" />
              <span className="hidden md:inline text-[11px]">Provador</span>
              {showFittingRoom ? (
                <ChevronUp className="w-3 h-3 hidden md:inline text-slate-400" />
              ) : (
                <ChevronDown className="w-3 h-3 hidden md:inline text-slate-400" />
              )}
            </button>

            {/* Botão Fechar */}
            <button
              onClick={onClose}
              className="p-1.5 sm:p-2 rounded-xl text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 transition-all border border-slate-800 flex-shrink-0 active:scale-95"
              title="Fechar loja"
              aria-label="Fechar loja"
            >
              <X className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
            </button>
          </div>
        </header>

        {/* ============================================================ */}
        {/* 2. PROVADOR VIRTUAL RETRÁTIL / LIVE PREVIEW                  */}
        {/* ============================================================ */}
        {showFittingRoom && (
          <div className="p-3 sm:p-4 border-b border-slate-800/80 bg-slate-950/90 relative overflow-hidden transition-all duration-300 flex-shrink-0 z-10">
            {/* Wallpaper de fundo do preview com overlay suave */}
            <div
              className={`absolute inset-0 transition-all duration-500 pointer-events-none opacity-40 ${
                previewWallpaperItem?.cssClass || 'bg-slate-950'
              }`}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-950/80 to-slate-950/90 pointer-events-none" />

            <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-3 min-w-0">
              <div className="flex items-center gap-3 min-w-0 w-full sm:w-auto">
                {/* Avatar Preview */}
                <div className="relative flex-shrink-0 inline-flex items-center justify-center">
                  <img
                    src={user?.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${user?.id}`}
                    alt="Avatar Preview"
                    className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full object-cover transition-all duration-300 ${
                      previewFrameItem?.cssClass || (!previewFrameItem?.image ? 'border border-slate-700' : '')
                    }`}
                  />
                  {previewFrameItem?.image && (
                    <img
                      src={previewFrameItem.image}
                      alt="Moldura Preview"
                      className="absolute -inset-[22%] w-[144%] h-[144%] max-w-none pointer-events-none object-contain z-10 select-none drop-shadow-md"
                    />
                  )}
                  <span className="absolute -bottom-1 -right-1 p-0.5 bg-amber-500 rounded-full text-slate-950 shadow-md">
                    <Sparkles className="w-2.5 h-2.5" />
                  </span>
                </div>

                {/* Perfil & Balão Preview */}
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span
                      className={`text-xs sm:text-sm font-extrabold transition-all duration-300 truncate max-w-[140px] sm:max-w-none ${
                        previewNameColorItem?.cssClass || 'text-white'
                      }`}
                    >
                      {user?.display_name || user?.username || 'Damon'}
                    </span>

                    {previewBadgeItem && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded-full font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/40 uppercase truncate">
                        <span>{previewBadgeItem.icon || '👑'}</span> {previewBadgeItem.label || previewBadgeItem.name}
                      </span>
                    )}
                  </div>

                  {/* Balão de Chat */}
                  <div
                    className={`px-2.5 py-1 rounded-xl text-[11px] sm:text-xs max-w-full sm:max-w-md transition-all duration-300 shadow-md truncate ${
                      previewBubbleItem?.cssClass || 'bg-brand-600/30 border border-brand-500/40 text-slate-200'
                    }`}
                  >
                    Preview ao vivo no chat ✨
                  </div>
                </div>
              </div>

              {/* Botões do Provador */}
              <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto pt-1 sm:pt-0 border-t sm:border-t-0 border-slate-800">
                <span className="text-[10px] text-amber-300 font-bold uppercase tracking-wider bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
                  Provador Ativo
                </span>
                <button
                  type="button"
                  onClick={handleResetPreview}
                  className="px-2.5 py-1 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-[11px] font-bold border border-slate-800 transition-all flex items-center gap-1 active:scale-95"
                >
                  <RotateCcw className="w-3 h-3 text-slate-400" />
                  <span>Resetar</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Feedback Alert Notificação */}
        {feedbackMsg.text && (
          <div
            className={`px-3.5 py-2 text-xs font-semibold flex items-center justify-between flex-shrink-0 animate-fadeIn z-20 ${
              feedbackMsg.type === 'success'
                ? 'bg-emerald-500/15 border-b border-emerald-500/30 text-emerald-300'
                : 'bg-rose-500/15 border-b border-rose-500/30 text-rose-300'
            }`}
          >
            <div className="flex items-center gap-2 truncate mr-2">
              <span>{feedbackMsg.type === 'success' ? '✨' : '⚠️'}</span>
              <span className="truncate">{feedbackMsg.text}</span>
            </div>
            <button
              onClick={() => setFeedbackMsg({ text: '', type: '' })}
              className="p-1 text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* ============================================================ */}
        {/* 3. BARRA DE NAVEGAÇÃO PRINCIPAL (Abas de Categorias)         */}
        {/* ============================================================ */}
        <nav className="px-3.5 sm:px-6 py-2 border-b border-slate-800/80 bg-slate-950/60 flex items-center gap-1.5 overflow-x-auto no-scrollbar flex-shrink-0 z-10">
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
                className={`py-1.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap flex-shrink-0 ${
                  isActive
                    ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-black shadow-md shadow-amber-500/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent'
                }`}
              >
                <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                <span>{cat.label}</span>
                {cat.badge !== undefined && (
                  <span
                    className={`text-[9px] px-1.5 py-0.2 rounded-full font-black ${
                      isActive ? 'bg-black/20 text-slate-950' : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {cat.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* ============================================================ */}
        {/* 4. CORPO PRINCIPAL ROLÁVEL COM CONTEÚDO DO CATÁLOGO          */}
        {/* ============================================================ */}
        <div className="flex-1 overflow-y-auto px-3.5 sm:px-6 py-3.5 sm:py-5 space-y-3.5 sm:space-y-4 min-h-0 box-border">
          {/* ABA INVENTÁRIO */}
          {activeTab === 'inventory' ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-xs sm:text-sm font-black text-slate-300 uppercase tracking-wide">
                  Meus Itens Desbloqueados ({userInventoryItems.length})
                </h2>
              </div>

              {userInventoryItems.length === 0 ? (
                <div className="p-12 text-center text-slate-500 text-xs border border-slate-800/80 rounded-2xl bg-slate-900/40">
                  Você ainda não possui cosméticos desbloqueados. Explore as categorias da Loja para personalizar seu perfil!
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 sm:gap-3.5">
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
                        className={`p-3 rounded-2xl border transition-all flex flex-col justify-between shadow-lg relative ${
                          isEquipped
                            ? 'bg-slate-900/90 border-emerald-500/60 shadow-emerald-500/10'
                            : 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700'
                        }`}
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-lg">{item.icon}</span>
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 uppercase font-semibold">
                              {item.category}
                            </span>
                          </div>

                          {/* Mini Preview do Item */}
                          <div className="p-2 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-center min-h-[58px]">
                            {item.category === 'frames' && (() => {
                              const frameImg = item.image || item.imageUrl || FRAME_ANIMATED_ASSETS[item.id];
                              return (
                                <div className="relative inline-flex items-center justify-center w-12 h-12">
                                  <img
                                    src={user?.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${user?.id}`}
                                    alt="preview"
                                    className={`w-9 h-9 rounded-full object-cover bg-slate-900 ${
                                      item.cssClass || (!frameImg ? 'border border-slate-700' : '')
                                    }`}
                                  />
                                  {frameImg && (
                                    <img
                                      src={frameImg}
                                      alt="moldura"
                                      className="absolute -inset-[20%] w-[140%] h-[140%] max-w-none pointer-events-none object-contain z-10 select-none"
                                    />
                                  )}
                                </div>
                              );
                            })()}
                            {item.category === 'bubbles' && (
                              <div className={`px-2 py-1 rounded-lg text-[10px] font-medium truncate ${item.cssClass}`}>
                                Exemplo de Balão
                              </div>
                            )}
                            {item.category === 'badges' && (
                              <span className="text-[9px] px-2 py-0.5 rounded-full font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 uppercase truncate">
                                {item.label || item.name}
                              </span>
                            )}
                            {item.category === 'name_colors' && (
                              <span className={`text-xs font-black truncate ${item.cssClass}`}>
                                {user?.display_name || 'Damon'}
                              </span>
                            )}
                            {item.category === 'wallpapers' && (
                              <div className={`w-full h-7 rounded ${item.cssClass} border border-slate-700 flex items-center justify-center text-[10px] text-slate-300 font-bold truncate px-1`}>
                                Fundo do Chat
                              </div>
                            )}
                          </div>

                          <div className="min-w-0">
                            <h3 className="text-xs font-bold text-white truncate">{item.name}</h3>
                            <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">{item.description}</p>
                          </div>
                        </div>

                        <div className="mt-3 pt-2.5 border-t border-slate-800 flex items-center gap-1.5">
                          <button
                            onClick={() => handlePreviewItem(item)}
                            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
                            title="Testar no provador"
                          >
                            <Eye className="w-3.5 h-3.5 text-amber-400" />
                          </button>
                          {isEquipped ? (
                            <button
                              onClick={() => handleUnequip(item.category)}
                              className="flex-1 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-bold flex items-center justify-center gap-1 hover:bg-emerald-500/30"
                            >
                              <Check className="w-3.5 h-3.5" /> <span>Equipado</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => handleEquipItem(item)}
                              className="flex-1 py-1.5 rounded-xl bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/40 text-xs font-bold flex items-center justify-center gap-1 active:scale-95"
                            >
                              <Sparkles className="w-3.5 h-3.5" /> <span>Equipar</span>
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
            <div className="space-y-3.5 sm:space-y-4">
              {/* ============================================================ */}
              {/* ABA DE MOLDURAS: SELETOR DE TEMAS & BANNERS PANORÂMICOS      */}
              {/* ============================================================ */}
              {activeTab === 'frames' && (
                <div className="space-y-3">
                  {/* Seletor de Coleções em Chips */}
                  <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => setFramesViewMode('rotation')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap flex-shrink-0 ${
                        framesViewMode === 'rotation'
                          ? 'bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20'
                          : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
                      }`}
                    >
                      <Zap className="w-3.5 h-3.5 text-amber-400 fill-current" />
                      <span>Vitrine Rotativa ({rotationData.rotatingFrames.length})</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setFramesViewMode('night_terrors')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap flex-shrink-0 ${
                        framesViewMode === 'night_terrors'
                          ? 'bg-purple-600 text-white font-black shadow-md shadow-purple-500/25 border border-purple-400'
                          : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
                      }`}
                    >
                      <span>👁️ Night Terrors</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setFramesViewMode('dark_folklore')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap flex-shrink-0 ${
                        framesViewMode === 'dark_folklore'
                          ? 'bg-emerald-600 text-slate-950 font-black shadow-md shadow-emerald-500/25 border border-emerald-400'
                          : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
                      }`}
                    >
                      <span>🦋 Dark Folklore</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setFramesViewMode('fall_floragers')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap flex-shrink-0 ${
                        framesViewMode === 'fall_floragers'
                          ? 'bg-amber-600 text-slate-950 font-black shadow-md shadow-amber-500/25 border border-amber-400'
                          : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
                      }`}
                    >
                      <span>🌸 Fall Floragers</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setFramesViewMode('all')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap flex-shrink-0 ${
                        framesViewMode === 'all'
                          ? 'bg-slate-700 text-white font-black border border-slate-600'
                          : 'bg-slate-900 text-slate-400 hover:bg-slate-800 border border-slate-800'
                      }`}
                    >
                      <span>Todas ({allFrameItems.length})</span>
                    </button>
                  </div>

                  {/* Header da Vitrine Ativa: Timer 72h */}
                  {framesViewMode === 'rotation' && (
                    <div className="p-3 sm:p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-sm">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center justify-center flex-shrink-0">
                          <Clock className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-extrabold text-white">Ciclo #{rotationData.cycleIndex}</span>
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                              Rotação de 72h
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400 truncate">
                            Molduras ativas e promoções dinâmicas da rodada
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-amber-300 font-black text-xs self-start sm:self-auto">
                        <Clock className="w-3.5 h-3.5 text-amber-400 animate-spin [animation-duration:10s]" />
                        <span>{formatRemainingRotationTime(rotationData.msRemaining)}</span>
                      </div>
                    </div>
                  )}

                  {/* Banner do Tema Específico Selecionado (Night Terrors / Dark Folklore / Fall Floragers) */}
                  {currentThemeMeta && (() => {
                    const bundle = getThemeBundleDetails(currentThemeMeta);
                    return (
                      <div className="space-y-2.5">
                        {/* Banner Panorâmico Cinemático */}
                        <div className="relative overflow-hidden rounded-2xl border border-slate-800 shadow-xl bg-slate-950 aspect-[4.2/1] sm:aspect-[4.8/1]">
                          <img
                            src={currentThemeMeta.banner}
                            alt={currentThemeMeta.name}
                            className="w-full h-full object-cover object-center"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent p-3 sm:p-4 flex flex-col justify-end">
                            <div className="flex items-center gap-2">
                              <span className="text-[9px] sm:text-[10px] font-black px-2 py-0.5 rounded-md bg-amber-500 text-slate-950 uppercase shadow">
                                {currentThemeMeta.badge}
                              </span>
                              {bundle?.isCompleted && (
                                <span className="text-[9px] sm:text-[10px] font-black px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3" /> Coleção Completa
                                </span>
                              )}
                            </div>
                            <h2 className="text-xs sm:text-base font-black text-white mt-1">{currentThemeMeta.name}</h2>
                            <p className="text-[10px] sm:text-xs text-slate-300 line-clamp-1">{currentThemeMeta.description}</p>
                          </div>
                        </div>

                        {/* Card de Gamificação de Colecionador & Pacote com 25% OFF */}
                        {bundle && (
                          <div className="p-3 sm:p-4 rounded-2xl bg-gradient-to-r from-slate-900/90 via-slate-900 to-slate-950 border border-slate-800/90 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-3.5">
                            {/* Progresso de Coleção */}
                            <div className="space-y-1.5 flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-1.5 text-xs font-black text-white">
                                  <Crown className="w-4 h-4 text-amber-400 flex-shrink-0" />
                                  <span>Coleção de Maestria:</span>
                                  <span className="text-amber-300 font-extrabold">
                                    {bundle.ownedCount}/{bundle.totalCount} ({bundle.progressPercent}%)
                                  </span>
                                </div>
                                {bundle.isCompleted ? (
                                  <span className="text-[10px] text-emerald-400 font-black bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                                    100% Concluído ✨
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-slate-400 font-medium">
                                    Faltam {bundle.unownedItems.length} {bundle.unownedItems.length === 1 ? 'moldura' : 'molduras'}
                                  </span>
                                )}
                              </div>

                              {/* Barra de Progresso com degradê temático */}
                              <div className="w-full h-2.5 rounded-full bg-slate-950 border border-slate-800 overflow-hidden shadow-inner">
                                <div
                                  className="h-full bg-gradient-to-r from-amber-500 via-rose-500 to-purple-600 transition-all duration-700 rounded-full"
                                  style={{ width: `${bundle.progressPercent}%` }}
                                />
                              </div>

                              {/* Recompensa de Conclusão / Título */}
                              <div className="flex items-center justify-between gap-2 pt-0.5">
                                <div className="flex items-center gap-1.5 text-[11px] text-slate-300 truncate">
                                  <Sparkles className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                                  <span className="text-slate-400">Título Exclusivo:</span>
                                  <span className="font-bold text-amber-300 truncate">"{currentThemeMeta.collectorBadge}"</span>
                                </div>

                                {bundle.isCompleted && (
                                  <button
                                    type="button"
                                    onClick={() => handleEquipCollectorTitle(currentThemeMeta)}
                                    className="text-[10px] font-black px-2.5 py-1 rounded-xl bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/40 transition-all flex items-center gap-1 shrink-0 active:scale-95 shadow"
                                    title="Equipar título no perfil"
                                  >
                                    <Crown className="w-3 h-3" />
                                    <span>Equipar Título</span>
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Botão de Compra de Pacote (Bundle com 25% de Desconto) */}
                            {!bundle.isCompleted && (
                              <div className="pt-2 md:pt-0 border-t md:border-t-0 border-slate-800/80 flex items-center justify-between md:justify-end gap-3 flex-shrink-0">
                                <div className="text-left md:text-right">
                                  <div className="flex items-center md:justify-end gap-1.5">
                                    <span className="text-[10px] text-slate-400 line-through">
                                      {bundle.originalPrice} NC
                                    </span>
                                    <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                                      -25% OFF
                                    </span>
                                  </div>
                                  <div className="flex items-center md:justify-end gap-1 font-black text-xs sm:text-sm text-amber-300">
                                    <img src="/nexus-coin.jpg" alt="Moeda" className="w-3.5 h-3.5 rounded-full" />
                                    <span>{bundle.bundlePrice} NC</span>
                                    <span className="text-[10px] text-emerald-400 font-bold ml-1 hidden sm:inline">
                                      (-{bundle.savings} NC)
                                    </span>
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => handleBuyBundle(currentThemeMeta, bundle)}
                                  disabled={userCoins < bundle.bundlePrice || purchasingId === `bundle_${currentThemeMeta.id}`}
                                  className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shadow-lg flex-shrink-0 active:scale-95 ${
                                    userCoins >= bundle.bundlePrice
                                      ? 'bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 text-white hover:brightness-110 shadow-purple-600/25'
                                      : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                                  }`}
                                >
                                  <Package className="w-3.5 h-3.5" />
                                  <span>Comprar Pacote</span>
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* Banner do Tema em Destaque do Ciclo (quando na Vitrine Rotativa) */}
                  {framesViewMode === 'rotation' && rotationData.featuredTheme && (
                    <div className="relative overflow-hidden rounded-2xl border border-slate-800 shadow-md bg-slate-950 aspect-[4.5/1] sm:aspect-[5.2/1]">
                      <img
                        src={rotationData.featuredTheme.banner}
                        alt={rotationData.featuredTheme.name}
                        className="w-full h-full object-cover object-center"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/50 to-transparent p-3 sm:p-4 flex flex-col justify-end">
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-black px-2 py-0.5 rounded bg-amber-500 text-slate-950 uppercase shadow">
                            Tema em Destaque do Ciclo
                          </span>
                        </div>
                        <h3 className="text-xs sm:text-sm font-black text-white mt-0.5">{rotationData.featuredTheme.name}</h3>
                        <p className="text-[10px] text-slate-300 line-clamp-1">{rotationData.featuredTheme.description}</p>
                      </div>
                    </div>
                  )}

                  {/* Card Compacto: OFERTA RELÂMPAGO DO CICLO */}
                  {framesViewMode === 'rotation' && rotationData.flashDeal && !unlockedItems.includes(rotationData.flashDeal.id) && (
                    <div className="p-3 sm:p-3.5 rounded-2xl bg-gradient-to-r from-rose-950/60 via-slate-900 to-amber-950/40 border border-rose-500/40 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg">
                      <div className="flex items-center gap-3 min-w-0 w-full sm:w-auto">
                        <div
                          onClick={() => handlePreviewItem(rotationData.flashDeal)}
                          className="relative w-12 h-12 flex-shrink-0 cursor-pointer inline-flex items-center justify-center hover:scale-105 transition-transform"
                          title="Testar no provador"
                        >
                          <img
                            src={user?.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${user?.id}`}
                            alt="preview"
                            className="w-9 h-9 rounded-full object-cover bg-slate-900"
                          />
                          {(rotationData.flashDeal.image || FRAME_ANIMATED_ASSETS[rotationData.flashDeal.id]) && (
                            <img
                              src={rotationData.flashDeal.image || FRAME_ANIMATED_ASSETS[rotationData.flashDeal.id]}
                              alt="moldura"
                              className="absolute -inset-[20%] w-[140%] h-[140%] max-w-none pointer-events-none object-contain z-10 drop-shadow-md"
                            />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="px-2 py-0.2 rounded bg-rose-600 text-white text-[9px] font-black uppercase flex items-center gap-1 animate-pulse">
                              <Zap className="w-3 h-3 fill-current" /> Oferta Relâmpago
                            </span>
                            <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[9px] font-black border border-amber-500/30">
                              -{rotationData.flashDeal.discountPercent}% OFF
                            </span>
                          </div>
                          <h4 className="text-xs font-black text-white mt-0.5 truncate">{rotationData.flashDeal.name}</h4>
                          <p className="text-[10px] text-slate-300 truncate">{rotationData.flashDeal.description}</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto pt-1 sm:pt-0 border-t sm:border-t-0 border-slate-800">
                        <div className="text-right">
                          <span className="text-[9px] text-slate-400 line-through mr-1.5">
                            {rotationData.flashDeal.originalPrice}
                          </span>
                          <span className="text-xs font-black text-amber-300">
                            {rotationData.flashDeal.price} Coins
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleBuyItem(rotationData.flashDeal)}
                          disabled={userCoins < rotationData.flashDeal.price || purchasingId === rotationData.flashDeal.id}
                          className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all active:scale-95 ${
                            userCoins >= rotationData.flashDeal.price
                              ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md shadow-amber-500/20'
                              : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                          }`}
                        >
                          Comprar Oferta
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ============================================================ */}
              {/* GRADE DE CARDS DOS ITENS DO CATÁLOGO                         */}
              {/* ============================================================ */}
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-3.5">
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
                      className={`p-3 rounded-2xl border transition-all flex flex-col justify-between shadow-md relative group ${
                        isEquipped
                          ? 'bg-slate-900/95 border-emerald-500/60 shadow-emerald-500/10'
                          : isUnlocked
                          ? 'bg-slate-900/70 border-slate-800 hover:border-slate-700'
                          : 'bg-slate-900/60 border-slate-800/80 hover:border-amber-500/40 hover:bg-slate-900/90'
                      }`}
                    >
                      {/* Topo do Card: Ícone + Tags/Descontos */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-1 min-w-0">
                          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center text-sm sm:text-base flex-shrink-0">
                            {item.icon}
                          </div>

                          {/* Status de Desbloqueado ou Preço */}
                          {isUnlocked ? (
                            <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 font-extrabold flex items-center gap-0.5 border border-emerald-500/30">
                              <Check className="w-2.5 h-2.5" /> Adquirido
                            </span>
                          ) : (
                            <div className="flex items-center gap-1 flex-shrink-0">
                              {item.discountPercent > 0 && (
                                <span className="text-[8px] font-black px-1 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                                  -{item.discountPercent}%
                                </span>
                              )}
                              <div className="flex items-center gap-1 text-[11px] font-black text-amber-300">
                                <img src="/nexus-coin.jpg" alt="Moeda" className="w-3 h-3 rounded-full" />
                                <span>{item.price}</span>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Janela de Preview Visual do Cosmético */}
                        <div
                          onClick={() => handlePreviewItem(item)}
                          className="p-2 rounded-xl bg-slate-950/80 border border-slate-800/80 flex items-center justify-center min-h-[64px] sm:min-h-[72px] cursor-pointer hover:border-amber-500/40 transition-all"
                          title="Clique para testar no provador"
                        >
                          {item.category === 'frames' && (() => {
                            const frameImg = item.image || item.imageUrl || FRAME_ANIMATED_ASSETS[item.id];
                            return (
                              <div className="relative inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14">
                                <img
                                  src={user?.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${user?.id}`}
                                  alt="preview"
                                  className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full object-cover bg-slate-900 shadow-inner ${
                                    item.cssClass || (!frameImg ? 'border border-slate-700' : '')
                                  }`}
                                />
                                {frameImg && (
                                  <img
                                    src={frameImg}
                                    alt="moldura"
                                    className="absolute -inset-[20%] w-[140%] h-[140%] max-w-none pointer-events-none object-contain z-10 select-none drop-shadow-md"
                                  />
                                )}
                              </div>
                            );
                          })()}

                          {item.category === 'bubbles' && (
                            <div className={`px-2 py-1 rounded-lg text-[10px] font-medium truncate ${item.cssClass}`}>
                              Exemplo de Balão
                            </div>
                          )}

                          {item.category === 'badges' && (
                            <span className="text-[9px] px-2 py-0.5 rounded-full font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 uppercase shadow truncate">
                              {item.label || item.name}
                            </span>
                          )}

                          {item.category === 'name_colors' && (
                            <span className={`text-xs font-black truncate ${item.cssClass}`}>
                              {user?.display_name || 'Damon'}
                            </span>
                          )}

                          {item.category === 'wallpapers' && (
                            <div className={`w-full h-7 rounded ${item.cssClass} border border-slate-700 flex items-center justify-center text-[9px] text-slate-300 font-bold truncate px-1`}>
                              Fundo do Chat
                            </div>
                          )}
                        </div>

                        {/* Título, Badges e Descrição */}
                        <div className="min-w-0 space-y-1">
                          <div className="flex items-center gap-1 flex-wrap">
                            <h3 className="text-xs font-black text-white group-hover:text-amber-300 transition-colors truncate">
                              {item.name}
                            </h3>
                            {item.themeName && (
                              <span className={`text-[8px] font-black px-1.5 py-0.2 rounded border truncate ${
                                item.theme === 'night_terrors'
                                  ? 'bg-purple-950/60 text-purple-300 border-purple-500/40'
                                  : item.theme === 'dark_folklore'
                                  ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40'
                                  : item.theme === 'fall_floragers'
                                  ? 'bg-amber-950/60 text-amber-300 border-amber-500/40'
                                  : 'bg-slate-800 text-slate-300 border-slate-700'
                              }`}>
                                {item.themeName}
                              </span>
                            )}
                            {item.isAnimated && (
                              <span className="text-[8px] font-black px-1 py-0.2 rounded bg-cyan-950/60 text-cyan-300 border border-cyan-500/40 uppercase">
                                GIF
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-400 line-clamp-2 leading-snug min-h-[26px]">
                            {item.description}
                          </p>
                        </div>
                      </div>

                      {/* Ações do Card */}
                      <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handlePreviewItem(item)}
                          className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all flex-shrink-0"
                          title="Testar no provador"
                        >
                          <Eye className="w-3.5 h-3.5 text-amber-400" />
                        </button>

                        {/* Botão de Presentear Amigo */}
                        <button
                          type="button"
                          onClick={() => setGiftTargetItem(item)}
                          className="p-1.5 rounded-xl bg-pink-500/15 hover:bg-pink-500/25 text-pink-400 border border-pink-500/30 text-xs font-bold transition-all flex-shrink-0 active:scale-95"
                          title={`Presentear um amigo com "${item.name}"`}
                        >
                          <Gift className="w-3.5 h-3.5 text-pink-400" />
                        </button>

                        {isEquipped ? (
                          <button
                            onClick={() => handleUnequip(item.category)}
                            className="flex-1 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[11px] sm:text-xs font-bold flex items-center justify-center gap-1 hover:bg-emerald-500/30 truncate"
                          >
                            <Check className="w-3 h-3 flex-shrink-0" /> <span className="truncate">Equipado</span>
                          </button>
                        ) : isUnlocked ? (
                          <button
                            onClick={() => handleEquipItem(item)}
                            className="flex-1 py-1.5 rounded-xl bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/40 text-[11px] sm:text-xs font-bold flex items-center justify-center gap-1 transition-all truncate active:scale-95"
                          >
                            <Sparkles className="w-3 h-3 flex-shrink-0" /> <span className="truncate">Equipar</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => handleBuyItem(item)}
                            disabled={!canAfford || purchasingId === item.id}
                            className={`flex-1 py-1.5 rounded-xl text-[11px] sm:text-xs font-black flex items-center justify-center gap-1 shadow-sm transition-all truncate active:scale-95 ${
                              canAfford
                                ? 'bg-gradient-to-r from-amber-500 to-yellow-500 hover:brightness-110 text-slate-950'
                                : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                            }`}
                          >
                            <span className="truncate">{canAfford ? `Comprar` : 'Sem Saldo'}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Modal de Presentear Amigos */}
        <ShopGiftModal
          isOpen={Boolean(giftTargetItem)}
          onClose={() => setGiftTargetItem(null)}
          item={giftTargetItem}
          currentUser={user}
          onGiftSent={({ newCoins, recipientName, item: giftedItem }) => {
            setUserCoins(newCoins);
            if (updateProfile) {
              updateProfile({ nexus_coins: newCoins });
            }
            setFeedbackMsg({
              text: `🎁 Você presenteou ${recipientName} com "${giftedItem.name}"!`,
              type: 'success'
            });
          }}
        />
      </div>
    </div>
  );
}

export default NexusShopModal;
