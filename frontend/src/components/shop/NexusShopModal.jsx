import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { apiRequest } from '../../lib/api';
import { supabase, isSupabaseConfigured } from '../../lib/supabaseClient';
import { SHOP_CATALOG } from '../../lib/shopCatalog';
import { sounds } from '../../lib/sound';
import confetti from 'canvas-confetti';
import {
  ShoppingBag,
  Sparkles,
  Calendar,
  Check,
  Crown,
  Flame,
  X,
  Palette,
  MessageSquare,
  Shield,
  Zap,
  Package,
  Layers
} from 'lucide-react';

export function NexusShopModal({ isOpen, onClose }) {
  const { user, updateProfile } = useAuth();
  const [activeTab, setActiveTab] = useState('frames'); // 'frames' | 'bubbles' | 'badges' | 'name_colors' | 'inventory'
  const [catalog] = useState(SHOP_CATALOG);
  const [userCoins, setUserCoins] = useState(user?.nexus_coins || 100);
  const [dailyStreak, setDailyStreak] = useState(user?.daily_streak || 0);
  const [lastDailyClaim, setLastDailyClaim] = useState(user?.last_daily_claim || null);
  const [unlockedItems, setUnlockedItems] = useState(user?.unlocked_items || ['frame_default', 'bubble_default']);

  const [equippedFrame, setEquippedFrame] = useState(user?.equipped_frame || 'default');
  const [equippedBubble, setEquippedBubble] = useState(user?.equipped_bubble || 'default');
  const [equippedBadge, setEquippedBadge] = useState(user?.equipped_badge || 'none');
  const [equippedNameColor, setEquippedNameColor] = useState(user?.equipped_name_color || 'default');

  const [claiming, setClaiming] = useState(false);
  const [purchasingId, setPurchasingId] = useState(null);
  const [feedbackMsg, setFeedbackMsg] = useState({ text: '', type: '' });

  // Sincroniza dados do usuário ao abrir o modal
  useEffect(() => {
    if (!isOpen || !user) return;
    setUserCoins(user.nexus_coins || 100);
    setDailyStreak(user.daily_streak || 0);
    setLastDailyClaim(user.last_daily_claim || null);
    setUnlockedItems(user.unlocked_items || ['frame_default', 'bubble_default']);
    setEquippedFrame(user.equipped_frame || 'default');
    setEquippedBubble(user.equipped_bubble || 'default');
    setEquippedBadge(user.equipped_badge || 'none');
    setEquippedNameColor(user.equipped_name_color || 'default');

    loadRemoteData();
  }, [isOpen, user?.id]);

  const loadRemoteData = async () => {
    if (isSupabaseConfigured && supabase && user) {
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('nexus_coins, daily_streak, last_daily_claim, equipped_frame, equipped_bubble, equipped_badge, equipped_name_color, unlocked_items')
          .eq('id', user.id)
          .single();

        if (profile) {
          setUserCoins(profile.nexus_coins || 100);
          setDailyStreak(profile.daily_streak || 0);
          setLastDailyClaim(profile.last_daily_claim || null);
          setUnlockedItems(profile.unlocked_items || ['frame_default', 'bubble_default']);
          setEquippedFrame(profile.equipped_frame || 'default');
          setEquippedBubble(profile.equipped_bubble || 'default');
          setEquippedBadge(profile.equipped_badge || 'none');
          setEquippedNameColor(profile.equipped_name_color || 'default');
        }
      } catch (err) {
        console.error('Erro ao buscar dados remotos da loja:', err);
      }
    }
  };

  const handleClaimDaily = async () => {
    try {
      setClaiming(true);
      setFeedbackMsg({ text: '', type: '' });
      const now = new Date();

      if (lastDailyClaim && new Date(lastDailyClaim).toDateString() === now.toDateString()) {
        setFeedbackMsg({ text: 'Você já coletou seu bônus diário hoje. Volte amanhã!', type: 'error' });
        setClaiming(false);
        return;
      }

      let newStreak = 1;
      if (lastDailyClaim) {
        const yesterday = new Date(now);
        yesterday.setDate(now.getDate() - 1);
        if (new Date(lastDailyClaim).toDateString() === yesterday.toDateString()) {
          newStreak = (dailyStreak || 0) + 1;
        }
      }

      const rewardCoins = Math.min(50 + (newStreak - 1) * 25, 250);
      const newTotalCoins = (userCoins || 0) + rewardCoins;

      if (isSupabaseConfigured && supabase && user) {
        await supabase
          .from('profiles')
          .update({
            nexus_coins: newTotalCoins,
            daily_streak: newStreak,
            last_daily_claim: now.toISOString()
          })
          .eq('id', user.id);

        await supabase.from('nexus_transactions').insert({
          user_id: user.id,
          amount: rewardCoins,
          type: 'daily_claim',
          description: `Bônus Diário (Sequência: ${newStreak} dias)`
        });
      }

      confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
      sounds.playPop();
      setUserCoins(newTotalCoins);
      setDailyStreak(newStreak);
      setLastDailyClaim(now.toISOString());
      if (updateProfile) updateProfile({ nexus_coins: newTotalCoins, daily_streak: newStreak, last_daily_claim: now.toISOString() });
      setFeedbackMsg({ text: `+${rewardCoins} Nexus Coins coletadas com sucesso! Sequência de ${newStreak} dia(s)!`, type: 'success' });
    } catch (err) {
      setFeedbackMsg({ text: 'Erro ao coletar bônus diário.', type: 'error' });
    } finally {
      setClaiming(false);
    }
  };

  const handleBuyItem = async (item) => {
    try {
      setPurchasingId(item.id);
      setFeedbackMsg({ text: '', type: '' });

      if (unlockedItems.includes(item.id)) {
        setFeedbackMsg({ text: 'Você já possui este item!', type: 'error' });
        setPurchasingId(null);
        return;
      }

      if (userCoins < item.price) {
        setFeedbackMsg({ text: `Nexus Coins insuficientes. Você tem ${userCoins} e o item custa ${item.price}.`, type: 'error' });
        setPurchasingId(null);
        return;
      }

      const newCoins = userCoins - item.price;
      const newUnlocked = [...unlockedItems, item.id];

      if (isSupabaseConfigured && supabase && user) {
        await supabase
          .from('profiles')
          .update({
            nexus_coins: newCoins,
            unlocked_items: newUnlocked
          })
          .eq('id', user.id);

        await supabase.from('nexus_transactions').insert({
          user_id: user.id,
          amount: -item.price,
          type: 'shop_purchase',
          description: `Compra na Loja: ${item.name}`
        });
      }

      confetti({ particleCount: 70, spread: 60, origin: { y: 0.7 } });
      sounds.playPop();
      setUserCoins(newCoins);
      setUnlockedItems(newUnlocked);
      if (updateProfile) updateProfile({ nexus_coins: newCoins, unlocked_items: newUnlocked });
      setFeedbackMsg({ text: `Você desbloqueou "${item.name}" com sucesso!`, type: 'success' });

      // Auto-equipar após comprar
      handleEquipItem(item.category, item.id);
    } catch (err) {
      setFeedbackMsg({ text: 'Erro ao processar compra.', type: 'error' });
    } finally {
      setPurchasingId(null);
    }
  };

  const handleEquipItem = async (category, itemId) => {
    try {
      const fieldMap = {
        frames: 'equipped_frame',
        bubbles: 'equipped_bubble',
        badges: 'equipped_badge',
        name_colors: 'equipped_name_color'
      };

      const fieldName = fieldMap[category];
      if (!fieldName) return;

      if (category === 'frames') setEquippedFrame(itemId);
      if (category === 'bubbles') setEquippedBubble(itemId);
      if (category === 'badges') setEquippedBadge(itemId);
      if (category === 'name_colors') setEquippedNameColor(itemId);

      if (isSupabaseConfigured && supabase && user) {
        await supabase
          .from('profiles')
          .update({ [fieldName]: itemId })
          .eq('id', user.id);
      }

      if (updateProfile) updateProfile({ [fieldName]: itemId });
      sounds.playPop();
    } catch (err) {
      console.error('Erro ao equipar item:', err);
    }
  };

  if (!isOpen) return null;

  const currentItems = activeTab === 'inventory'
    ? catalog.filter(i => unlockedItems.includes(i.id))
    : catalog.filter(i => i.category === activeTab);

  const isTodayClaimed = lastDailyClaim && 
    new Date(lastDailyClaim).toDateString() === new Date().toDateString();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn select-none">
      <div className="glass-modal w-full max-w-2xl rounded-3xl p-6 shadow-2xl border border-amber-500/30 flex flex-col max-h-[90vh] overflow-hidden relative">
        {/* Glow de Fundo */}
        <div className="absolute -top-24 -right-24 w-60 h-60 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-60 h-60 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Topbar do Modal */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="relative">
              <img
                src="/nexus-coin.jpg"
                alt="Nexus Coin"
                className="w-12 h-12 rounded-2xl object-cover border border-amber-400/80 shadow-lg shadow-amber-500/20"
              />
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
              </span>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="text-xl font-extrabold text-white tracking-wide">LOJA & INVENTÁRIO NEXUS</h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500/20 to-cyan-500/20 text-amber-300 border border-amber-500/40 font-bold uppercase">
                  Itens & Efeitos
                </span>
              </div>
              <p className="text-xs text-slate-400">Compre molduras, balões e auras ou gerencie seu inventário</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Saldo de Moedas */}
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-2xl bg-gradient-to-r from-amber-950/60 to-slate-900 border border-amber-500/50 shadow-md">
              <img src="/nexus-coin.jpg" alt="Moeda" className="w-5 h-5 rounded-full" />
              <span className="font-extrabold text-amber-300 text-sm">{userCoins}</span>
              <span className="text-[10px] text-amber-400/80 font-bold">COINS</span>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-background-surface transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Banner de Check-in Diário */}
        <div className="my-3.5 p-3.5 rounded-2xl bg-gradient-to-r from-indigo-950/60 via-slate-900 to-amber-950/50 border border-amber-500/30 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/40">
              <Flame className="w-6 h-6 text-amber-400 animate-bounceShort" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white">Recompensa Diária de Login</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300">
                  Sequência: {dailyStreak} dia(s) 🔥
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Ganhe até +250 moedas entrando diariamente! (+5 por mensagem no chat)
              </p>
            </div>
          </div>

          <button
            onClick={handleClaimDaily}
            disabled={claiming || isTodayClaimed}
            className={`px-4 py-2 rounded-xl font-bold text-xs shadow-lg transition-all flex items-center gap-1.5 flex-shrink-0 ${
              isTodayClaimed
                ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                : 'bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black shadow-amber-500/25 hover:scale-105'
            }`}
          >
            {claiming ? (
              'Coletando...'
            ) : isTodayClaimed ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" /> Coletado Hoje
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" /> Coletar Bônus Diário
              </>
            )}
          </button>
        </div>

        {feedbackMsg.text && (
          <div
            className={`mb-3 p-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 animate-fadeIn ${
              feedbackMsg.type === 'success'
                ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
                : 'bg-rose-500/15 border border-rose-500/30 text-rose-300'
            }`}
          >
            <span>{feedbackMsg.type === 'success' ? '✨' : '⚠️'}</span>
            <span>{feedbackMsg.text}</span>
          </div>
        )}

        {/* Abas: Categorias da Loja + Meu Inventário */}
        <div className="flex bg-background-surface/80 p-1 rounded-2xl border border-slate-800 mb-3">
          {[
            { id: 'frames', label: 'Molduras', icon: Sparkles },
            { id: 'bubbles', label: 'Cores de Balão', icon: MessageSquare },
            { id: 'badges', label: 'Badges & Títulos', icon: Shield },
            { id: 'name_colors', label: 'Cores de Nome', icon: Palette },
            { id: 'inventory', label: '🎒 Meu Inventário', icon: Package, highlight: true }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setFeedbackMsg({ text: '', type: '' });
                }}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                  isActive
                    ? tab.highlight
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md'
                      : 'bg-gradient-to-r from-amber-600 to-brand-600 text-white shadow-md'
                    : tab.highlight
                    ? 'text-emerald-400 hover:bg-emerald-500/10'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Grade de Itens */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-3 min-h-[220px]">
          {activeTab === 'inventory' && currentItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400 text-xs gap-2">
              <Package className="w-10 h-10 text-slate-600 mb-1" />
              <span className="font-bold text-slate-300">Seu inventário está vazio!</span>
              <p className="text-slate-500 text-center max-w-xs">
                Explore as abas de Molduras, Balões e Badges da Loja para comprar itens com suas Nexus Coins.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {currentItems.map((item) => {
                const isUnlocked = unlockedItems.includes(item.id);
                const isEquipped =
                  (item.category === 'frames' && equippedFrame === item.id) ||
                  (item.category === 'bubbles' && equippedBubble === item.id) ||
                  (item.category === 'badges' && equippedBadge === item.id) ||
                  (item.category === 'name_colors' && equippedNameColor === item.id);

                return (
                  <div
                    key={item.id}
                    className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                      isEquipped
                        ? 'bg-gradient-to-br from-amber-950/30 to-brand-950/40 border-amber-500/60 shadow-lg shadow-amber-500/10'
                        : isUnlocked
                        ? 'bg-background-surface/80 border-slate-700/80 hover:border-slate-600'
                        : 'bg-background-surface/40 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      {/* Topo do Card */}
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{item.icon}</span>
                          <div>
                            <h4 className="text-sm font-bold text-white">{item.name}</h4>
                            <p className="text-[11px] text-slate-400">{item.description}</p>
                          </div>
                        </div>
                      </div>

                      {/* Pré-visualização Visual */}
                      <div className="my-2.5 p-3 rounded-xl bg-background-dark/80 border border-white/5 flex items-center justify-center min-h-[55px]">
                        {item.category === 'frames' && (
                          <div className="relative">
                            <img
                              src={user?.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${user?.id}`}
                              alt="preview"
                              className={`w-12 h-12 rounded-full object-cover ${item.cssClass}`}
                            />
                          </div>
                        )}

                        {item.category === 'bubbles' && (
                          <div className={`px-3.5 py-1.5 rounded-2xl text-xs font-medium ${item.cssClass}`}>
                            Exemplo de mensagem estilizada! 💬
                          </div>
                        )}

                        {item.category === 'badges' && (
                          <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-bold flex items-center gap-1 shadow-sm">
                            {item.icon} {item.label}
                          </span>
                        )}

                        {item.category === 'name_colors' && (
                          <span className={`text-base font-bold ${item.cssClass}`}>
                            {user?.display_name || 'Seu Nome'}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Rodapé do Card: Preço e Ação */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 mt-1">
                      {!isUnlocked ? (
                        <div className="flex items-center gap-1 text-amber-300 font-extrabold text-xs">
                          <img src="/nexus-coin.jpg" alt="Moeda" className="w-4 h-4 rounded-full" />
                          <span>{item.price}</span>
                          <span className="text-[10px] text-slate-400">coins</span>
                        </div>
                      ) : (
                        <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" /> Desbloqueado
                        </span>
                      )}

                      <div>
                        {isEquipped ? (
                          <button
                            onClick={() => handleEquipItem(item.category, 'default')}
                            className="px-3 py-1.5 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-bold hover:bg-rose-500/20 hover:text-rose-300 hover:border-rose-500/40 transition-colors"
                          >
                            Equipado ✨ (Desequipar)
                          </button>
                        ) : isUnlocked ? (
                          <button
                            onClick={() => handleEquipItem(item.category, item.id)}
                            className="px-3.5 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold transition-all shadow"
                          >
                            Equipar
                          </button>
                        ) : (
                          <button
                            onClick={() => handleBuyItem(item)}
                            disabled={purchasingId === item.id || userCoins < item.price}
                            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
                              userCoins >= item.price
                                ? 'bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 text-black shadow-md hover:scale-105'
                                : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                            }`}
                          >
                            {purchasingId === item.id ? 'Comprando...' : 'Comprar'}
                          </button>
                        )}
                      </div>
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
