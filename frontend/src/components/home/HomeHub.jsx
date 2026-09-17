import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useChat } from '../../context/ChatContext';
import { supabase, isSupabaseConfigured } from '../../lib/supabaseClient';
import { WeatherWidget } from './WeatherWidget';
import { HubPollCard } from './HubPollCard';
import { CreateHubPollModal } from './CreateHubPollModal';
import { CreatePatchNoteModal } from './CreatePatchNoteModal';
import GradientWaves from '../common/GradientWaves';
import { MarkdownRenderer } from '../common/MarkdownRenderer';
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
  Plus,
  Trash2,
  Pin
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
    id: 'p-today-shop-v330',
    tag: 'NOVIDADE',
    title: '✨ Grandes Novidades na Loja: Coleções Temáticas de Molduras & Banners!',
    version: 'v3.3.0',
    content: '### 🎨 3 Novas Coleções Oficiais de Molduras Animadas!\n\nA Loja Nexus acaba de receber uma grande atualização com 9 novas molduras animadas exclusivas e banners temáticos:\n\n- 👁️ **Night Terrors**: Mandíbula do Pesadelo, Olho do Abismo e Espectro dos Pesadelos.\n- 🦋 **Dark Folklore**: Chifres Demoníacos, Damas da Noite e Mariposa Fantasma.\n- 🌸 **Fall Floragers**: Coelho da Primavera, Florescer Místico e Primavera Silvestre.\n\nExperimente todas as molduras no **Provador Virtual** em tempo real e aproveite a rotação viva da Loja a cada 72h!',
    author_name: 'Damon',
    is_pinned: true,
    created_at: new Date().toISOString()
  },
  {
    id: 'p-today-casino-v320',
    tag: 'NOVIDADE',
    title: '🎰 Grande Inauguração: Cassino Nexus, Mines, Roleta e Double!',
    version: 'v3.2.0',
    content: '### 🎲 O Cassino Oficial Nexus Chegou!\n\nAproveite suas **Nexus Coins** em uma experiência de minigames solo completa, com visual dark-neon premium e foco total em dispositivos móveis:\n\n- 💎 **Mines (Campo Minado)**: Escolha de 1 a 10 minas, multiplique suas moedas a cada diamante e use o botão de **Sacar (Cash Out)** na hora certa!\n- 🎡 **Roleta da Fortuna (Lucky Wheel)**: Física realista de rotação com ponteiro sonoro e fatias de até **10x de Jackpot**!\n- 🎯 **Double (Roleta de Cores)**: Fita horizontal de 15 slots (Vermelho 2x, Preto 2x, Dourado Nexus 14x) com alinhamento milimétrico.\n- 🛡️ **Matemática Justa & Proteção Econômica**: Sorteios 100% no servidor com RTP balanceado (~96%), limites por rodada e extrato completo na Carteira.\n- ⚡ **Melhorias de Estabilidade no Chat**: Lista de conversas otimizada, limpeza de mensagens via VPS e modo somente admin na Belmont Conference.',
    author_name: 'Damon',
    is_pinned: true,
    created_at: new Date().toISOString()
  },
  {
    id: 'p-today-v312',
    tag: 'PATCH',
    title: '⚡ Atualização Forçada & Safe Area Mobile Imersiva',
    version: 'v3.1.2',
    content: '### 🚀 Melhorias de Altura, Entalhes e Atualização Remota!\n\n- 📱 **Correção de Altura & Notch Mobile**: Loja, Carteira, Hub e Modais agora respeitam perfeitamente a Dynamic Island e a barra de status do iOS e Android.\n- ⚡ **Atualização Remota Forçada**: O Admin agora pode emitir ordens de atualização em tempo real com limpeza de cache instantânea.\n- 🧹 **Renovação de Cache & PWA**: Atualização garantida sem deslogar o usuário ou perder configurações.',
    author_name: 'Damon',
    is_pinned: false,
    created_at: new Date(Date.now() - 3600000).toISOString()
  },
  {
    id: 'p-today',
    tag: 'PATCH',
    title: '👻 Modo Fantasma: Visualização Única & Mensagens Temporárias',
    version: 'v3.1.0',
    content: '### 🛡️ Privacidade e Mensagens Temporárias Restauradas!\n\n- 👁️ **Visualização Única (1x) Blindada**: Fotos e mensagens de abertura única agora ocultam previews de anexos até que sejam explicitamente abertas e destruídas ao fechar.\n- ⏱️ **Timers de Autodestruição (10s, 1m, 1h)**: Contagem regressiva precisa com sincronização em tempo real e barra de progresso.\n- 🧹 **Autodestruição Permanente**: Mensagens expiradas são eliminadas do banco e do chat com status visual de segurança.\n- 🖼️ **Otimização no Compressor de Mídias**: Suporte inteligente a múltiplos formatos de resolução para envio de capas e avatares.',
    author_name: 'Damon',
    is_pinned: true,
    created_at: new Date(Date.now() - 3600000).toISOString()
  },
  {
    id: 'p0',
    tag: 'NOVIDADE',
    title: '🚀 Notificações Push, Swipe-to-Reply & Auto-Update',
    version: 'v3.0.0',
    content: '### 🎉 Grandes Novidades no Nexus Chat!\n\n- 🔔 **Notificações Push em Segundo Plano (Web Push VAPID)**: Receba notificações instantâneas no seu celular ou PC mesmo com o app fechado!\n- 💬 **Swipe-to-Reply Mobile**: Deslize qualquer mensagem para a esquerda para responder rapidamente com vibração háptica!\n- ⚡ **Atualização Automática (PWA Auto-Update)**: O app agora detecta e aplica novas versões silenciosamente.\n- 📢 **Central de Notificações do Administrador**: Envio de comunicados globais e individuais com presets.',
    author_name: 'Damon',
    is_pinned: false,
    created_at: new Date(Date.now() - 86400000).toISOString()
  },
  {
    id: 'p1',
    tag: 'NOVIDADE',
    title: 'Perfil Expandido, Capas & Presentes Animados',
    version: 'v2.6.0',
    content: 'Personalize sua capa de perfil widescreen, visualize avatares em tela cheia (lightbox) e envie presentes animados com raridades e vitrine de troféus.',
    author_name: 'Damon',
    is_pinned: false,
    created_at: new Date(Date.now() - 172800000).toISOString()
  },
  {
    id: 'p2',
    tag: 'NOVIDADE',
    title: 'Loja Nexus, Economia & Wallpapers',
    version: 'v2.5.0',
    content: 'Sistema completo de moedas por mensagens, bônus de login diário, planos de fundo dinâmicos e inventário de efeitos.',
    author_name: 'Damon',
    is_pinned: false,
    created_at: new Date(Date.now() - 259200000).toISOString()
  },
  {
    id: 'p3',
    tag: 'ATUALIZAÇÃO',
    title: 'Edição e Exclusão de Mensagens',
    version: 'v2.4.0',
    content: 'Agora você pode editar suas mensagens enviadas e excluir com placeholder estilizado em tempo real.',
    author_name: 'Damon',
    is_pinned: false,
    created_at: new Date(Date.now() - 345600000).toISOString()
  }
];

export function HomeHub({ onOpenChat, onOpenConversations, onOpenShop, onOpenWallet, onOpenCasino, onBack }) {
  const { user } = useAuth();
  const { conversations, setActiveConversationId } = useChat();

  const [currentTipIndex, setCurrentTipIndex] = useState(0);
  const [patchNotes, setPatchNotes] = useState([]);
  const [loadingPatches, setLoadingPatches] = useState(true);
  const [patchFilter, setPatchFilter] = useState('all'); // 'all' | 'novidades' | 'patches' | 'pinned'
  const [showCreatePatchModal, setShowCreatePatchModal] = useState(false);
  const [hubPolls, setHubPolls] = useState([]);
  const [loadingPolls, setLoadingPolls] = useState(false);
  const [showCreatePollModal, setShowCreatePollModal] = useState(false);

  const belmontConv = (conversations || []).find((c) => c.id === BELMONT_ID || c.is_permanent);
  const belmontUnreadCount = belmontConv?.unread_count || 0;

  const isAdmin = user?.role === 'admin' || user?.username === 'damon';

  // Rotação de dicas
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTipIndex((prev) => (prev + 1) % PLATFORM_TIPS.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  // Carregar Patch Notes & Enquetes do Hub do Supabase com Realtime
  useEffect(() => {
    loadPatches();
    loadHubPolls();

    if (!isSupabaseConfigured || !supabase) return;

    const patchChannel = supabase
      .channel('hub_patch_notes_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'patch_notes' },
        (payload) => {
          if (payload.eventType === 'INSERT' && payload.new) {
            setPatchNotes((prev) => [payload.new, ...prev.filter((p) => p.id !== payload.new.id)]);
          } else if (payload.eventType === 'DELETE' && payload.old) {
            setPatchNotes((prev) => prev.filter((p) => p.id !== payload.old.id));
          } else if (payload.eventType === 'UPDATE' && payload.new) {
            setPatchNotes((prev) =>
              prev.map((p) => (p.id === payload.new.id ? payload.new : p))
            );
          } else {
            loadPatches();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(patchChannel);
    };
  }, []);

  const loadPatches = async () => {
    if (!isSupabaseConfigured || !supabase) {
      setPatchNotes(DEFAULT_FALLBACK_PATCHES);
      setLoadingPatches(false);
      return;
    }
    try {
      setLoadingPatches(true);
      const { data, error } = await supabase
        .from('patch_notes')
        .select('*')
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false });

      if (!error && Array.isArray(data)) {
        // Usa estritamente os dados do banco - o que for apagado permanece apagado!
        setPatchNotes(data);
      } else if (error) {
        console.warn('Erro ao carregar patch notes do banco:', error);
      }
    } catch (err) {
      console.warn('Usando patch notes locais por falha de rede:', err);
      setPatchNotes(DEFAULT_FALLBACK_PATCHES);
    } finally {
      setLoadingPatches(false);
    }
  };

  const handleDeletePatch = async (patchId) => {
    if (!window.confirm('Deseja excluir esta nota de atualização do Hub?')) return;
    try {
      setPatchNotes((prev) => prev.filter((p) => p.id !== patchId));
      if (isSupabaseConfigured && supabase) {
        await supabase.from('patch_notes').delete().eq('id', patchId);
      }
    } catch (err) {
      console.error('Erro ao excluir patch note:', err);
      loadPatches();
    }
  };

  const handleTogglePinPatch = async (patchId, currentPinned) => {
    try {
      const nextState = !currentPinned;
      setPatchNotes((prev) =>
        prev.map((p) => (p.id === patchId ? { ...p, is_pinned: nextState } : p))
      );
      if (isSupabaseConfigured && supabase) {
        await supabase.from('patch_notes').update({ is_pinned: nextState }).eq('id', patchId);
      }
    } catch (err) {
      console.error('Erro ao alternar destaque:', err);
      loadPatches();
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

  const handleGoToConversations = () => {
    // Redireciona para a lista de conversas sem forçar a abertura automática do Belmont
    setActiveConversationId(null);
    if (onOpenConversations) {
      onOpenConversations();
    } else if (onBack) {
      onBack();
    }
  };

  const currentTip = PLATFORM_TIPS[currentTipIndex] || PLATFORM_TIPS[0];

  const isWithin24Hours = (dateStr) => {
    if (!dateStr) return false;
    const t = new Date(dateStr).getTime();
    if (isNaN(t)) return false;
    const diffMs = Date.now() - t;
    return diffMs >= 0 && diffMs < 24 * 60 * 60 * 1000;
  };

  const hasRecentPatches = (patchNotes || []).some((p) => isWithin24Hours(p.created_at));

  return (
    <div className="flex-1 flex flex-col h-full bg-gradient-to-b from-background-darker via-background-dark to-background-darker overflow-y-auto relative select-none box-border">
      {/* Background Decorativo Glow */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-brand-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-10 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-5xl w-full mx-auto p-3.5 pt-[max(1rem,calc(env(safe-area-inset-top,0px)+0.75rem))] pb-[max(1.5rem,calc(env(safe-area-inset-bottom,0px)+1rem))] sm:p-6 lg:p-8 space-y-4 sm:space-y-6 box-border min-w-0">
        {/* Botão de Voltar para Barra Lateral em Dispositivos Móveis */}
        {onBack && (
          <button
            onClick={onBack}
            className="md:hidden flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900/90 border border-slate-700/80 text-slate-200 font-bold text-xs shadow-lg active:scale-95 transition-all"
          >
            <ChevronLeft className="w-4 h-4 text-amber-400" />
            <span>Voltar para Lista de Conversas</span>
          </button>
        )}

        {/* 1. HERO BANNER PRINCIPAL COM GRADIENT WAVES & DESIGN COMPACTO */}
        <div className="relative rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 border border-indigo-500/40 shadow-2xl overflow-hidden min-w-0 box-border group">
          {/* Efeito Dinâmico GradientWaves Vibrante e Visível */}
          <div className="absolute inset-0 pointer-events-auto">
            <GradientWaves
              horizonColor="#1e0836"
              waveColor="#6366f1"
              crestColor="#38bdf8"
              speed={0.45}
              amplitude={3.2}
              waveScale={0.75}
              waveRatio={0.9}
              swell={28}
              turbulence={16}
              tilt={1.12}
              zoom={1.05}
              height={5.2}
              fogDepth={18}
              detail="medium"
              brightness={1.3}
              opacity={0.95}
              mouseInteraction={true}
              parallaxStrength={0.5}
              grain={false}
            />
          </div>

          {/* Overlay Leve Glassmorphism para Máximo Destaque das Ondas */}
          <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-[1px] pointer-events-none" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-transparent to-black/20 pointer-events-none" />

          <div className="flex flex-col md:flex-row items-center justify-between gap-3 sm:gap-4 relative z-10 min-w-0">
            {/* Perfil & Identidade em Linha Compacta */}
            <div className="flex items-center gap-3 sm:gap-4 min-w-0 w-full md:w-auto">
              <div className="relative flex-shrink-0">
                <img
                  src="/logov2.gif"
                  alt="Nexus Logo"
                  className="w-12 h-12 sm:w-16 sm:h-16 object-contain drop-shadow-[0_0_18px_rgba(99,102,241,0.8)] select-none transition-transform hover:scale-105"
                />
                <span className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 border border-slate-900"></span>
                </span>
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h1 className="text-base sm:text-xl font-black text-white tracking-tight drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">NEXUS CHAT</h1>
                  <span className="px-2 py-0.2 rounded-full bg-amber-500/25 text-amber-300 border border-amber-400/50 text-[9px] font-extrabold uppercase flex-shrink-0 shadow">
                    Hub Principal
                  </span>
                </div>
                <p className="text-xs text-slate-200 truncate drop-shadow-sm">
                  Bem-vindo de volta, <strong className="text-amber-300 font-bold">{user?.display_name || user?.username || 'Membro'}</strong>!
                </p>

                {/* Badges de Saldo e Sequência */}
                <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                  <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-black/60 border border-amber-500/50 text-amber-300 text-[11px] font-bold shadow backdrop-blur-sm">
                    <img src="/nexus-coin.jpg" alt="Moeda" className="w-3.5 h-3.5 rounded-full flex-shrink-0" />
                    <span>{user?.nexus_coins || 100} Coins</span>
                  </div>
                  <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-black/60 border border-slate-700 text-slate-200 text-[11px] font-bold shadow backdrop-blur-sm">
                    <Flame className="w-3 h-3 text-amber-400 flex-shrink-0" />
                    <span>{user?.daily_streak || 0} Dias Streak</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Ações de Acesso Rápido em Linha Compacta */}
            <div className="grid grid-cols-2 sm:flex sm:items-center gap-1.5 sm:gap-2 w-full md:w-auto">
              <button
                onClick={handleGoToConversations}
                className="px-3 sm:px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 hover:from-amber-400 text-black font-extrabold text-xs shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-1.5 active:scale-95 whitespace-nowrap relative group"
                title="Acessar lista de conversas e escolher onde entrar"
              >
                <Crown className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="truncate">Belmont</span>
                {belmontUnreadCount > 0 && (
                  <span
                    title={`${belmontUnreadCount} novas mensagens`}
                    className="px-1.5 py-0.2 rounded-full bg-slate-950 text-amber-300 text-[10px] font-black border border-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)] animate-bounce flex items-center"
                  >
                    <span>{belmontUnreadCount > 99 ? '99+' : belmontUnreadCount}</span>
                  </span>
                )}
              </button>
              {onOpenCasino && (
                <button
                  onClick={onOpenCasino}
                  className="px-3 sm:px-3.5 py-2 rounded-xl bg-gradient-to-r from-purple-900/60 to-slate-900/90 hover:from-purple-800/80 text-white font-bold text-xs border border-purple-500/50 backdrop-blur-sm transition-all flex items-center justify-center gap-1 active:scale-95 shadow-md shadow-purple-500/20"
                >
                  <span className="text-xs">🎰</span> <span className="truncate">Cassino</span>
                </button>
              )}
              {onOpenShop && (
                <button
                  onClick={onOpenShop}
                  className="px-3 sm:px-3.5 py-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-white font-bold text-xs border border-slate-700/80 backdrop-blur-sm transition-all flex items-center justify-center gap-1 active:scale-95"
                >
                  <ShoppingBag className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" /> <span className="truncate">Loja</span>
                </button>
              )}
              {onOpenWallet && (
                <button
                  onClick={onOpenWallet}
                  className="px-3 sm:px-3.5 py-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-white font-bold text-xs border border-slate-700/80 backdrop-blur-sm transition-all flex items-center justify-center gap-1 active:scale-95"
                >
                  <Coins className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" /> <span className="truncate">Carteira</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* BANNER DESTAQUE: ATUALIZAÇÃO DA LOJA - NOVAS MOLDURAS DISPONÍVEIS */}
        {onOpenShop && (
          <div
            onClick={onOpenShop}
            className="cursor-pointer p-3.5 sm:p-4 md:p-5 rounded-2xl sm:rounded-3xl bg-gradient-to-r from-purple-950/80 via-slate-900/95 to-amber-950/80 border border-amber-500/40 hover:border-amber-400/80 shadow-2xl relative overflow-hidden group transition-all active:scale-[0.99] space-y-3 sm:space-y-3.5"
          >
            {/* Efeitos de Glow no fundo */}
            <div className="absolute -top-12 -right-12 w-64 h-64 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-12 -left-12 w-64 h-64 bg-purple-500/15 rounded-full blur-3xl pointer-events-none" />

            {/* Cabeçalho do Banner */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 relative z-10">
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-gradient-to-br from-amber-400 via-yellow-500 to-amber-600 flex items-center justify-center text-lg sm:text-xl shadow-lg shadow-amber-500/30 group-hover:scale-105 transition-transform flex-shrink-0 text-black font-black">
                  ✨
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                    <h3 className="text-xs sm:text-sm md:text-base font-black text-white tracking-wide uppercase">
                      NOVAS MOLDURAS DISPONÍVEIS
                    </h3>
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/25 text-amber-300 border border-amber-400/50 text-[9px] sm:text-[10px] font-black uppercase shadow animate-pulse flex items-center gap-1">
                      <Sparkles className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-yellow-300" /> Loja Nexus
                    </span>
                  </div>
                  <p className="text-[11px] sm:text-xs text-slate-300 truncate mt-0.5">
                    3 novas coleções temáticas e 9 molduras animadas exclusivas chegaram ao Nexus Chat!
                  </p>
                </div>
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenShop();
                }}
                className="px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 hover:from-amber-400 text-black font-extrabold text-xs shadow-lg shadow-amber-500/25 active:scale-95 transition-all flex items-center justify-center gap-1.5 flex-shrink-0 relative z-10 self-start sm:self-auto"
              >
                <span>Explorar na Loja</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Grade dos 3 Banners das Coleções Temáticas: / / / */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 relative z-10 pt-0.5">
              {/* Banner 1: Night Terrors */}
              <div className="relative overflow-hidden rounded-xl sm:rounded-2xl border border-purple-500/50 shadow-md group/banner bg-slate-950 aspect-[4.2/1] sm:aspect-[3.6/1]">
                <img
                  src="/frames/night_terrors/banner.png"
                  alt="Night Terrors"
                  className="w-full h-full object-cover object-center group-hover/banner:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-transparent p-2 sm:p-2.5 flex items-end justify-between">
                  <span className="text-[9px] sm:text-[10px] font-black px-2 py-0.5 rounded-lg bg-purple-600/90 text-white shadow-md border border-purple-400/50 backdrop-blur-sm">
                    👁️ Night Terrors
                  </span>
                  <span className="text-[8px] sm:text-[9px] text-purple-200 font-bold bg-black/60 px-1.5 py-0.5 rounded backdrop-blur-sm">
                    3 Molduras
                  </span>
                </div>
              </div>

              {/* Banner 2: Dark Folklore */}
              <div className="relative overflow-hidden rounded-xl sm:rounded-2xl border border-emerald-500/50 shadow-md group/banner bg-slate-950 aspect-[4.2/1] sm:aspect-[3.6/1]">
                <img
                  src="/frames/dark_folklore/banner.png"
                  alt="Dark Folklore"
                  className="w-full h-full object-cover object-center group-hover/banner:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-transparent p-2 sm:p-2.5 flex items-end justify-between">
                  <span className="text-[9px] sm:text-[10px] font-black px-2 py-0.5 rounded-lg bg-emerald-600/90 text-black shadow-md border border-emerald-400/50 backdrop-blur-sm font-extrabold">
                    🦋 Dark Folklore
                  </span>
                  <span className="text-[8px] sm:text-[9px] text-emerald-200 font-bold bg-black/60 px-1.5 py-0.5 rounded backdrop-blur-sm">
                    3 Molduras
                  </span>
                </div>
              </div>

              {/* Banner 3: Fall Floragers */}
              <div className="relative overflow-hidden rounded-xl sm:rounded-2xl border border-amber-500/50 shadow-md group/banner bg-slate-950 aspect-[4.2/1] sm:aspect-[3.6/1]">
                <img
                  src="/frames/fall_floragers/banner.png"
                  alt="Fall Floragers"
                  className="w-full h-full object-cover object-center group-hover/banner:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-transparent p-2 sm:p-2.5 flex items-end justify-between">
                  <span className="text-[9px] sm:text-[10px] font-black px-2 py-0.5 rounded-lg bg-amber-500/90 text-black shadow-md border border-amber-300/50 backdrop-blur-sm font-extrabold">
                    🌸 Fall Floragers
                  </span>
                  <span className="text-[8px] sm:text-[9px] text-amber-200 font-bold bg-black/60 px-1.5 py-0.5 rounded backdrop-blur-sm">
                    3 Molduras
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

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
            {/* Topbar da Seção com Ações de Admin */}
            <div className="flex flex-wrap items-center justify-between gap-2 px-1">
              <div className="flex items-center gap-1.5 min-w-0">
                <FileText className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <h2 className="text-xs sm:text-sm font-extrabold text-white uppercase tracking-wider truncate">
                  Notas de Atualização & Patch Notes
                </h2>
                {hasRecentPatches && (
                  <span className="px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[9px] font-extrabold uppercase flex items-center gap-1 animate-pulse">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    Novo
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                {isAdmin && (
                  <button
                    onClick={() => setShowCreatePatchModal(true)}
                    className="px-2.5 sm:px-3 py-1 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-black font-extrabold text-[11px] sm:text-xs flex items-center gap-1 shadow-md shadow-amber-500/20 active:scale-95 transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" /> <span>Nova Notícia</span>
                  </button>
                )}
                <span className="text-[10px] text-slate-500 hidden sm:inline">Oficial Damon</span>
              </div>
            </div>

            {/* Filtros de Categoria */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 px-1">
              {[
                { id: 'all', label: 'Todas' },
                { id: 'novidades', label: 'Novidades' },
                { id: 'patches', label: 'Patches' },
                { id: 'pinned', label: '📌 Destaques' }
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setPatchFilter(f.id)}
                  className={`px-2.5 py-1 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all ${
                    patchFilter === f.id
                      ? 'bg-amber-500 text-black font-black shadow-sm'
                      : 'bg-slate-900/80 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Lista de Patch Notes Filtrada */}
            <div className="space-y-2.5 sm:space-y-3 max-h-[520px] overflow-y-auto pr-1">
              {loadingPatches ? (
                <div className="p-8 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-center gap-2 text-xs text-slate-400">
                  <div className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                  <span>Carregando notas oficiais...</span>
                </div>
              ) : patchNotes.filter((patch) => {
                  if (patchFilter === 'novidades') return patch.tag === 'NOVIDADE';
                  if (patchFilter === 'patches') return patch.tag === 'PATCH' || patch.tag === 'ATUALIZAÇÃO';
                  if (patchFilter === 'pinned') return Boolean(patch.is_pinned);
                  return true;
                }).length === 0 ? (
                <div className="p-8 rounded-2xl sm:rounded-3xl bg-slate-900/60 border border-slate-800 text-center space-y-3">
                  <p className="text-xs text-slate-400">Nenhuma nota de atualização encontrada nesta categoria.</p>
                  {isAdmin && (
                    <button
                      onClick={() => setShowCreatePatchModal(true)}
                      className="px-3.5 py-1.5 rounded-xl bg-amber-500 text-black font-extrabold text-xs shadow hover:bg-amber-400 transition-all inline-flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Publicar Notícia Agora</span>
                    </button>
                  )}
                </div>
              ) : (
                patchNotes
                  .filter((patch) => {
                    if (patchFilter === 'novidades') return patch.tag === 'NOVIDADE';
                    if (patchFilter === 'patches') return patch.tag === 'PATCH' || patch.tag === 'ATUALIZAÇÃO';
                    if (patchFilter === 'pinned') return Boolean(patch.is_pinned);
                    return true;
                  })
                  .map((patch) => {
                    const badgeStyle = BADGE_COLORS[patch.tag] || 'bg-slate-700 text-slate-300 border-slate-600';
                    const isNew = isWithin24Hours(patch.created_at);

                    return (
                      <div
                        key={patch.id}
                        className={`p-4 sm:p-5 rounded-2xl sm:rounded-3xl border transition-all min-w-0 box-border group relative ${
                          patch.is_pinned
                            ? 'bg-gradient-to-br from-slate-900/95 via-slate-900/90 to-amber-950/20 border-amber-500/40 shadow-lg shadow-amber-500/5'
                            : 'bg-background-surface/80 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-1.5 mb-1.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {isNew && (
                              <span className="px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black bg-gradient-to-r from-emerald-500 to-teal-400 text-black border border-emerald-300 shadow-[0_0_10px_rgba(52,211,153,0.8)] animate-pulse flex items-center gap-1 flex-shrink-0">
                                <span className="w-1.5 h-1.5 rounded-full bg-black" />
                                NOVO • 24H
                              </span>
                            )}
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

                          <div className="flex items-center gap-2">
                            <span className="text-[9px] sm:text-[10px] text-slate-500 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {new Date(patch.created_at).toLocaleDateString('pt-BR')} • {patch.author_name}
                            </span>

                            {/* Controles do Administrador */}
                            {isAdmin && (
                              <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                                <button
                                  type="button"
                                  onClick={() => handleTogglePinPatch(patch.id, patch.is_pinned)}
                                  className={`p-1 rounded-lg border text-xs transition-colors ${
                                    patch.is_pinned
                                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
                                      : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                                  }`}
                                  title={patch.is_pinned ? 'Remover Destaque' : 'Fixar no Topo'}
                                >
                                  <Pin className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeletePatch(patch.id)}
                                  className="p-1 rounded-lg bg-rose-500/15 text-rose-300 border border-rose-500/30 hover:bg-rose-500/25 transition-colors"
                                  title="Excluir Nota de Atualização"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        <h3 className="text-xs sm:text-sm font-bold text-white mb-1.5">{patch.title}</h3>
                        <MarkdownRenderer
                          content={patch.content}
                          className="text-[11px] sm:text-xs text-slate-300"
                        />
                      </div>
                    );
                  })
              )}
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

      {/* Modal de Criação de Notícias / Patch Notes para o Admin */}
      <CreatePatchNoteModal
        isOpen={showCreatePatchModal}
        onClose={() => setShowCreatePatchModal(false)}
        currentUser={user}
        onPatchCreated={(newPatch) => {
          setPatchNotes((prev) => [newPatch, ...prev]);
        }}
      />
    </div>
  );
}
