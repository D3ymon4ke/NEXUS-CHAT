import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useChat } from '../../context/ChatContext';
import { supabase, isSupabaseConfigured } from '../../lib/supabaseClient';
import { WeatherWidget } from './WeatherWidget';
import {
  Sparkles,
  Flame,
  MessageSquare,
  ShoppingBag,
  Coins,
  Shield,
  Lightbulb,
  ChevronRight,
  ChevronLeft,
  Crown,
  Zap,
  Calendar,
  Layers,
  ArrowRight,
  Radio,
  FileText
} from 'lucide-react';

const BELMONT_ID = '00000000-0000-0000-0000-000000000001';

const PLATFORM_TIPS = [
  {
    icon: '🪙',
    title: 'Economia & Recompensas',
    text: 'A cada mensagem enviada, você ganha +5 Nexus Coins automaticamente! Use suas moedas para desbloquear molduras e fundos exclusivos na Loja.'
  },
  {
    icon: '🔥',
    title: 'Sequência Diária',
    text: 'Entre todo dia e resgate seu bônus diário de login na Loja Nexus. Quanto maior a sua sequência, mais moedas você ganha (até 250 moedas por dia)!'
  },
  {
    icon: '👑',
    title: 'Belmont Conference',
    text: 'A Belmont Conference é o canal supremo oficial, onde ocorrem transmissões do admin Damon e conversas entre todos os membros.'
  },
  {
    icon: '🖼️',
    title: 'Imagens e Legendas',
    text: 'Você pode colar imagens diretamente do teclado com Ctrl+V e digitar sua legenda antes de enviar.'
  },
  {
    icon: '🎒',
    title: 'Inventário no Perfil',
    text: 'Clique no seu avatar ou na engrenagem de configurações para abrir seu Inventário e equipar suas molduras e temas favoritos.'
  },
  {
    icon: '✨',
    title: 'Emojis e Figurinhas Animadas',
    text: 'Abra o seletor de emojis na barra de mensagem e clique na aba Figurinhas Animadas para enviar stickers de alta qualidade!'
  }
];

const BADGE_COLORS = {
  PATCH: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
  ATUALIZAÇÃO: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
  NOVIDADE: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  EVENTO: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
  CORREÇÃO: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
  ANÚNCIO: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
};

export function HomeHub({ onOpenChat, onOpenShop, onOpenWallet }) {
  const { user } = useAuth();
  const { setActiveConversationId } = useChat();

  const [currentTipIndex, setCurrentTipIndex] = useState(0);
  const [patchNotes, setPatchNotes] = useState([]);
  const [loadingPatches, setLoadingPatches] = useState(true);

  // Rotação automática de dicas a cada 6 segundos
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTipIndex((prev) => (prev + 1) % PLATFORM_TIPS.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  // Carregar Patch Notes do Supabase
  useEffect(() => {
    async function loadPatches() {
      if (isSupabaseConfigured && supabase) {
        try {
          const { data } = await supabase
            .from('patch_notes')
            .select('*')
            .order('is_pinned', { ascending: false })
            .order('created_at', { ascending: false });

          if (data && data.length > 0) {
            setPatchNotes(data);
          }
        } catch (err) {
          console.error('Erro ao buscar patch notes:', err);
        } finally {
          setLoadingPatches(false);
        }
      } else {
        setLoadingPatches(false);
      }
    }
    loadPatches();
  }, []);

  const handleEnterBelmont = () => {
    setActiveConversationId(BELMONT_ID);
    if (onOpenChat) onOpenChat(BELMONT_ID);
  };

  const currentTip = PLATFORM_TIPS[currentTipIndex];

  return (
    <div className="flex-1 flex flex-col h-full bg-background-darker overflow-y-auto relative select-none">
      {/* Background Decorativo Glow */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-brand-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 left-10 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-4xl w-full mx-auto p-4 sm:p-8 space-y-6">
        {/* BANNER PRINCIPAL DE BOAS-VINDAS */}
        <div className="relative rounded-3xl p-6 sm:p-8 bg-gradient-to-br from-slate-900/90 via-slate-900/70 to-indigo-950/80 border border-slate-700/60 shadow-2xl overflow-hidden">
          <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 relative z-10">
            <div className="flex items-center gap-5 text-center sm:text-left">
              <div className="relative flex-shrink-0">
                <img
                  src="/belmont-logo.jpg"
                  alt="Nexus Belmont Logo"
                  className="w-20 h-20 rounded-3xl object-cover border-2 border-amber-400/80 shadow-2xl shadow-amber-500/30"
                />
                <span className="absolute -bottom-1 -right-1 flex h-4 w-4">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 border-2 border-slate-900"></span>
                </span>
              </div>

              <div>
                <div className="flex items-center justify-center sm:justify-start gap-2 mb-1">
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">NEXUS CHAT</h1>
                  <span className="px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-500/20 to-brand-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-extrabold uppercase">
                    v2.5 Live
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-300">
                  Olá, <strong className="text-white">{user?.display_name || user?.username}</strong>! Bem-vindo ao hub central.
                </p>
                <div className="flex items-center justify-center sm:justify-start gap-3 mt-3">
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-950/50 border border-amber-500/40 text-amber-300 text-xs font-bold shadow-sm">
                    <img src="/nexus-coin.jpg" alt="Moeda" className="w-4 h-4 rounded-full" />
                    <span>{user?.nexus_coins || 100} Coins</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-200 text-xs font-bold">
                    <Flame className="w-4 h-4 text-amber-400" />
                    <span>{user?.daily_streak || 0} Dias Streak</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Ações Rápidas */}
            <div className="flex flex-col sm:flex-row gap-2.5 w-full sm:w-auto">
              <button
                onClick={handleEnterBelmont}
                className="px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 hover:from-amber-400 hover:to-yellow-400 text-black font-extrabold text-xs shadow-xl shadow-amber-500/25 transition-all flex items-center justify-center gap-2 hover:scale-105"
              >
                <Crown className="w-4 h-4" /> Entrar na Belmont Conference
              </button>
              {onOpenShop && (
                <button
                  onClick={onOpenShop}
                  className="px-4 py-3 rounded-2xl bg-background-surface/80 hover:bg-slate-700/80 text-white font-bold text-xs border border-slate-700 transition-all flex items-center justify-center gap-1.5"
                >
                  <ShoppingBag className="w-4 h-4 text-amber-400" /> Loja Nexus
                </button>
              )}
            </div>
          </div>
        </div>

        {/* WIDGET DE PREVISÃO DO TEMPO */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-400 px-1">
            <span>🌦️</span>
            <span>Previsão do Tempo em Tempo Real</span>
          </div>
          <WeatherWidget />
        </div>

        {/* CARD DINÂMICO DE DICAS DA PLATAFORMA */}
        <div className="p-5 rounded-3xl bg-gradient-to-r from-slate-900/90 via-background-surface/80 to-slate-900/90 border border-slate-800 shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-xl">{currentTip.icon}</span>
              <span className="text-xs font-extrabold text-amber-300 uppercase tracking-wide">
                Dica da Plataforma • {currentTip.title}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentTipIndex((prev) => (prev - 1 + PLATFORM_TIPS.length) % PLATFORM_TIPS.length)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/5"
                title="Dica anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-[10px] text-slate-500 font-bold px-1">
                {currentTipIndex + 1}/{PLATFORM_TIPS.length}
              </span>
              <button
                onClick={() => setCurrentTipIndex((prev) => (prev + 1) % PLATFORM_TIPS.length)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/5"
                title="Próxima dica"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed min-h-[36px] transition-all">
            {currentTip.text}
          </p>

          {/* Barra de Progresso do Timer */}
          <div className="w-full bg-slate-800 h-1 rounded-full mt-3 overflow-hidden">
            <div className="bg-amber-400 h-full w-full animate-[pulse_3s_infinite]" />
          </div>
        </div>

        {/* SEÇÃO DE PATCH NOTES & ATUALIZAÇÕES */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-brand-400" />
              <h2 className="text-sm font-extrabold text-white uppercase tracking-wider">
                Notas de Atualização & Patch Notes
              </h2>
            </div>
            <span className="text-[11px] text-slate-500">Publicado por Damon</span>
          </div>

          {loadingPatches ? (
            <div className="text-center py-8 text-xs text-slate-400">Carregando notas de atualização...</div>
          ) : patchNotes.length === 0 ? (
            <div className="p-6 rounded-2xl bg-background-surface/60 border border-slate-800 text-center text-xs text-slate-400">
              Nenhuma nota de atualização publicada no momento.
            </div>
          ) : (
            <div className="space-y-3">
              {patchNotes.map((patch) => {
                const badgeStyle = BADGE_COLORS[patch.tag] || 'bg-slate-700 text-slate-300 border-slate-600';
                return (
                  <div
                    key={patch.id}
                    className={`p-5 rounded-3xl border transition-all ${
                      patch.is_pinned
                        ? 'bg-gradient-to-br from-slate-900/90 to-amber-950/20 border-amber-500/40 shadow-lg shadow-amber-500/5'
                        : 'bg-background-surface/70 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border uppercase ${badgeStyle}`}>
                          {patch.tag}
                        </span>
                        {patch.version && (
                          <span className="text-[11px] font-bold text-slate-400">
                            {patch.version}
                          </span>
                        )}
                        {patch.is_pinned && (
                          <span className="text-[10px] text-amber-400 font-bold flex items-center gap-1">
                            📌 Destaque
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-500">
                        {new Date(patch.created_at).toLocaleDateString('pt-BR')} • {patch.author_name}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-white mb-1.5">{patch.title}</h3>
                    <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line">
                      {patch.content}
                    </p>
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
