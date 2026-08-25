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
  FileText,
  Clock,
  Compass,
  CheckCircle2
} from 'lucide-react';

const BELMONT_ID = '00000000-0000-0000-0000-000000000001';

const PLATFORM_TIPS = [
  {
    icon: '🪙',
    title: 'Ganhe Nexus Coins',
    text: 'A cada mensagem enviada, você ganha +5 Nexus Coins automaticamente! Troque por molduras, balões e temas na Loja.'
  },
  {
    icon: '🔥',
    title: 'Sequência Diária',
    text: 'Colete seu bônus diário na Loja para aumentar sua sequência e ganhar até 250 moedas por dia!'
  },
  {
    icon: '👑',
    title: 'Belmont Conference',
    text: 'A sala principal oficial do Nexus Chat para conversas em grupo e comunicados do admin Damon.'
  },
  {
    icon: '🖼️',
    title: 'Imagens com Legenda',
    text: 'Cole imagens com Ctrl+V diretamente no chat e digite sua legenda antes de enviar.'
  },
  {
    icon: '🎒',
    title: 'Meu Inventário',
    text: 'No seu perfil, abra o Inventário para equipar e alternar suas molduras e temas de balão a qualquer momento.'
  },
  {
    icon: '✨',
    title: 'Figurinhas Animadas',
    text: 'No seletor de emojis da conversa, use a aba Figurinhas Animadas para enviar stickers animados em alta definição.'
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

const DEFAULT_FALLBACK_PATCHES = [
  {
    id: 'p1',
    tag: 'NOVIDADE',
    title: 'Loja Nexus, Economia & Wallpapers',
    version: 'v2.5.0',
    content: 'Sistema completo de moedas por mensagens, bônus de login diário, planos de fundo dinâmicos e inventário de efeitos.',
    author_name: 'Damon',
    is_pinned: true,
    created_at: new Date().toISOString()
  },
  {
    id: 'p2',
    tag: 'ATUALIZAÇÃO',
    title: 'Edição e Exclusão de Mensagens',
    version: 'v2.4.0',
    content: 'Agora você pode editar suas mensagens enviadas e excluir com placeholder estilizado em tempo real.',
    author_name: 'Damon',
    is_pinned: false,
    created_at: new Date().toISOString()
  },
  {
    id: 'p3',
    tag: 'PATCH',
    title: 'Anexo de Imagens & Figurinhas Animadas',
    version: 'v2.3.0',
    content: 'Envio de imagens com pré-visualização e legenda, além de dezenas de figurinhas animadas em alta qualidade.',
    author_name: 'Damon',
    is_pinned: false,
    created_at: new Date().toISOString()
  }
];

export function HomeHub({ onOpenChat, onOpenShop, onOpenWallet, onBack }) {
  const { user } = useAuth();
  const { setActiveConversationId } = useChat();

  const [currentTipIndex, setCurrentTipIndex] = useState(0);
  const [patchNotes, setPatchNotes] = useState(DEFAULT_FALLBACK_PATCHES);
  const [loadingPatches, setLoadingPatches] = useState(false);

  // Rotação de dicas
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
          console.warn('Usando patch notes locais:', err);
        }
      }
    }
    loadPatches();
  }, []);

  const handleEnterBelmont = () => {
    setActiveConversationId(BELMONT_ID);
    if (onOpenChat) onOpenChat(BELMONT_ID);
  };

  const currentTip = PLATFORM_TIPS[currentTipIndex] || PLATFORM_TIPS[0];

  return (
    <div className="flex-1 flex flex-col h-full bg-background-darker overflow-y-auto relative select-none">
      {/* Background Decorativo Glow */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-brand-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-10 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-6xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Botão de Voltar para Barra Lateral em Dispositivos Móveis */}
        {onBack && (
          <button
            onClick={onBack}
            className="md:hidden flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-slate-900 border border-slate-700/80 text-slate-200 font-bold text-xs shadow-lg active:scale-95 transition-all"
          >
            <ChevronLeft className="w-4 h-4 text-amber-400" />
            <span>Voltar para Lista de Conversas</span>
          </button>
        )}

        {/* 1. HERO BANNER PRINCIPAL (COMPACTO E HOLOGRÁFICO) */}
        <div className="relative rounded-3xl p-6 bg-gradient-to-br from-slate-900/90 via-slate-900/80 to-indigo-950/70 border border-slate-700/60 shadow-2xl overflow-hidden">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-6 relative z-10">
            {/* Perfil & Identidade */}
            <div className="flex items-center gap-4 text-center sm:text-left">
              <div className="relative flex-shrink-0">
                <img
                  src="/belmont-logo.jpg"
                  alt="Nexus Belmont Logo"
                  className="w-16 h-16 sm:w-18 sm:h-18 rounded-2xl object-cover border-2 border-amber-400/80 shadow-xl shadow-amber-500/20"
                />
                <span className="absolute -bottom-1 -right-1 flex h-3.5 w-3.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-slate-900"></span>
                </span>
              </div>

              <div>
                <div className="flex items-center justify-center sm:justify-start gap-2 mb-1">
                  <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">NEXUS CHAT</h1>
                  <span className="px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-500/20 to-brand-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-extrabold uppercase">
                    Hub Principal
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-300">
                  Bem-vindo de volta, <strong className="text-white">{user?.display_name || user?.username || 'Membro'}</strong>!
                </p>

                {/* Badges de Saldo e Sequência */}
                <div className="flex items-center justify-center sm:justify-start gap-2.5 mt-2.5">
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-950/60 border border-amber-500/40 text-amber-300 text-xs font-bold shadow-sm">
                    <img src="/nexus-coin.jpg" alt="Moeda" className="w-4 h-4 rounded-full" />
                    <span>{user?.nexus_coins || 100} Coins</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-200 text-xs font-bold">
                    <Flame className="w-3.5 h-3.5 text-amber-400" />
                    <span>{user?.daily_streak || 0} Dias Streak</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Ações de Acesso Rápido */}
            <div className="flex flex-wrap items-center justify-center gap-2.5 w-full lg:w-auto">
              <button
                onClick={handleEnterBelmont}
                className="flex-1 sm:flex-initial px-5 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 hover:from-amber-400 hover:to-yellow-400 text-black font-extrabold text-xs shadow-lg shadow-amber-500/25 transition-all flex items-center justify-center gap-2 hover:scale-105"
              >
                <Crown className="w-4 h-4" /> Entrar na Belmont
              </button>
              {onOpenShop && (
                <button
                  onClick={onOpenShop}
                  className="px-4 py-2.5 rounded-2xl bg-background-surface hover:bg-slate-700/80 text-white font-bold text-xs border border-slate-700 transition-all flex items-center justify-center gap-1.5"
                >
                  <ShoppingBag className="w-4 h-4 text-amber-400" /> Loja
                </button>
              )}
              {onOpenWallet && (
                <button
                  onClick={onOpenWallet}
                  className="px-4 py-2.5 rounded-2xl bg-background-surface hover:bg-slate-700/80 text-white font-bold text-xs border border-slate-700 transition-all flex items-center justify-center gap-1.5"
                >
                  <Coins className="w-4 h-4 text-amber-400" /> Carteira
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 2. GRID PRINCIPAL (2 COLUNAS: ESQUERDA = CLIMA/DICAS, DIREITA = PATCH NOTES) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* COLUNA ESQUERDA (5 COLUNAS) */}
          <div className="lg:col-span-5 space-y-5">
            {/* Widget de Clima */}
            <div className="p-4 rounded-3xl bg-background-surface/80 border border-slate-800 shadow-xl space-y-2.5">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
                  <span>🌦️</span>
                  <span>Previsão do Tempo em Tempo Real</span>
                </div>
                <span className="text-[10px] text-slate-500 font-semibold">Ao Vivo</span>
              </div>
              <WeatherWidget />
            </div>

            {/* Card Dinâmico de Dicas da Plataforma */}
            <div className="p-5 rounded-3xl bg-gradient-to-br from-slate-900/90 via-background-surface/80 to-slate-900/90 border border-slate-800 shadow-xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{currentTip.icon}</span>
                  <span className="text-xs font-extrabold text-amber-300 uppercase tracking-wide">
                    {currentTip.title}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentTipIndex((prev) => (prev - 1 + PLATFORM_TIPS.length) % PLATFORM_TIPS.length)}
                    className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-[10px] text-slate-500 font-bold px-1">
                    {currentTipIndex + 1}/{PLATFORM_TIPS.length}
                  </span>
                  <button
                    onClick={() => setCurrentTipIndex((prev) => (prev + 1) % PLATFORM_TIPS.length)}
                    className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed min-h-[48px]">
                {currentTip.text}
              </p>

              <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                <div className="bg-amber-400 h-full w-full animate-pulse" />
              </div>
            </div>

            {/* Card Informativo de Status do Sistema */}
            <div className="p-4 rounded-3xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white">Servidor & Conexão</div>
                  <div className="text-[10px] text-slate-400">Criptografia Realtime Ativa</div>
                </div>
              </div>
              <span className="text-[10px] px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 font-bold">
                100% Operacional
              </span>
            </div>
          </div>

          {/* COLUNA DIREITA: FEED DE PATCH NOTES (7 COLUNAS) */}
          <div className="lg:col-span-7 space-y-3">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-amber-400" />
                <h2 className="text-sm font-extrabold text-white uppercase tracking-wider">
                  Notas de Atualização & Patch Notes
                </h2>
              </div>
              <span className="text-[11px] text-slate-500">Oficial Damon</span>
            </div>

            {/* Lista de Patch Notes em Cards Estilizados */}
            <div className="space-y-3 max-h-[580px] overflow-y-auto pr-1">
              {patchNotes.map((patch) => {
                const badgeStyle = BADGE_COLORS[patch.tag] || 'bg-slate-700 text-slate-300 border-slate-600';
                return (
                  <div
                    key={patch.id}
                    className={`p-5 rounded-3xl border transition-all ${
                      patch.is_pinned
                        ? 'bg-gradient-to-br from-slate-900/95 via-slate-900/90 to-amber-950/20 border-amber-500/40 shadow-lg shadow-amber-500/5'
                        : 'bg-background-surface/80 border-slate-800 hover:border-slate-700'
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
                      <span className="text-[10px] text-slate-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
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
          </div>
        </div>
      </div>
    </div>
  );
}
