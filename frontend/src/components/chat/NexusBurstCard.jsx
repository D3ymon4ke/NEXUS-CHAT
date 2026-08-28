import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useChat } from '../../context/ChatContext';
import { supabase, isSupabaseConfigured } from '../../lib/supabaseClient';
import { sounds } from '../../lib/sound';
import confetti from 'canvas-confetti';
import { Sparkles, Coins, Zap, Flame, CheckCircle2 } from 'lucide-react';

export function NexusBurstCard({ message, isOwn }) {
  const { user, updateProfile } = useAuth();
  const { sendMessage } = useChat();
  const [sending, setSending] = useState(false);

  let data = {
    senderId: message.sender_id || message.sender?.id,
    senderName: message.sender?.display_name || message.sender?.username || 'Membro',
    senderUsername: message.sender?.username || 'usuario',
    reward: 20,
    alreadyClaimedToday: false,
    createdAt: message.created_at || new Date().toISOString()
  };

  try {
    if (message.content && (message.content.startsWith('{') || message.content.includes('"nexus_burst"'))) {
      const parsed = JSON.parse(message.content);
      if (parsed.nexus_burst) {
        data = { ...data, ...parsed.nexus_burst };
      }
    }
  } catch (err) {
    // Fallback
  }

  const handleSendNexusAlso = async () => {
    if (!user || sending) return;
    setSending(true);

    try {
      sounds.playPop();

      const todayStr = new Date().toISOString().split('T')[0];
      const lastNexusDate = user.last_nexus_daily || localStorage.getItem(`nexus_daily_${user.id}`);
      const isFirstToday = lastNexusDate !== todayStr;

      let earnedCoins = 0;
      if (isFirstToday) {
        earnedCoins = 20;
        confetti({
          particleCount: 100,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#38bdf8', '#818cf8', '#fbbf24', '#a855f7', '#ec4899']
        });

        const newBalance = (user.nexus_coins || 100) + 20;
        if (updateProfile) {
          await updateProfile({
            nexus_coins: newBalance,
            last_nexus_daily: todayStr
          });
        }
        localStorage.setItem(`nexus_daily_${user.id}`, todayStr);

        if (isSupabaseConfigured && supabase) {
          await supabase
            .from('profiles')
            .update({
              nexus_coins: newBalance,
              last_nexus_daily: todayStr
            })
            .eq('id', user.id);

          await supabase.from('nexus_transactions').insert({
            user_id: user.id,
            amount: 20,
            type: 'nexus_daily_command',
            description: 'Recompensa diária do comando /nexus ⚡ (+20 Coins)'
          });
        }
      }

      const nexusPayload = JSON.stringify({
        nexus_burst: {
          senderId: user.id,
          senderName: user.display_name || user.username,
          senderUsername: user.username,
          senderAvatar: user.avatar_url,
          reward: earnedCoins,
          alreadyClaimedToday: !isFirstToday,
          createdAt: new Date().toISOString()
        }
      });

      await sendMessage({
        content: nexusPayload,
        attachments: [],
        type: 'nexus_burst'
      });
    } catch (err) {
      console.error('Erro ao enviar /nexus:', err);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="w-full max-w-full sm:max-w-sm rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 bg-gradient-to-br from-slate-900/95 via-indigo-950/90 to-purple-950/95 border-2 border-brand-500/60 shadow-2xl shadow-brand-500/20 text-white relative overflow-hidden select-none animate-fadeIn min-w-0 box-border">
      {/* Glows Decorativos */}
      <div className="absolute -top-12 -right-12 w-36 h-36 bg-brand-500/25 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute -bottom-12 -left-12 w-36 h-36 bg-amber-500/20 rounded-full blur-2xl pointer-events-none" />

      {/* Conteúdo Principal */}
      <div className="flex flex-col items-center text-center space-y-3 relative z-10">
        {/* Logo Animado com Efeito Holográfico */}
        <div className="relative group">
          <div className="absolute -inset-2 bg-gradient-to-r from-brand-400 via-indigo-400 to-amber-400 rounded-3xl blur-lg opacity-75 group-hover:opacity-100 animate-pulse transition-opacity" />
          <img
            src="/logov2.gif"
            alt="Nexus Logo"
            className="w-20 h-20 sm:w-28 sm:h-28 object-contain relative z-10 drop-shadow-[0_0_20px_rgba(99,102,241,0.8)]"
          />
          <span className="absolute -top-1 -right-1 z-20 px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-yellow-500 text-black text-[9px] font-black uppercase shadow-lg animate-bounce">
            NEXUS
          </span>
        </div>

        {/* Frase de Destaque */}
        <div className="space-y-1">
          <h4 className="text-sm sm:text-base font-black tracking-tight text-white flex items-center justify-center gap-1.5">
            <Sparkles className="w-4 h-4 text-amber-400 animate-spin [animation-duration:8s]" />
            <span>@{data.senderUsername} MANDOU UM NEXUS !!!</span>
          </h4>

          {/* Badge de Recompensa de Moedas */}
          {data.reward > 0 ? (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/50 text-amber-300 text-xs font-black shadow-sm">
              <Coins className="w-3.5 h-3.5 text-amber-400 animate-bounce" />
              <span>+{data.reward} Nexus Coins Ganhas! (1x ao dia)</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700 text-slate-300 text-[11px] font-bold">
              <CheckCircle2 className="w-3.5 h-3.5 text-brand-400" />
              <span>Bônus diário já coletado hoje!</span>
            </div>
          )}
        </div>

        {/* Chamada para Ação */}
        <p className="text-xs text-slate-300 leading-relaxed max-w-xs font-medium">
          🔥 Faça como ele! Digite <code className="px-1.5 py-0.5 rounded-md bg-black/40 text-amber-300 font-bold border border-white/10">/nexus</code> no chat para mandar o logo animado e garantir suas <strong className="text-white">+20 moedas diárias</strong>!
        </p>

        {/* Botão de Ação Rápida */}
        {!isOwn && (
          <button
            type="button"
            onClick={handleSendNexusAlso}
            disabled={sending}
            className="w-full py-2.5 px-4 rounded-2xl bg-gradient-to-r from-brand-500 via-indigo-500 to-purple-600 hover:from-brand-400 hover:to-indigo-400 text-white font-extrabold text-xs shadow-lg shadow-brand-500/25 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            <Zap className="w-4 h-4 text-amber-300 fill-amber-300" />
            <span>Mandar um NEXUS Também ⚡</span>
          </button>
        )}
      </div>
    </div>
  );
}
