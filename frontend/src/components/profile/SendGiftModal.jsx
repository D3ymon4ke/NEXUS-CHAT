import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase, isSupabaseConfigured } from '../../lib/supabaseClient';
import { GIFT_CATALOG, GIFT_RARITIES } from '../../lib/giftCatalog';
import { sounds } from '../../lib/sound';
import confetti from 'canvas-confetti';
import {
  Gift,
  X,
  Coins,
  Send,
  Sparkles,
  MessageSquare,
  Flame,
  Check,
  Heart
} from 'lucide-react';

export function SendGiftModal({
  isOpen,
  onClose,
  targetUser,
  onGiftSent
}) {
  const { user: currentUser, updateProfile } = useAuth();
  const [selectedRarity, setSelectedRarity] = useState('all'); // 'all' | 'common' | 'rare' | 'epic' | 'legendary' | 'mythic'
  const [selectedGift, setSelectedGift] = useState(GIFT_CATALOG[0]);
  const [quantity, setQuantity] = useState(1);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState({ text: '', type: '' });

  if (!isOpen || !targetUser || !currentUser) return null;

  const userCoins = currentUser?.nexus_coins || 0;
  const totalPrice = (selectedGift?.price || 0) * quantity;
  const canAfford = userCoins >= totalPrice;

  const filteredGifts = selectedRarity === 'all'
    ? GIFT_CATALOG
    : GIFT_CATALOG.filter(g => g.rarity === selectedRarity);

  const handleSendGift = async (e) => {
    e.preventDefault();
    if (!selectedGift) return;

    if (!canAfford) {
      sounds.playError?.();
      setFeedbackMsg({
        text: `Saldo insuficiente! Você precisa de mais ${totalPrice - userCoins} Nexus Coins.`,
        type: 'error'
      });
      return;
    }

    try {
      setSending(true);
      setFeedbackMsg({ text: '', type: '' });

      const newCoins = userCoins - totalPrice;

      // 1. Atualizar saldo do remetente
      if (isSupabaseConfigured && supabase) {
        await supabase
          .from('profiles')
          .update({ nexus_coins: newCoins })
          .eq('id', currentUser.id);

        // 2. Inserir registro em user_gifts
        await supabase
          .from('user_gifts')
          .insert({
            sender_id: currentUser.id,
            recipient_id: targetUser.id,
            gift_id: selectedGift.id,
            gift_name: selectedGift.name,
            gift_icon: selectedGift.icon,
            rarity: selectedGift.rarity,
            price: selectedGift.price,
            quantity: quantity,
            message: message.trim() || null
          });

        // 3. Registrar transação
        await supabase
          .from('nexus_transactions')
          .insert({
            user_id: currentUser.id,
            amount: -totalPrice,
            type: 'gift_sent',
            description: `Presente enviado para @${targetUser.username}: ${selectedGift.name} (x${quantity})`
          });
      }

      // Atualizar localmente no AuthContext
      if (updateProfile) {
        updateProfile({ nexus_coins: newCoins });
      }

      sounds.playPop();
      confetti({
        particleCount: 90,
        spread: 70,
        origin: { y: 0.6 }
      });

      setFeedbackMsg({
        text: `🎉 Presente "${selectedGift.name}" enviado com sucesso para ${targetUser.display_name || targetUser.username}!`,
        type: 'success'
      });

      if (onGiftSent) {
        onGiftSent({
          gift: selectedGift,
          quantity,
          message: message.trim(),
          recipient: targetUser
        });
      }

      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      console.error('Erro ao enviar presente:', err);
      setFeedbackMsg({ text: 'Erro ao enviar presente.', type: 'error' });
    } finally {
      setSending(false);
    }
  };

  const rarityList = [
    { id: 'all', label: 'Todos' },
    { id: 'common', label: 'Comum' },
    { id: 'rare', label: 'Raro' },
    { id: 'epic', label: 'Épico' },
    { id: 'legendary', label: 'Lendário' },
    { id: 'mythic', label: 'Mítico' }
  ];

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-xl animate-fadeIn select-none overflow-hidden box-border">
      <div className="w-full max-w-lg rounded-2xl sm:rounded-3xl p-3.5 sm:p-6 shadow-2xl border border-amber-500/40 bg-gradient-to-b from-slate-900/95 via-background-darker/95 to-slate-950/95 flex flex-col h-full max-h-[96vh] sm:max-h-[90vh] overflow-hidden relative backdrop-blur-2xl min-w-0 box-border">
        {/* Glow de Fundo */}
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-rose-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Topbar: Destinatário + Saldo + Fechar */}
        <div className="flex items-center justify-between pb-3 sm:pb-4 border-b border-slate-800 flex-shrink-0 min-w-0">
          <div className="flex items-center gap-2.5 min-w-0 flex-1 mr-2">
            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-gradient-to-br from-amber-500 to-yellow-600 flex items-center justify-center text-black shadow-lg shadow-amber-500/20 flex-shrink-0">
              <Gift className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h2 className="text-sm sm:text-base font-extrabold text-white tracking-wide truncate">
                  ENVIAR PRESENTE
                </h2>
                <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold uppercase flex-shrink-0">
                  Para @{targetUser.username}
                </span>
              </div>
              <p className="text-[10px] sm:text-xs text-slate-400 truncate">
                Demonstre carinho e reconhecimento enviando presentes animados
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Saldo de Moedas */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold shadow-sm">
              <img src="/nexus-coin.jpg" alt="Moeda" className="w-4 h-4 rounded-full flex-shrink-0" />
              <span>{userCoins}</span>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Fechar"
              aria-label="Fechar"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>

        {/* Feedback Alert */}
        {feedbackMsg.text && (
          <div
            className={`my-2 p-2.5 rounded-xl text-xs font-semibold flex items-center justify-between animate-fadeIn flex-shrink-0 ${
              feedbackMsg.type === 'success'
                ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 shadow-emerald-500/10'
                : 'bg-rose-500/15 border border-rose-500/30 text-rose-300 shadow-rose-500/10'
            }`}
          >
            <span className="truncate mr-2">{feedbackMsg.text}</span>
            <button onClick={() => setFeedbackMsg({ text: '', type: '' })}>
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Abas de Raridade */}
        <div className="flex bg-slate-900/80 p-1 rounded-xl border border-slate-800/80 my-2 sm:my-3 overflow-x-auto no-scrollbar gap-1 flex-shrink-0 w-full max-w-full box-border">
          {rarityList.map((r) => {
            const isActive = selectedRarity === r.id;
            return (
              <button
                key={r.id}
                onClick={() => setSelectedRarity(r.id)}
                className={`py-1 px-2.5 sm:px-3 text-xs font-bold rounded-lg transition-all whitespace-nowrap flex-shrink-0 ${
                  isActive
                    ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-black shadow font-extrabold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                {r.label}
              </button>
            );
          })}
        </div>

        {/* Grid de Presentes */}
        <div className="flex-1 overflow-y-auto pr-1 min-h-[140px] max-h-[240px] min-w-0 box-border">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-2.5">
            {filteredGifts.map((gift) => {
              const isSelected = selectedGift?.id === gift.id;
              const rarityConfig = GIFT_RARITIES[gift.rarity] || GIFT_RARITIES.common;

              return (
                <div
                  key={gift.id}
                  onClick={() => setSelectedGift(gift)}
                  className={`p-2.5 sm:p-3 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between relative overflow-hidden group select-none min-w-0 ${
                    isSelected
                      ? `bg-slate-900 ${rarityConfig.borderClass} ${rarityConfig.glowClass} ring-2 ring-amber-400/50 scale-[1.02]`
                      : 'bg-slate-900/70 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-[8px] sm:text-[9px] px-1.5 py-0.2 rounded-full font-extrabold uppercase border ${rarityConfig.badgeClass}`}>
                      {rarityConfig.label}
                    </span>

                    <div className="flex items-center gap-1 text-[10px] sm:text-[11px] font-bold text-amber-300">
                      <img src="/nexus-coin.jpg" alt="Moeda" className="w-3 h-3 rounded-full flex-shrink-0" />
                      <span>{gift.price}</span>
                    </div>
                  </div>

                  <div className="flex flex-col items-center justify-center my-1 text-center">
                    <span className={`text-3xl sm:text-4xl transition-transform group-hover:scale-110 ${gift.animation}`}>
                      {gift.icon}
                    </span>
                    <h4 className="text-xs font-bold text-white mt-1 truncate max-w-full">
                      {gift.name}
                    </h4>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Formulário de Quantidade & Mensagem */}
        <form onSubmit={handleSendGift} className="mt-2.5 sm:mt-3 pt-2.5 sm:pt-3 border-t border-slate-800/80 space-y-2 sm:space-y-2.5 flex-shrink-0 min-w-0">
          {/* Seletor de Quantidade */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] text-slate-300 font-bold">Quantidade:</span>
            <div className="flex gap-1.5">
              {[1, 2, 5, 10].map((qty) => (
                <button
                  key={qty}
                  type="button"
                  onClick={() => setQuantity(qty)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-colors ${
                    quantity === qty
                      ? 'bg-amber-500 text-black border-amber-400 font-extrabold shadow'
                      : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750'
                  }`}
                >
                  {qty}x
                </button>
              ))}
            </div>
          </div>

          {/* Mensagem Carinhosa Opcional */}
          <div>
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Escreva uma mensagem especial (opcional)..."
              maxLength={120}
              className="w-full px-3 py-1.5 sm:py-2 rounded-xl bg-background-dark border border-slate-700 text-xs text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none"
            />
          </div>

          {/* Botão de Envio com Preço Total */}
          <button
            type="submit"
            disabled={sending || !canAfford}
            className={`w-full py-2.5 sm:py-3 rounded-xl sm:rounded-2xl font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-lg transition-all active:scale-95 ${
              canAfford
                ? 'bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 hover:from-amber-400 text-black shadow-amber-500/20'
                : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
            }`}
          >
            <Send className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">
              {canAfford
                ? `Enviar ${selectedGift?.name} por ${totalPrice} Coins`
                : `Saldo Insuficiente (${totalPrice} Coins)`}
            </span>
          </button>
        </form>
      </div>
    </div>
  );
}
