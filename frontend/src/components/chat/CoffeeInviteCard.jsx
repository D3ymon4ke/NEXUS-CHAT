import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase, isSupabaseConfigured } from '../../lib/supabaseClient';
import { sounds } from '../../lib/sound';
import confetti from 'canvas-confetti';
import {
  Coffee,
  Sparkles,
  Coins,
  CheckCircle2,
  Heart,
  Clock,
  Flame,
  UserCheck
} from 'lucide-react';

export function CoffeeInviteCard({ message, isOwn }) {
  const { user, updateProfile } = useAuth();
  const [loading, setLoading] = useState(false);

  // Parser dos dados do convite de café a partir do content da mensagem
  let inviteData = {
    senderId: message.sender_id || message.sender?.id,
    senderName: message.sender?.display_name || message.sender?.username || 'Amigo',
    senderAvatar: message.sender?.avatar_url,
    rewardAmount: 30,
    acceptedBy: null,
    acceptedByName: null,
    acceptedAt: null
  };

  try {
    if (message.content && message.content.startsWith('{')) {
      const parsed = JSON.parse(message.content);
      if (parsed.coffee_invite) {
        inviteData = { ...inviteData, ...parsed.coffee_invite };
      }
    }
  } catch (err) {
    // Fallback se for string normal
  }

  const isAccepted = Boolean(inviteData.acceptedBy);
  const isSender = user?.id === inviteData.senderId;

  const handleAcceptCoffee = async () => {
    if (isAccepted || loading || !user) return;
    setLoading(true);

    try {
      sounds.playPop();
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#d97706', '#f59e0b', '#78350f', '#fbbf24', '#fef3c7']
      });

      const updatedInvite = {
        ...inviteData,
        acceptedBy: user.id,
        acceptedByName: user.display_name || user.username,
        acceptedAt: new Date().toISOString()
      };

      const newContent = JSON.stringify({
        coffee_invite: updatedInvite
      });

      // 1. Atualizar a mensagem no Supabase se configurado
      if (isSupabaseConfigured && supabase) {
        await supabase
          .from('messages')
          .update({ content: newContent })
          .eq('id', message.id);

        // Conceder moedas ao usuário que aceitou
        const currentCoins = user.nexus_coins || 0;
        const newTotal = currentCoins + inviteData.rewardAmount;

        await supabase
          .from('profiles')
          .update({ nexus_coins: newTotal })
          .eq('id', user.id);

        await supabase.from('nexus_transactions').insert({
          user_id: user.id,
          amount: inviteData.rewardAmount,
          type: 'coffee_reward',
          description: `Pausa do café com ${inviteData.senderName} ☕ (+${inviteData.rewardAmount} coins)`
        });

        // Conceder moedas também ao remetente original se for diferente
        if (inviteData.senderId && inviteData.senderId !== user.id) {
          const { data: senderProf } = await supabase
            .from('profiles')
            .select('nexus_coins')
            .eq('id', inviteData.senderId)
            .single();

          if (senderProf) {
            await supabase
              .from('profiles')
              .update({ nexus_coins: (senderProf.nexus_coins || 0) + inviteData.rewardAmount })
              .eq('id', inviteData.senderId);
          }
        }
      }

      // 2. Atualizar perfil local
      if (updateProfile) {
        await updateProfile({
          nexus_coins: (user.nexus_coins || 0) + inviteData.rewardAmount
        });
      }
    } catch (err) {
      console.error('Erro ao aceitar convite para café:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-sm rounded-2xl bg-gradient-to-br from-amber-950/80 via-slate-900/95 to-amber-950/60 border-2 border-amber-500/50 p-4 shadow-xl text-white relative overflow-hidden backdrop-blur my-1 group select-none">
      {/* Glow e partículas aconchegantes */}
      <div className="absolute -top-12 -right-12 w-32 h-32 bg-amber-500/20 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-yellow-600/20 rounded-full blur-2xl pointer-events-none" />

      {/* Header do Card */}
      <div className="flex items-center justify-between gap-2 relative z-10">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-600 to-yellow-500 flex items-center justify-center text-white shadow-lg shadow-amber-600/40 border border-amber-300/40 flex-shrink-0 animate-bounce [animation-duration:2.5s]">
            <Coffee className="w-5 h-5 fill-white/20" />
          </div>
          <div>
            <h4 className="text-xs font-black text-amber-300 flex items-center gap-1.5 uppercase tracking-wide">
              <span>Pausa para um Café</span>
              <span className="text-[10px] animate-pulse">☕</span>
            </h4>
            <p className="text-[11px] text-slate-300 font-medium">
              Convite de <strong className="text-white">{inviteData.senderName}</strong>
            </p>
          </div>
        </div>

        {/* Badge da Recompensa */}
        <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 font-extrabold text-[10px] shadow-sm">
          <img src="/nexus-coin.jpg" alt="Coins" className="w-3.5 h-3.5 rounded-full ring-1 ring-amber-400" />
          <span>+{inviteData.rewardAmount}</span>
        </div>
      </div>

      {/* Imagem / Ilustração de Café com Vapor Animado */}
      <div className="relative my-3 rounded-xl overflow-hidden border border-amber-500/30 bg-slate-950/80 p-3 flex flex-col items-center justify-center text-center">
        {isAccepted ? (
          <div className="space-y-2 py-1 animate-fadeIn">
            <div className="relative inline-block">
              <span className="text-4xl filter drop-shadow">☕✨</span>
              <span className="absolute -top-1 -right-2 text-xl animate-pulse">❤️</span>
            </div>
            <div>
              <p className="text-xs font-bold text-amber-200">
                Pausa para o Café Aceita!
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {inviteData.acceptedByName === user?.display_name
                  ? 'Você aceitou este café e garantiu suas moedas!'
                  : `${inviteData.acceptedByName} aceitou o café com ${inviteData.senderName}!`}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-1.5 py-1">
            <div className="flex justify-center items-center gap-2">
              <span className="text-3xl animate-pulse">☕</span>
              <span className="text-xl text-amber-400">💨</span>
              <span className="text-3xl animate-pulse [animation-delay:0.3s]">🥐</span>
            </div>
            <p className="text-xs text-slate-200 font-medium leading-tight">
              "Que tal uma pausa rápida para um café quentinho e boas energias?"
            </p>
            <p className="text-[10px] text-amber-300/90 font-semibold">
              🎁 Quem aceitar primeiro ganha +{inviteData.rewardAmount} Nexus Coins!
            </p>
          </div>
        )}
      </div>

      {/* Ação: Botão Aceitar ou Status de Concluído */}
      <div className="relative z-10">
        {isAccepted ? (
          <div className="w-full py-2 px-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Café tomado com {inviteData.acceptedByName} ☕</span>
          </div>
        ) : isSender ? (
          <div className="w-full py-2 px-3 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-200/90 text-[11px] font-semibold text-center flex items-center justify-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-amber-400 animate-spin [animation-duration:8s]" />
            <span>Aguardando alguém aceitar seu café...</span>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleAcceptCoffee}
            disabled={loading}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 hover:from-amber-400 hover:to-yellow-400 text-black font-black text-xs shadow-lg shadow-amber-500/30 transition-all flex items-center justify-center gap-2 active:scale-95 group/btn"
          >
            <Coffee className="w-4 h-4 group-hover/btn:rotate-12 transition-transform" />
            <span>Aceitar Café & Ganhar +{inviteData.rewardAmount} Coins ☕</span>
          </button>
        )}
      </div>
    </div>
  );
}
