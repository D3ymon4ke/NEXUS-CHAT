import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { apiRequest } from '../../lib/api';
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
  Lock
} from 'lucide-react';

export function NexusShopModal({ isOpen, onClose }) {
  const { user, updateProfile } = useAuth();
  const [activeTab, setActiveTab] = useState('frames'); // 'frames' | 'bubbles' | 'badges' | 'name_colors'
  const [catalog, setCatalog] = useState([]);
  const [userEconomy, setUserEconomy] = useState({
    coins: user?.nexus_coins || 100,
    dailyStreak: user?.daily_streak || 0,
    lastDailyClaim: user?.last_daily_claim || null,
    equippedFrame: user?.equipped_frame || 'default',
    equippedBubble: user?.equipped_bubble || 'default',
    equippedBadge: user?.equipped_badge || 'none',
    equippedNameColor: user?.equipped_name_color || 'default',
    unlockedItems: user?.unlocked_items || ['frame_default', 'bubble_default']
  });
  const [loading, setLoading] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [purchasingId, setPurchasingId] = useState(null);
  const [feedbackMsg, setFeedbackMsg] = useState({ text: '', type: '' });

  useEffect(() => {
    if (!isOpen) return;
    loadCatalog();
  }, [isOpen]);

  const loadCatalog = async () => {
    try {
      setLoading(true);
      const res = await apiRequest('/economy/shop');
      if (res.success) {
        setCatalog(res.catalog || []);
        if (res.userEconomy) {
          setUserEconomy(res.userEconomy);
        }
      }
    } catch (err) {
      console.error('Erro ao carregar loja:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleClaimDaily = async () => {
    try {
      setClaiming(true);
      setFeedbackMsg({ text: '', type: '' });
      const res = await apiRequest('/economy/claim-daily', { method: 'POST' });

      if (res.success) {
        confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
        sounds.playPop();
        setUserEconomy(prev => ({
          ...prev,
          coins: res.totalCoins,
          dailyStreak: res.newStreak,
          lastDailyClaim: new Date().toISOString()
        }));
        setFeedbackMsg({ text: res.message, type: 'success' });
      } else {
        setFeedbackMsg({ text: res.error || 'Falha ao coletar bônus diário.', type: 'error' });
      }
    } catch (err) {
      setFeedbackMsg({ text: 'Erro de conexão.', type: 'error' });
    } finally {
      setClaiming(false);
    }
  };

  const handleBuyItem = async (item) => {
    try {
      setPurchasingId(item.id);
      setFeedbackMsg({ text: '', type: '' });
      const res = await apiRequest('/economy/buy', {
        method: 'POST',
        body: JSON.stringify({ itemId: item.id })
      });

      if (res.success) {
        confetti({ particleCount: 60, spread: 60, origin: { y: 0.7 } });
        sounds.playPop();
        setUserEconomy(prev => ({
          ...prev,
          coins: res.totalCoins,
          unlockedItems: res.unlockedItems
        }));
        setFeedbackMsg({ text: res.message, type: 'success' });
        // Auto-equipar após comprar
        handleEquipItem(item.category, item.id);
      } else {
        setFeedbackMsg({ text: res.error || 'Saldo insuficiente de Nexus Coins.', type: 'error' });
      }
    } catch (err) {
      setFeedbackMsg({ text: 'Erro ao comprar item.', type: 'error' });
    } finally {
      setPurchasingId(null);
    }
  };

  const handleEquipItem = async (category, itemId) => {
    try {
      const res = await apiRequest('/economy/equip', {
        method: 'POST',
        body: JSON.stringify({ category, itemId })
      });

      if (res.success) {
        sounds.playPop();
        const fieldMap = {
          frames: 'equippedFrame',
          bubbles: 'equippedBubble',
          badges: 'equippedBadge',
          name_colors: 'equippedNameColor'
        };
        const fieldName = fieldMap[category];
        setUserEconomy(prev => ({ ...prev, [fieldName]: itemId }));
      }
    } catch (err) {
      console.error('Erro ao equipar item:', err);
    }
  };

  if (!isOpen) return null;

  const currentItems = catalog.filter(i => i.category === activeTab);

  const isTodayClaimed = userEconomy.lastDailyClaim && 
    new Date(userEconomy.lastDailyClaim).toDateString() === new Date().toDateString();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn select-none">
      <div className="glass-modal w-full max-w-2xl rounded-3xl p-6 shadow-2xl border border-amber-500/30 flex flex-col max-h-[90vh] overflow-hidden relative">
        {/* Glow de Fundo */}
        <div className="absolute -top-24 -right-24 w-60 h-60 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-60 h-60 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Topbar do Modal: Saldo de Nexus Coins + Fechar */}
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
                <h2 className="text-xl font-extrabold text-white tracking-wide">LOJA NEXUS</h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500/20 to-cyan-500/20 text-amber-300 border border-amber-500/40 font-bold uppercase">
                  Economia Ativa
                </span>
              </div>
              <p className="text-xs text-slate-400">Desbloqueie molduras, auras e efeitos exclusivos</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Widget de Saldo */}
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-2xl bg-gradient-to-r from-amber-950/60 to-slate-900 border border-amber-500/50 shadow-md">
              <img src="/nexus-coin.jpg" alt="Moeda" className="w-5 h-5 rounded-full" />
              <span className="font-extrabold text-amber-300 text-sm">{userEconomy.coins}</span>
              <span className="text-[10px] text-amber-400/80 font-bold">NEXUS</span>
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
        <div className="my-4 p-4 rounded-2xl bg-gradient-to-r from-indigo-950/60 via-slate-900 to-amber-950/50 border border-amber-500/30 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/40">
              <Flame className="w-6 h-6 text-amber-400 animate-bounceShort" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white">Recompensa Diária de Login</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300">
                  Sequência: {userEconomy.dailyStreak} dia(s) 🔥
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Ganhe até +250 moedas todos os dias entrando no chat! (+5 por mensagem enviada)
              </p>
            </div>
          </div>

          <button
            onClick={handleClaimDaily}
            disabled={claiming || isTodayClaimed}
            className={`px-5 py-2.5 rounded-xl font-bold text-xs shadow-lg transition-all flex items-center gap-1.5 flex-shrink-0 ${
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
                <Sparkles className="w-4 h-4" /> Coletar Moedas Diárias
              </>
            )}
          </button>
        </div>

        {feedbackMsg.text && (
          <div
            className={`mb-3 p-3 rounded-xl text-xs font-semibold flex items-center gap-2 animate-fadeIn ${
              feedbackMsg.type === 'success'
                ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
                : 'bg-rose-500/15 border border-rose-500/30 text-rose-300'
            }`}
          >
            <span>{feedbackMsg.type === 'success' ? '✨' : '⚠️'}</span>
            <span>{feedbackMsg.text}</span>
          </div>
        )}

        {/* Abas de Categorias */}
        <div className="flex bg-background-surface/80 p-1 rounded-2xl border border-slate-800 mb-4">
          {[
            { id: 'frames', label: 'Molduras de Avatar', icon: Sparkles },
            { id: 'bubbles', label: 'Cores de Balão', icon: MessageSquare },
            { id: 'badges', label: 'Títulos & Badges', icon: Shield },
            { id: 'name_colors', label: 'Cores de Nome', icon: Palette }
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
                    ? 'bg-gradient-to-r from-amber-600 to-brand-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Grade de Itens da Loja */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-3 min-h-[220px]">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400 text-xs gap-2">
              <div className="w-6 h-6 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
              <span>Carregando itens da loja...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {currentItems.map((item) => {
                const isUnlocked = userEconomy.unlockedItems.includes(item.id);
                const isEquipped =
                  (activeTab === 'frames' && userEconomy.equippedFrame === item.id) ||
                  (activeTab === 'bubbles' && userEconomy.equippedBubble === item.id) ||
                  (activeTab === 'badges' && userEconomy.equippedBadge === item.id) ||
                  (activeTab === 'name_colors' && userEconomy.equippedNameColor === item.id);

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

                      {/* Pré-visualização Visual do Efeito */}
                      <div className="my-3 p-3 rounded-xl bg-background-dark/80 border border-white/5 flex items-center justify-center min-h-[60px]">
                        {activeTab === 'frames' && (
                          <div className="relative">
                            <img
                              src={user?.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${user?.id}`}
                              alt="preview"
                              className={`w-12 h-12 rounded-full object-cover ${item.cssClass}`}
                            />
                          </div>
                        )}

                        {activeTab === 'bubbles' && (
                          <div className={`px-4 py-2 rounded-2xl text-xs font-medium ${item.cssClass}`}>
                            Exemplo de mensagem com estilo! 🚀
                          </div>
                        )}

                        {activeTab === 'badges' && (
                          <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-bold flex items-center gap-1 shadow-sm">
                            {item.icon} {item.label}
                          </span>
                        )}

                        {activeTab === 'name_colors' && (
                          <span className={`text-base font-bold ${item.cssClass}`}>
                            {user?.display_name || 'Seu Nome no Chat'}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Rodapé do Card: Preço e Botão */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 mt-2">
                      {!isUnlocked ? (
                        <div className="flex items-center gap-1 text-amber-300 font-extrabold text-xs">
                          <img src="/nexus-coin.jpg" alt="Moeda" className="w-4 h-4 rounded-full" />
                          <span>{item.price}</span>
                          <span className="text-[10px] text-slate-400">coins</span>
                        </div>
                      ) : (
                        <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" /> Adquirido
                        </span>
                      )}

                      <div>
                        {isEquipped ? (
                          <button
                            onClick={() => handleEquipItem(item.category, 'default')}
                            className="px-3.5 py-1.5 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-bold hover:bg-amber-500/30 transition-colors"
                          >
                            Equipado ✨
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
                            disabled={purchasingId === item.id || userEconomy.coins < item.price}
                            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
                              userEconomy.coins >= item.price
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
