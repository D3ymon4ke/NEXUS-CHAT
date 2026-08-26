import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase, isSupabaseConfigured } from '../../lib/supabaseClient';
import { sounds } from '../../lib/sound';
import confetti from 'canvas-confetti';
import {
  Crown,
  Sparkles,
  Award,
  CheckCircle2,
  Coins,
  Shield,
  Star,
  Zap,
  Flame,
  X
} from 'lucide-react';

const TITLE_ICONS = {
  Coordenador: { icon: '⭐', color: 'from-amber-400 to-yellow-600', glow: 'rgba(251,191,36,0.8)' },
  Moderador: { icon: '🛡️', color: 'from-indigo-500 to-blue-600', glow: 'rgba(99,102,241,0.8)' },
  'BETA TESTER': { icon: '🧪', color: 'from-cyan-400 to-teal-500', glow: 'rgba(34,211,238,0.8)' },
  Embaixador: { icon: '🌟', color: 'from-emerald-400 to-green-600', glow: 'rgba(52,211,153,0.8)' },
  Pioneiro: { icon: '⚡', color: 'from-amber-400 to-orange-500', glow: 'rgba(245,158,11,0.8)' },
  'VIP Honorário': { icon: '💎', color: 'from-rose-400 to-pink-600', glow: 'rgba(244,63,94,0.8)' }
};

export function TitlePromotionModal() {
  const { user, updateProfile } = useAuth();
  const [rewardData, setRewardData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;

    let pending = user.title_reward_pending;
    if (typeof pending === 'string') {
      try {
        pending = JSON.parse(pending);
      } catch (err) {
        pending = null;
      }
    }

    if (pending && pending.title) {
      setRewardData(pending);
      sounds.playPop();

      // Disparar confetes duplos festivos
      confetti({
        particleCount: 100,
        spread: 80,
        origin: { y: 0.5 },
        colors: ['#fbbf24', '#f59e0b', '#38bdf8', '#a855f7', '#ec4899']
      });

      setTimeout(() => {
        confetti({
          particleCount: 70,
          spread: 100,
          origin: { y: 0.6 }
        });
      }, 350);
    } else {
      setRewardData(null);
    }
  }, [user?.title_reward_pending]);

  if (!rewardData) return null;

  const titleConfig = TITLE_ICONS[rewardData.title] || {
    icon: '🏆',
    color: 'from-brand-500 to-indigo-600',
    glow: 'rgba(124,58,237,0.8)'
  };

  const handleClaim = async () => {
    setLoading(true);
    try {
      sounds.playPop();
      confetti({
        particleCount: 120,
        spread: 90,
        origin: { y: 0.6 }
      });

      if (isSupabaseConfigured && supabase && user) {
        await supabase
          .from('profiles')
          .update({
            title_reward_pending: null,
            custom_title: rewardData.title,
            equipped_badge: rewardData.badge || user.equipped_badge
          })
          .eq('id', user.id);
      }

      if (updateProfile) {
        await updateProfile({
          title_reward_pending: null,
          custom_title: rewardData.title,
          equipped_badge: rewardData.badge || user.equipped_badge
        });
      }

      setRewardData(null);
    } catch (err) {
      console.error('Erro ao equipar condecoração:', err);
      setRewardData(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/90 backdrop-blur-2xl animate-fadeIn select-none">
      <div className="w-full max-w-md rounded-3xl p-6 sm:p-8 shadow-2xl border-2 border-amber-400/60 bg-gradient-to-b from-slate-900 via-background-darker to-slate-950 flex flex-col items-center text-center relative overflow-hidden">
        {/* Glows de Fundo */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-64 bg-amber-500/25 rounded-full blur-3xl pointer-events-none animate-pulse" />
        <div className="absolute -bottom-24 left-1/2 -translate-x-1/2 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Botão Fechar */}
        <button
          onClick={handleClaim}
          className="absolute top-4 right-4 p-1.5 rounded-full bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Emblema Animado 3D */}
        <div className="relative my-3">
          <div className={`w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-gradient-to-br ${titleConfig.color} flex items-center justify-center text-4xl sm:text-5xl shadow-2xl shadow-amber-500/40 ring-4 ring-amber-400/40 animate-bounce`}>
            {titleConfig.icon}
          </div>
          <div className="absolute -bottom-2 -right-2 p-1.5 rounded-xl bg-slate-950 border border-amber-400 text-amber-300">
            <Sparkles className="w-4 h-4 animate-spin" />
          </div>
        </div>

        {/* Cabeçalho */}
        <div className="space-y-1 mt-2">
          <span className="text-[10px] sm:text-xs font-extrabold uppercase tracking-widest text-amber-400 bg-amber-500/15 px-3 py-1 rounded-full border border-amber-400/30">
            👑 Condecoração Oficial Nexus
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-white mt-1">
            PARABÉNS, {user.display_name || user.username}!
          </h2>
          <p className="text-xs sm:text-sm text-slate-300">
            Você foi promovido e condecorado pelo Administrador com um novo cargo de honra!
          </p>
        </div>

        {/* Cartão do Título & Badge Conquistado */}
        <div className="w-full my-4 p-4 rounded-2xl bg-slate-900/90 border border-amber-500/40 shadow-inner space-y-2 text-left">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400">Cargo / Título Oficial:</span>
            <span className="text-xs font-extrabold text-amber-300 px-2.5 py-0.5 rounded-lg bg-amber-500/20 border border-amber-500/40">
              {titleConfig.icon} {rewardData.title}
            </span>
          </div>

          {rewardData.bonus && Number(rewardData.bonus) > 0 && (
            <div className="flex items-center justify-between border-t border-slate-800/80 pt-2">
              <span className="text-[11px] font-bold text-slate-400">Bônus de Reconhecimento:</span>
              <span className="text-xs font-extrabold text-emerald-300 flex items-center gap-1">
                <Coins className="w-3.5 h-3.5 text-amber-400" />
                +{rewardData.bonus} Nexus Coins
              </span>
            </div>
          )}

          {rewardData.message && (
            <div className="border-t border-slate-800/80 pt-2">
              <span className="text-[10px] font-bold text-slate-500 block mb-0.5">Mensagem do Admin:</span>
              <p className="text-xs text-slate-200 italic bg-black/30 p-2 rounded-xl border border-white/5">
                "{rewardData.message}"
              </p>
            </div>
          )}
        </div>

        {/* Botão de Ação */}
        <button
          onClick={handleClaim}
          disabled={loading}
          className="w-full py-3 px-6 rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-sm shadow-xl shadow-amber-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
        >
          <Award className="w-5 h-5" />
          <span>Equipar Condecoração & Celebrar 🎉</span>
        </button>
      </div>
    </div>
  );
}
