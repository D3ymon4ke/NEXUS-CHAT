import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useChat } from '../../context/ChatContext';
import { supabase, isSupabaseConfigured } from '../../lib/supabaseClient';
import { WeatherWidget } from './WeatherWidget';
import { HubPollCard } from './HubPollCard';
import { CreateHubPollModal } from './CreateHubPollModal';
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
  CheckCircle2,
  Vote,
  Plus
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
    icon: '🎁',
    title: 'Presentes & Vitrine',
    text: 'Abra o perfil de um amigo para enviar presentes animados de diferentes raridades e encher o mostruário dele!'
  },
  {
    icon: '🖼️',
    title: 'Imagens com Legenda',
    text: 'Cole imagens com Ctrl+V diretamente no chat e digite sua legenda antes de enviar.'
  },
  {
    icon: '🎒',
    title: 'Meu Inventário & Capas',
    text: 'Personalize o topo do seu perfil com capas widescreen e equipe suas molduras a qualquer momento.'
  },
  {
    icon: '⚡',
    title: 'Comando Especial /nexus',
    text: 'Digite /nexus no chat para enviar o logo animado da comunidade e faturar +20 Nexus Coins diárias (1x ao dia)!'
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
    title: 'Perfil Expandido, Capas & Presentes Animados',
    version: 'v2.6.0',
    content: 'Personalize sua capa de perfil widescreen, visualize avatares em tela cheia (lightbox) e envie presentes animados com raridades e vitrine de troféus.',
    author_name: 'Damon',
    is_pinned: true,
    created_at: new Date().toISOString()
  },
  {
    id: 'p2',
    tag: 'NOVIDADE',
    title: 'Loja Nexus, Economia & Wallpapers',
    version: 'v2.5.0',
    content: 'Sistema completo de moedas por mensagens, bônus de login diário, planos de fundo dinâmicos e inventário de efeitos.',
    author_name: 'Damon',
    is_pinned: false,
    created_at: new Date().toISOString()
  },
  {
    id: 'p3',
    tag: 'ATUALIZAÇÃO',
    title: 'Edição e Exclusão de Mensagens',
    version: 'v2.4.0',
    content: 'Agora você pode editar suas mensagens enviadas e excluir com placeholder estilizado em tempo real.',
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
  const [hubPolls, setHubPolls] = useState([]);
  const [loadingPolls, setLoadingPolls] = useState(false);
  const [showCreatePollModal, setShowCreatePollModal] = useState(false);

  const isAdmin = user?.role === 'admin' || user?.username === 'damon';

  // Rotação de dicas
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTipIndex((prev) => (prev + 1) % PLATFORM_TIPS.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  // Carregar Patch Notes & Enquetes do Hub do Supabase
  useEffect(() => {
    loadPatches();
    loadHubPolls();
  }, []);

  const loadPatches = async () => {
    if (!isSupabaseConfigured || !supabase) return;
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
  };

  const loadHubPolls = async () => {
    if (!isSupabaseConfigured || !supabase) return;
    try {
      setLoadingPolls(true);
      const { data, error } = await supabase
        .from('nexus_polls')
        .select('*')
        .eq('is_hub_poll', true)
        .order('created_at', { ascending: false });

      if (data) {
        setHubPolls(data);
      }
    } catch (err) {
      console.warn('Erro ao carregar enquetes do Hub:', err);
    } finally {
      setLoadingPolls(false);
    }
  };

  const handleEnterBelmont = () => {
    setActiveConversationId(BELMONT_ID);
    if (onOpenChat) onOpenChat(BELMONT_ID);
  };

  const currentTip = PLATFORM_TIPS[currentTipIndex] || PLATFORM_TIPS[0];

  return (
    <div className="flex-1 flex flex-col h-full bg-gradient-to-b from-background-darker via-background-dark to-background-darker overflow-y-auto relative select-none box-border">
      {/* Background Decorativo Glow */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-brand-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-10 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-5xl w-full mx-auto p-3.5 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 box-border min-w-0">
        {/* Botão de Voltar para Barra Lateral em Dispositivos Móveis */}
        {onBack && (
          <button
            onClick={onBack}
            className="md:hidden flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-700/80 text-slate-200 font-bold text-xs shadow-lg active:scale-95 transition-all"
          >
            <ChevronLeft className="w-4 h-4 text-amber-400" />
            <span>Voltar para Lista de Conversas</span>
          </button>
        )}

        {/* 1. HERO BANNER PRINCIPAL (MODERNO, HOLOGRÁFICO & RESPONSIVO) */}
        <div className="relative rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-slate-700/60 shadow-2xl overflow-hidden min-w-0 box-border group">
          {/* Imagem de Fundo Oficial NEXUS CHAT */}
          <div
            className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
            style={{ backgroundImage: "url('/nexus-hub-bg.jpg')" }}
          />
          {/* Overlay Escuro com Gradiente para Máxima Legibilidade */}
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/95 via-slate-950/85 to-indigo-950/90 backdrop-blur-[2px]" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-black/40 pointer-events-none" />

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-6 relative z-10 min-w-0">
            {/* Perfil & Identidade */}
            <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 text-center sm:text-left min-w-0 w-full sm:w-auto">
              <div className="relative flex-shrink-0">
                <img
                  src="/logo.gif"
                  alt="Nexus Animated Logo"
                  className="w-14 h-14 sm:w-18 sm:h-18 rounded-2xl object-cover border-2 border-brand-500/80 shadow-2xl shadow-brand-500/30 ring-2 ring-brand-400/30"
                />
                <span className="absolute -bottom-1 -right-1 flex h-3.5 w-3.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-slate-900"></span>
                </span>
              </div>

              <div className="min-w-0">
                <div className="flex items-center justify-center sm:justify-start gap-1.5 sm:gap-2 mb-0.5">
                  <h1 className="text-lg sm:text-2xl font-black text-white tracking-tight">NEXUS CHAT</h1>
                  <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500/20 to-brand-500/20 text-amber-300 border border-amber-500/40 text-[9px] sm:text-[10px] font-extrabold uppercase flex-shrink-0">
                    Hub Principal
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-300 truncate">
                  Bem-vindo de volta, <strong className="text-white">{user?.display_name || user?.username || 'Membro'}</strong>!
                </p>

                {/* Badges de Saldo e Sequência */}
                <div className="flex items-center justify-center sm:justify-start gap-2 mt-2 flex-wrap">
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-950/60 border border-amber-500/40 text-amber-300 text-xs font-bold shadow-sm">
                    <img src="/nexus-coin.jpg" alt="Moeda" className="w-3.5 h-3.5 rounded-full flex-shrink-0" />
                    <span>{user?.nexus_coins || 100} Coins</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-200 text-xs font-bold">
                    <Flame className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                    <span>{user?.daily_streak || 0} Dias Streak</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Ações de Acesso Rápido */}
            <div className="flex flex-wrap items-center justify-center gap-2 w-full sm:w-auto">
              <button
                onClick={handleEnterBelmont}
                className="flex-1 sm:flex-initial px-4 sm:px-5 py-2.5 rounded-xl sm:rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 hover:from-amber-400 hover:to-yellow-400 text-black font-extrabold text-xs shadow-lg shadow-amber-500/25 transition-all flex items-center justify-center gap-1.5 active:scale-95 whitespace-nowrap"
              >
                <Crown className="w-4 h-4 flex-shrink-0" /> Entrar na Belmont
              </button>
              {onOpenShop && (
                <button
                  onClick={onOpenShop}
                  className="px-3.5 sm:px-4 py-2.5 rounded-xl sm:rounded-2xl bg-background-surface hover:bg-slate-700/80 text-white font-bold text-xs border border-slate-700 transition-all flex items-center justify-center gap-1.5 active:scale-95"
                >
                  <ShoppingBag className="w-4 h-4 text-amber-400 flex-shrink-0" /> Loja
                </button>
              )}
              {onOpenWallet && (
                <button
                  onClick={onOpenWallet}
                  className="px-3.5 sm:px-4 py-2.5 rounded-xl sm:rounded-2xl bg-background-surface hover:bg-slate-700/80 text-white font-bold text-xs border border-slate-700 transition-all flex items-center justify-center gap-1.5 active:scale-95"
                >
                  <Coins className="w-4 h-4 text-amber-400 flex-shrink-0" /> Carteira
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 2. SEÇÃO DE ENQUETES DA COMUNIDADE & VOTAÇÕES OFICIAIS 🗳️ */}
        <div className="space-y-3 min-w-0">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2 min-w-0">
              <Vote className="w-4 h-4 text-amber-400 flex-shrink-0 animate-pulse" />
              <h2 className="text-xs sm:text-sm font-extrabold text-white uppercase tracking-wider truncate">
                Votações & Enquetes da Comunidade
              </h2>
            </div>

            {isAdmin && (
              <button
                onClick={() => setShowCreatePollModal(true)}
                className="px-2.5 sm:px-3 py-1 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-black font-extrabold text-[11px] sm:text-xs flex items-center gap-1 shadow-md shadow-amber-500/20 active:scale-95 transition-all flex-shrink-0"
              >
                <Plus className="w-3.5 h-3.5" /> <span className="hidden xs:inline">Nova Enquete</span>
              </button>
            )}
          </div>

          {/* Grid de Enquetes */}
          {hubPolls.length === 0 ? (
            <div className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-slate-900/60 border border-slate-800 text-center text-xs text-slate-400">
              Nenhuma enquete ativa no momento.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              {hubPolls.map((poll) => (
                <HubPollCard
                  key={poll.id}
                  poll={poll}
                  currentUser={user}
                  isAdmin={isAdmin}
                  onPollDeleted={(deletedId) => {
                    setHubPolls((prev) => prev.filter((p) => p.id !== deletedId));
                  }}
                  onPollClosed={(pollId, nextState) => {
                    setHubPolls((prev) => prev.map((p) => (p.id === pollId ? { ...p, is_closed: nextState } : p)));
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* 3. GRID SECUNDÁRIO (ESQUERDA: CLIMA & DICAS | DIREITA: PATCH NOTES) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 min-w-0">
          {/* COLUNA ESQUERDA (5 COLUNAS) */}
          <div className="lg:col-span-5 space-y-3 sm:space-y-4 min-w-0">
            {/* Widget de Clima */}
            <div className="p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl bg-background-surface/80 border border-slate-800 shadow-xl space-y-2 min-w-0 box-border">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
                  <span>🌦️</span>
                  <span>Previsão do Tempo</span>
                </div>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-bold uppercase">Ao Vivo</span>
              </div>
              <WeatherWidget />
            </div>

            {/* Card Dinâmico de Dicas da Plataforma */}
            <div className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-slate-900/90 via-background-surface/80 to-slate-900/90 border border-slate-800 shadow-xl space-y-2.5 min-w-0 box-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-lg flex-shrink-0">{currentTip.icon}</span>
                  <span className="text-xs font-extrabold text-amber-300 uppercase tracking-wide truncate">
                    {currentTip.title}
                  </span>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => setCurrentTipIndex((prev) => (prev - 1 + PLATFORM_TIPS.length) % PLATFORM_TIPS.length)}
                    className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-[10px] text-slate-500 font-bold px-1">
                    {currentTipIndex + 1}/{PLATFORM_TIPS.length}
                  </span>
                  <button
                    onClick={() => setCurrentTipIndex((prev) => (prev + 1) % PLATFORM_TIPS.length)}
                    className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed min-h-[42px] break-words">
                {currentTip.text}
              </p>

              <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                <div className="bg-amber-400 h-full w-full animate-pulse" />
              </div>
            </div>

            {/* Card Informativo de Status do Servidor */}
            <div className="p-3 sm:p-4 rounded-2xl sm:rounded-3xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-between min-w-0 box-border">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 flex-shrink-0">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-white truncate">Servidor & Conexão</div>
                  <div className="text-[10px] text-slate-400 truncate">Criptografia Realtime Ativa</div>
                </div>
              </div>
              <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold flex-shrink-0">
                100% Online
              </span>
            </div>
          </div>

          {/* COLUNA DIREITA: FEED DE PATCH NOTES (7 COLUNAS) */}
          <div className="lg:col-span-7 space-y-2.5 sm:space-y-3 min-w-0">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-1.5 min-w-0">
                <FileText className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <h2 className="text-xs sm:text-sm font-extrabold text-white uppercase tracking-wider truncate">
                  Notas de Atualização & Patch Notes
                </h2>
              </div>
              <span className="text-[10px] text-slate-500 flex-shrink-0">Oficial Damon</span>
            </div>

            {/* Lista de Patch Notes em Cards Estilizados */}
            <div className="space-y-2.5 sm:space-y-3 max-h-[520px] overflow-y-auto pr-1">
              {patchNotes.map((patch) => {
                const badgeStyle = BADGE_COLORS[patch.tag] || 'bg-slate-700 text-slate-300 border-slate-600';
                return (
                  <div
                    key={patch.id}
                    className={`p-4 sm:p-5 rounded-2xl sm:rounded-3xl border transition-all min-w-0 box-border ${
                      patch.is_pinned
                        ? 'bg-gradient-to-br from-slate-900/95 via-slate-900/90 to-amber-950/20 border-amber-500/40 shadow-lg shadow-amber-500/5'
                        : 'bg-background-surface/80 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-1.5 mb-1.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`px-2 py-0.2 rounded-full text-[9px] sm:text-[10px] font-extrabold border uppercase ${badgeStyle}`}>
                          {patch.tag}
                        </span>
                        {patch.version && (
                          <span className="text-[10px] sm:text-[11px] font-bold text-slate-400">
                            {patch.version}
                          </span>
                        )}
                        {patch.is_pinned && (
                          <span className="text-[9px] sm:text-[10px] text-amber-400 font-bold flex items-center gap-0.5">
                            📌 Destaque
                          </span>
                        )}
                      </div>
                      <span className="text-[9px] sm:text-[10px] text-slate-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(patch.created_at).toLocaleDateString('pt-BR')} • {patch.author_name}
                      </span>
                    </div>

                    <h3 className="text-xs sm:text-sm font-bold text-white mb-1">{patch.title}</h3>
                    <p className="text-[11px] sm:text-xs text-slate-300 leading-relaxed whitespace-pre-line break-words">
                      {patch.content}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Criação de Enquetes para o Admin */}
      <CreateHubPollModal
        isOpen={showCreatePollModal}
        onClose={() => setShowCreatePollModal(false)}
        currentUser={user}
        onPollCreated={(newPoll) => {
          setHubPolls((prev) => [newPoll, ...prev]);
        }}
      />
    </div>
  );
}
