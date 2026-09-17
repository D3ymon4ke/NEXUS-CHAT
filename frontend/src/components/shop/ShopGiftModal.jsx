import React, { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../../lib/supabaseClient';
import { sounds } from '../../lib/sound';
import { haptics } from '../../lib/haptics';
import confetti from 'canvas-confetti';
import {
  Gift,
  X,
  Search,
  Check,
  Sparkles,
  AlertCircle,
  Coins,
  Send,
  User,
  Heart,
  Loader2
} from 'lucide-react';
import { getFrameAsset, getFrameStyle } from '../../lib/shopCatalog';

export function ShopGiftModal({
  isOpen,
  onClose,
  item,
  currentUser,
  onGiftSent
}) {
  const [friends, setFriends] = useState([]);
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const userCoins = currentUser?.nexus_coins || 0;
  const itemPrice = item?.price || 0;
  const canAfford = userCoins >= itemPrice;

  // Carregar lista de amigos aceitos e outros perfis para presentear
  useEffect(() => {
    if (!isOpen || !currentUser) return;
    loadFriends();
    setSelectedFriend(null);
    setMessage('');
    setErrorMsg('');
    setSearchQuery('');
  }, [isOpen, currentUser?.id, item?.id]);

  const loadFriends = async () => {
    if (!isSupabaseConfigured || !supabase || !currentUser) return;
    try {
      setLoadingFriends(true);

      // 1. Buscar amizades aceitas
      const { data: acceptedFriendships } = await supabase
        .from('friendships')
        .select('user_id, friend_id')
        .eq('status', 'accepted')
        .or(`user_id.eq.${currentUser.id},friend_id.eq.${currentUser.id}`);

      let friendIds = [];
      if (acceptedFriendships && acceptedFriendships.length > 0) {
        friendIds = acceptedFriendships
          .map((f) => (f.user_id === currentUser.id ? f.friend_id : f.user_id))
          .filter(Boolean);
      }

      // 2. Buscar perfis (priorizar amigos; se lista for pequena, trazer outros contatos)
      let query = supabase
        .from('profiles')
        .select('id, display_name, username, avatar_url, unlocked_items, equipped_frame, status')
        .neq('id', currentUser.id)
        .limit(50);

      if (friendIds.length > 0) {
        // Trazer amigos primeiro
        const { data: friendProfiles } = await supabase
          .from('profiles')
          .select('id, display_name, username, avatar_url, unlocked_items, equipped_frame, status')
          .in('id', friendIds);

        const { data: otherProfiles } = await supabase
          .from('profiles')
          .select('id, display_name, username, avatar_url, unlocked_items, equipped_frame, status')
          .neq('id', currentUser.id)
          .not('id', 'in', `(${friendIds.join(',')})`)
          .limit(30);

        const merged = [
          ...(friendProfiles || []).map((p) => ({ ...p, isFriend: true })),
          ...(otherProfiles || []).map((p) => ({ ...p, isFriend: false }))
        ];
        setFriends(merged);
      } else {
        const { data: allProfiles } = await query;
        setFriends((allProfiles || []).map((p) => ({ ...p, isFriend: false })));
      }
    } catch (err) {
      console.error('Erro ao carregar contatos para presente:', err);
    } finally {
      setLoadingFriends(false);
    }
  };

  if (!isOpen || !item) return null;

  const filteredFriends = friends.filter((f) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    const nameMatch = (f.display_name || '').toLowerCase().includes(q);
    const userMatch = (f.username || '').toLowerCase().includes(q);
    return nameMatch || userMatch;
  });

  const handleSendGift = async () => {
    if (!selectedFriend) {
      setErrorMsg('Selecione um amigo para enviar o presente.');
      return;
    }

    if (!canAfford) {
      sounds.playError?.();
      haptics.error();
      setErrorMsg(`Saldo insuficiente! Você precisa de mais ${itemPrice - userCoins} NC.`);
      return;
    }

    const alreadyHas = (selectedFriend.unlocked_items || []).includes(item.id);
    if (alreadyHas) {
      sounds.playError?.();
      haptics.error();
      setErrorMsg(`${selectedFriend.display_name || selectedFriend.username} já possui esta moldura!`);
      return;
    }

    try {
      setSending(true);
      setErrorMsg('');

      const newCoins = userCoins - itemPrice;
      const recipientUnlocked = Array.from(new Set([...(selectedFriend.unlocked_items || []), item.id]));

      if (isSupabaseConfigured && supabase) {
        // 1. Debitar saldo do remetente
        const { error: debitErr } = await supabase
          .from('profiles')
          .update({ nexus_coins: newCoins })
          .eq('id', currentUser.id);

        if (debitErr) throw new Error(debitErr.message);

        // 2. Adicionar item ao inventário do amigo
        const { error: creditErr } = await supabase
          .from('profiles')
          .update({ unlocked_items: recipientUnlocked })
          .eq('id', selectedFriend.id);

        if (creditErr) {
          // Reverter débito se falhar
          await supabase.from('profiles').update({ nexus_coins: userCoins }).eq('id', currentUser.id);
          throw new Error(creditErr.message);
        }

        // 3. Registrar transações
        const senderName = currentUser.display_name || currentUser.username || 'Alguém';
        const recipientName = selectedFriend.display_name || selectedFriend.username || 'Amigo';

        await supabase.from('nexus_transactions').insert([
          {
            user_id: currentUser.id,
            amount: -itemPrice,
            type: 'shop_gift_sent',
            description: `Presente da Loja enviado para ${recipientName}: ${item.name}`
          },
          {
            user_id: selectedFriend.id,
            amount: 0,
            type: 'shop_gift_received',
            description: `Presente da Loja recebido de ${senderName}: ${item.name}`
          }
        ]);

        // 4. Registrar em user_gifts para a aba de presentes do perfil
        try {
          await supabase.from('user_gifts').insert({
            sender_id: currentUser.id,
            recipient_id: selectedFriend.id,
            gift_id: item.id,
            gift_name: item.name,
            gift_icon: item.icon || '🎁',
            rarity: item.rarity || 'epic',
            price: itemPrice,
            quantity: 1,
            message: message.trim() || `Presente especial da Loja Nexus: ${item.name}!`
          });
        } catch (gErr) {
          console.warn('Registro em user_gifts ignorado:', gErr);
        }
      }

      sounds.playPop();
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#ec4899', '#a855f7', '#fbbf24', '#38bdf8']
      });

      if (onGiftSent) {
        onGiftSent({
          newCoins,
          recipientName: selectedFriend.display_name || selectedFriend.username || 'Amigo',
          item
        });
      }

      onClose();
    } catch (err) {
      console.error('Erro ao enviar presente:', err);
      sounds.playError?.();
      setErrorMsg(err.message || 'Erro ao enviar presente. Tente novamente.');
    } finally {
      setSending(false);
    }
  };

  const frameAsset = getFrameAsset(item.id);
  const frameStyle = getFrameStyle(item.id);

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-neutral-900 border border-neutral-800/80 rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        
        {/* Header com degradê de presente */}
        <div className="relative px-5 py-4 border-b border-neutral-800/80 bg-gradient-to-r from-pink-950/40 via-neutral-900 to-purple-950/40 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-pink-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-pink-500/20">
              <Gift className="w-5 h-5 animate-bounce" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                Presentear com Moldura
                <span className="text-[11px] font-semibold text-pink-400 bg-pink-500/10 px-2 py-0.5 rounded-full border border-pink-500/20">
                  Nexus Shop
                </span>
              </h3>
              <p className="text-xs text-neutral-400">
                Surpreenda um amigo com um item desbloqueado diretamente no perfil dele!
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-white rounded-xl hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Resumo do Item Sendo Presenteado */}
        <div className="px-5 py-3.5 bg-neutral-950/60 border-b border-neutral-800/60 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="relative w-12 h-12 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center shrink-0">
              <span className="text-xl">{item.icon || '🎁'}</span>
              {frameAsset && (
                <img
                  src={frameAsset}
                  alt={item.name}
                  className="absolute inset-0 w-full h-full object-contain pointer-events-none scale-125"
                />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-white truncate">{item.name}</p>
              <p className="text-xs text-neutral-400 truncate">{item.description || 'Moldura Oficial Nexus'}</p>
            </div>
          </div>

          <div className="text-right shrink-0">
            <div className="flex items-center gap-1.5 justify-end font-bold text-amber-400">
              <Coins className="w-4 h-4 text-amber-400" />
              <span>{itemPrice} NC</span>
            </div>
            <span className={`text-[11px] font-medium ${canAfford ? 'text-emerald-400' : 'text-rose-400'}`}>
              Seu saldo: {userCoins} NC
            </span>
          </div>
        </div>

        {/* Mensagens de Feedback */}
        {errorMsg && (
          <div className="mx-5 mt-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Corpo do Modal: Escolha de Amigo e Mensagem */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4 custom-scrollbar">
          
          {/* Busca de Amigo */}
          <div>
            <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-2">
              1. Selecione o Amigo
            </label>
            <div className="relative mb-2">
              <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por nome ou @username..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-pink-500/60 focus:ring-1 focus:ring-pink-500/60"
              />
            </div>

            {/* Lista de Contatos */}
            <div className="max-h-48 overflow-y-auto border border-neutral-800/80 rounded-xl bg-neutral-950/40 divide-y divide-neutral-800/40 custom-scrollbar">
              {loadingFriends ? (
                <div className="p-4 flex items-center justify-center gap-2 text-xs text-neutral-400">
                  <Loader2 className="w-4 h-4 animate-spin text-pink-500" />
                  Carregando amigos...
                </div>
              ) : filteredFriends.length === 0 ? (
                <div className="p-4 text-center text-xs text-neutral-500">
                  Nenhum amigo encontrado.
                </div>
              ) : (
                filteredFriends.map((f) => {
                  const alreadyOwns = (f.unlocked_items || []).includes(item.id);
                  const isSelected = selectedFriend?.id === f.id;

                  return (
                    <button
                      key={f.id}
                      type="button"
                      disabled={alreadyOwns}
                      onClick={() => {
                        setSelectedFriend(f);
                        setErrorMsg('');
                        sounds.playPop?.();
                      }}
                      className={`w-full p-2.5 flex items-center justify-between gap-3 text-left transition-all ${
                        alreadyOwns
                          ? 'opacity-40 cursor-not-allowed bg-neutral-900/20'
                          : isSelected
                          ? 'bg-pink-500/15 border-l-4 border-pink-500'
                          : 'hover:bg-neutral-800/40'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="relative w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center shrink-0 overflow-hidden">
                          {f.avatar_url ? (
                            <img src={f.avatar_url} alt={f.display_name} className="w-full h-full object-cover" />
                          ) : (
                            <User className="w-4 h-4 text-neutral-400" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-white truncate flex items-center gap-1.5">
                            {f.display_name || f.username}
                            {f.isFriend && (
                              <span className="text-[9px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.2 rounded border border-emerald-500/20">
                                Amigo
                              </span>
                            )}
                          </p>
                          <p className="text-[11px] text-neutral-400 truncate">@{f.username || 'nexus'}</p>
                        </div>
                      </div>

                      <div className="shrink-0">
                        {alreadyOwns ? (
                          <span className="text-[10px] text-neutral-500 font-medium bg-neutral-800 px-2 py-0.5 rounded-full">
                            Já possui
                          </span>
                        ) : isSelected ? (
                          <div className="w-5 h-5 rounded-full bg-pink-500 flex items-center justify-center text-white">
                            <Check className="w-3.5 h-3.5" />
                          </div>
                        ) : (
                          <span className="text-[11px] text-neutral-400 hover:text-pink-400">
                            Selecionar
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Mensagem Opcional */}
          <div>
            <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-2">
              2. Mensagem Personalizada (Opcional)
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value.slice(0, 100))}
              placeholder="Ex: Um presente especial para comemorar! Aproveite a moldura!"
              rows={2}
              className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-pink-500/60 focus:ring-1 focus:ring-pink-500/60 resize-none"
            />
            <span className="text-[10px] text-neutral-500 block text-right mt-1">
              {message.length}/100 caracteres
            </span>
          </div>
        </div>

        {/* Footer com Ações */}
        <div className="p-4 bg-neutral-950 border-t border-neutral-800/80 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-neutral-400 hover:text-white rounded-xl hover:bg-neutral-800 transition-colors"
          >
            Cancelar
          </button>

          <button
            type="button"
            disabled={!selectedFriend || !canAfford || sending}
            onClick={handleSendGift}
            className={`px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 shadow-lg transition-all ${
              !selectedFriend || !canAfford || sending
                ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed shadow-none'
                : 'bg-gradient-to-r from-pink-600 via-rose-600 to-purple-600 text-white hover:brightness-110 shadow-pink-600/20 active:scale-95'
            }`}
          >
            {sending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Enviando presente...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Presentear por {itemPrice} NC</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
