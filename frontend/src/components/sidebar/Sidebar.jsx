import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useChat } from '../../context/ChatContext';
import { useSocket } from '../../context/SocketContext';
import { StoriesBar } from '../stories/StoriesBar';
import { supabase, isSupabaseConfigured } from '../../lib/supabaseClient';
import { sounds } from '../../lib/sound';
import confetti from 'canvas-confetti';
import { format, isToday, isYesterday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  MessageSquarePlus,
  Users,
  Search,
  Settings,
  ShieldAlert,
  Crown,
  Wallet,
  Home,
  UserPlus,
  Download,
  Sparkles,
  Ghost,
  Send,
  HelpCircle,
  ChevronDown,
  Check,
  Trash2,
  Eraser,
  MoreVertical,
  VolumeX,
  Volume2,
  CheckCheck,
  Lock,
  AlertCircle,
  Pin,
  PinOff,
  X
} from 'lucide-react';

const BELMONT_ID = '00000000-0000-0000-0000-000000000001';

const STATUS_CONFIG = {
  online: {
    label: 'Disponível',
    color: 'bg-emerald-500',
    glow: 'shadow-[0_0_8px_rgba(16,185,129,0.9)] ring-emerald-400',
    textColor: 'text-emerald-400',
    emoji: '🟢',
    description: 'Online e pronto para conversar'
  },
  away: {
    label: 'Ausente',
    color: 'bg-amber-400',
    glow: 'shadow-[0_0_8px_rgba(251,191,36,0.9)] ring-amber-300',
    textColor: 'text-amber-400',
    emoji: '🟡',
    description: 'Temporariamente ausente'
  },
  dnd: {
    label: 'Ocupado',
    color: 'bg-rose-500',
    glow: 'shadow-[0_0_8px_rgba(244,63,94,0.9)] ring-rose-400',
    textColor: 'text-rose-400',
    emoji: '🔴',
    description: 'Não perturbe / Em reunião'
  },
  focus: {
    label: 'Modo Foco',
    color: 'bg-purple-500',
    glow: 'shadow-[0_0_8px_rgba(168,85,247,0.9)] ring-purple-400',
    textColor: 'text-purple-400',
    emoji: '🟣',
    description: 'Focado / Jogando'
  },
  invisible: {
    label: 'Invisível',
    color: 'bg-slate-400',
    glow: 'shadow-[0_0_8px_rgba(148,163,184,0.6)] ring-slate-300',
    textColor: 'text-slate-400',
    emoji: '⚪',
    description: 'Aparecer como desconectado'
  }
};

import { getFrameAsset, getFrameStyle } from '../../lib/shopCatalog';

const NAME_STYLES = {
  name_rainbow_glow: 'bg-gradient-to-r from-red-400 via-amber-300 via-green-300 to-sky-400 bg-clip-text text-transparent font-extrabold',
  name_golden_glow: 'text-amber-300 font-extrabold drop-shadow-[0_0_6px_rgba(251,191,36,0.5)]',
  name_electric_cyan: 'text-cyan-400 font-extrabold drop-shadow-[0_0_6px_rgba(34,211,238,0.5)]'
};

export function Sidebar({
  onOpenNewChat,
  onOpenNewGroup,
  onOpenSettings,
  onOpenAuth,
  onOpenShop,
  onOpenWallet,
  onOpenAdmin,
  onOpenFriends,
  onOpenCreateStory,
  onOpenStoryViewer,
  onOpenProfile,
  onOpenInstallPWA,
  onOpenTutorial,
  storiesRefreshKey,
  onSelectConversation
}) {
  const { user, updateProfile } = useAuth();
  const {
    conversations,
    activeConversationId,
    setActiveConversationId,
    loadingConversations,
    masterIdentities,
    setMasterIdentityForConv,
    loadConversations,
    deleteConversation,
    clearConversation,
    pinnedConversationIds,
    togglePinConversation,
    isConversationPinned
  } = useChat();
  const { isUserOnline, connected } = useSocket();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterTab, setFilterTab] = useState('all'); // 'all' | 'unread' | 'direct' | 'group' | 'master'
  const [allUsersList, setAllUsersList] = useState([]);
  const [superDmTargetConv, setSuperDmTargetConv] = useState('');
  const [superDmIdentityUser, setSuperDmIdentityUser] = useState('');
  const [showStatusMenu, setShowStatusMenu] = useState(false);

  // Estados de Context Menu e Confirmação de Exclusão/Limpeza
  const [contextMenu, setContextMenu] = useState(null); // { conv, x, y }
  const [confirmModal, setConfirmModal] = useState(null); // { type: 'delete' | 'clear', conv }
  const [showBelmontProtectModal, setShowBelmontProtectModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const longPressTimerRef = useRef(null);
  const isLongPressTriggeredRef = useRef(false);

  const isAdmin = user?.role === 'admin' || user?.username?.toLowerCase() === 'damon';
  const userAnimatedFrame = getFrameAsset(user?.equipped_frame);
  const userFrame = getFrameStyle(user?.equipped_frame) || (!userAnimatedFrame ? 'border border-slate-700' : '');
  const userNameStyle = NAME_STYLES[user?.equipped_name_color] || 'text-white font-bold';

  const currentStatusKey = user?.status_message || (connected ? 'online' : 'away');
  const currentStatus = STATUS_CONFIG[currentStatusKey] || STATUS_CONFIG.online;

  const handleUpdateStatus = async (statusKey) => {
    try {
      setShowStatusMenu(false);
      sounds.playPop();
      if (updateProfile) {
        await updateProfile({ status_message: statusKey });
      }
      if (isSupabaseConfigured && supabase && user) {
        await supabase.from('profiles').update({ status_message: statusKey }).eq('id', user.id);
      }
    } catch (err) {
      console.warn('Erro ao atualizar status:', err);
    }
  };

  const [startingSuperDm, setStartingSuperDm] = useState(false);

  // Carregar todos os usuários para o dropdown do Modo Master e manter atualizado em tempo real
  useEffect(() => {
    if (!isAdmin) return;
    async function loadUsers() {
      if (isSupabaseConfigured && supabase) {
        const { data } = await supabase.from('profiles').select('*').order('display_name', { ascending: true });
        if (data) setAllUsersList(data);
      }
    }
    loadUsers();

    if (isSupabaseConfigured && supabase) {
      const channel = supabase
        .channel('sidebar_profiles_realtime')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, (payload) => {
          if (payload.new) {
            setAllUsersList((prev) =>
              prev.map((u) => (u.id === payload.new.id ? { ...u, ...payload.new } : u))
            );
            if (loadConversations) loadConversations();
          }
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [isAdmin, loadConversations]);

  const handleSelect = (convId) => {
    setActiveConversationId(convId);
    if (onSelectConversation) onSelectConversation(convId);
  };

  // --- Manipuladores de Toque Longo (Mobile) e Clique Direito (Desktop) ---
  const handleTouchStart = (conv, e) => {
    isLongPressTriggeredRef.current = false;
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);

    const touch = e.touches[0];
    const clientX = touch.clientX;
    const clientY = touch.clientY;

    longPressTimerRef.current = setTimeout(() => {
      isLongPressTriggeredRef.current = true;
      sounds.playPop();
      if (navigator.vibrate) {
        try { navigator.vibrate(50); } catch (e) {}
      }
      setContextMenu({
        conv,
        x: Math.min(clientX, window.innerWidth - 220),
        y: Math.min(clientY, window.innerHeight - 250)
      });
    }, 550);
  };

  const handleTouchEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
    }
  };

  const handleTouchMove = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
    }
  };

  const handleContextMenu = (conv, e) => {
    e.preventDefault();
    e.stopPropagation();
    sounds.playPop();
    setContextMenu({
      conv,
      x: Math.min(e.clientX, window.innerWidth - 220),
      y: Math.min(e.clientY, window.innerHeight - 250)
    });
  };

  const handleOpenMenuClick = (conv, e) => {
    e.stopPropagation();
    sounds.playPop();
    const rect = e.currentTarget.getBoundingClientRect();
    setContextMenu({
      conv,
      x: Math.min(rect.left, window.innerWidth - 220),
      y: Math.min(rect.bottom + 5, window.innerHeight - 250)
    });
  };

  const handleConfirmActionExecute = async () => {
    if (!confirmModal || !confirmModal.conv) return;
    setActionLoading(true);
    try {
      if (confirmModal.type === 'clear') {
        await clearConversation(confirmModal.conv.id);
      } else if (confirmModal.type === 'delete') {
        await deleteConversation(confirmModal.conv.id);
      }
    } catch (err) {
      console.error('Erro ao executar ação:', err);
    } finally {
      setActionLoading(false);
      setConfirmModal(null);
    }
  };

  const handleStartSuperDm = async () => {
    if (!superDmTargetConv || !superDmIdentityUser || startingSuperDm) return;
    const selectedProfile = allUsersList.find((u) => u.id === superDmIdentityUser);
    if (!selectedProfile) return;

    setStartingSuperDm(true);
    try {
      let targetConvId = null;

      if (superDmTargetConv.startsWith('user:')) {
        const targetUserId = superDmTargetConv.replace('user:', '');

        // 1. Procurar nas conversas já carregadas
        const existingConv = conversations.find(
          (c) => c.type === 'direct' && c.direct_user?.id === targetUserId
        );

        if (existingConv) {
          targetConvId = existingConv.id;
        } else if (isSupabaseConfigured && supabase && user) {
          // 2. Verificar no Supabase se já existe conversa direta entre os dois
          const { data: myParts } = await supabase
            .from('conversation_participants')
            .select('conversation_id')
            .eq('user_id', user.id);

          const myConvIds = (myParts || []).map((p) => p.conversation_id);

          if (myConvIds.length > 0) {
            const { data: commonParts } = await supabase
              .from('conversation_participants')
              .select('conversation_id, conversations(type)')
              .eq('user_id', targetUserId)
              .in('conversation_id', myConvIds);

            const directMatch = (commonParts || []).find(
              (c) => c.conversations && c.conversations.type === 'direct'
            );

            if (directMatch) {
              targetConvId = directMatch.conversation_id;
            }
          }

          if (!targetConvId) {
            // 3. Criar nova conversa direta
            const { data: newConv, error: createConvErr } = await supabase
              .from('conversations')
              .insert({ type: 'direct' })
              .select()
              .single();

            if (newConv && !createConvErr) {
              await supabase.from('conversation_participants').insert([
                { conversation_id: newConv.id, user_id: user.id, role: 'member' },
                { conversation_id: newConv.id, user_id: targetUserId, role: 'member' }
              ]);
              targetConvId = newConv.id;
            }
          }

          if (loadConversations) await loadConversations();
        }
      } else if (superDmTargetConv.startsWith('conv:')) {
        targetConvId = superDmTargetConv.replace('conv:', '');
      }

      if (targetConvId) {
        setMasterIdentityForConv(targetConvId, selectedProfile);
        sounds.playReceive();
        handleSelect(targetConvId);
      }
    } catch (err) {
      console.error('Erro ao iniciar Super DM:', err);
    } finally {
      setStartingSuperDm(false);
    }
  };

  // Função auxiliar para formatar a prévia da última mensagem sem exibir JSON puro
  const formatLastMessagePreview = (lastMsg) => {
    if (!lastMsg) return 'Nenhuma mensagem ainda';
    if (lastMsg.is_deleted) return '🚫 Mensagem apagada';

    // 1. Checagem por tipo explícito
    if (lastMsg.type === 'nexus_burst') return '⚡ Nexus Burst (+20 Coins)';
    if (lastMsg.type === 'ghost') return '👻 Mensagem Fantasma';
    if (lastMsg.type === 'coffee_invite') return '☕ Convite para Café';
    if (lastMsg.type === 'poll') return '📊 Enquete';
    if (lastMsg.type === 'image') return '📷 Foto';
    if (lastMsg.type === 'audio') return '🎵 Áudio';
    if (lastMsg.type === 'file') return '📎 Arquivo';

    const rawContent = (lastMsg.content || '').trim();

    // 2. Checagem por JSON embutido no conteúdo
    if (rawContent.startsWith('{') && rawContent.endsWith('}')) {
      try {
        const parsed = JSON.parse(rawContent);
        if (parsed.nexus_burst) {
          return '⚡ Nexus Burst (+20 Coins)';
        }
        if (parsed.ghost_message) {
          return '👻 Mensagem Fantasma';
        }
        if (parsed.coffee_invite) {
          return '☕ Convite para Café';
        }
        if (parsed.poll) {
          return `📊 Enquete: ${parsed.poll.question || 'Votação'}`;
        }
        if (parsed.text || parsed.content) {
          return parsed.text || parsed.content;
        }
      } catch (e) {
        // Ignora erro e continua para limpeza de markdown
      }
    }

    // 3. Checagem por anexos de mídia
    if (lastMsg.attachments && lastMsg.attachments.length > 0) {
      const first = lastMsg.attachments[0];
      if (first.file_type === 'image' || first.file_url?.match(/\.(jpeg|jpg|gif|png|webp)/i)) {
        return '📷 Foto';
      }
      if (first.file_type === 'audio' || first.file_url?.match(/\.(mp3|wav|ogg)/i)) {
        return '🎵 Áudio';
      }
      return `📎 ${first.file_name || 'Arquivo'}`;
    }

    if (rawContent.startsWith('data:image/')) return '📷 Imagem';
    if (rawContent.startsWith('data:audio/')) return '🎵 Áudio';

    // 4. Limpeza de formatações Markdown para texto puro na prévia
    const cleanText = rawContent
      .replace(/```[\s\S]*?```/g, '💻 Código')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/_([^_]+)_/g, '$1')
      .replace(/~~([^~]+)~~/g, '$1')
      .replace(/\|\|([^|]+)\|\|/g, 'Spoiler');

    return cleanText || 'Mensagem';
  };

  // Filtragem e Ordenação de Conversas com Prioridade para Fixadas
  const filteredConversations = conversations
    .filter((conv) => {
      const isBelmont = conv.id === BELMONT_ID || conv.is_permanent;

      if (filterTab === 'master') return true; // Mostra todas no Master
      if (filterTab === 'direct' && isBelmont) return false;
      if (filterTab === 'unread' && (!conv.unread_count || conv.unread_count === 0)) return false;
      if (filterTab === 'direct' && conv.type !== 'direct') return false;
      if (filterTab === 'group' && conv.type !== 'group' && !isBelmont) return false;

      if (!searchTerm.trim()) return true;
      const term = searchTerm.toLowerCase();
      const name = (conv.type === 'group' ? conv.name : conv.direct_user?.display_name || conv.direct_user?.username || '').toLowerCase();
      const lastPreview = formatLastMessagePreview(conv.last_message).toLowerCase();
      return name.includes(term) || lastPreview.includes(term);
    })
    .sort((a, b) => {
      const aPinned = isConversationPinned(a.id);
      const bPinned = isConversationPinned(b.id);

      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;

      if (aPinned && bPinned) {
        if (a.id === BELMONT_ID) return -1;
        if (b.id === BELMONT_ID) return 1;
        const indexA = (pinnedConversationIds || []).indexOf(a.id);
        const indexB = (pinnedConversationIds || []).indexOf(b.id);
        if (indexA !== -1 && indexB !== -1 && indexA !== indexB) {
          return indexA - indexB;
        }
      }

      const timeA = a.last_message ? new Date(a.last_message.created_at).getTime() : 0;
      const timeB = b.last_message ? new Date(b.last_message.created_at).getTime() : 0;
      return timeB - timeA;
    });

  const formatLastMessageTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isToday(date)) return format(date, 'HH:mm', { locale: ptBR });
    if (isYesterday(date)) return 'Ontem';
    return format(date, 'dd/MM', { locale: ptBR });
  };

  const tabs = [
    { id: 'all', label: 'Todas' },
    { id: 'unread', label: 'Não lidas' },
    { id: 'direct', label: 'Diretas' },
    { id: 'group', label: 'Grupos' },
    ...(isAdmin ? [{ id: 'master', label: '✨ Master', isMaster: true }] : [])
  ];

  return (
    <div className="w-full md:w-80 lg:w-96 h-full flex flex-col bg-background-card border-r border-slate-800 flex-shrink-0 select-none min-w-0 max-w-full overflow-hidden box-border relative">
      {/* Topbar Reestruturada: Perfil do Usuário na Linha 1 + Menu de Ações na Linha 2 (Abaixo da Foto) */}
      <div className="p-3 pt-[max(0.75rem,env(safe-area-inset-top))] border-b border-slate-800 bg-slate-900/80 backdrop-blur-md space-y-2.5 flex-shrink-0 w-full max-w-full box-border">
        {/* LINHA 1: Avatar, Nome Completo, Seletor de Status e Configurações */}
        <div className="flex items-center justify-between gap-2">
          {/* Avatar + Info do Usuário */}
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            {/* Avatar com bolinha de status interativa */}
            <div className="relative flex-shrink-0">
              <img
                src={user?.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${user?.id}`}
                alt={user?.display_name}
                onClick={onOpenSettings}
                className={`w-10 h-10 rounded-full object-cover cursor-pointer hover:scale-105 transition-transform shadow ${userFrame}`}
                title="Clique para abrir Configurações & Personalização"
              />
              {userAnimatedFrame && (
                <img
                  src={userAnimatedFrame}
                  alt="Moldura"
                  className="absolute -inset-[22%] w-[144%] h-[144%] max-w-none pointer-events-none object-contain z-10 select-none drop-shadow-md"
                />
              )}
              {/* Bolinha de Status Clicável com Efeito Neon */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowStatusMenu(!showStatusMenu);
                }}
                className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-slate-900 ${currentStatus.color} ${currentStatus.glow} transition-all hover:scale-125 cursor-pointer z-10`}
                title={`Status atual: ${currentStatus.label}. Clique para alterar.`}
              />
            </div>

            {/* Nome, @user e Botão de Status */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 min-w-0">
                <h1
                  onClick={onOpenSettings}
                  className={`text-sm font-extrabold truncate cursor-pointer hover:text-brand-300 transition-colors ${userNameStyle}`}
                  title={user?.display_name || 'Meu Perfil'}
                >
                  {user?.display_name || 'Meu Perfil'}
                </h1>
                {isAdmin && (
                  <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-red-500/20 text-red-400 font-extrabold border border-red-500/30 flex-shrink-0">
                    ADMIN
                  </span>
                )}
              </div>

              {/* Seletor de Status Interativo */}
              <div className="flex items-center gap-1.5 mt-0.5 relative">
                <button
                  type="button"
                  onClick={() => setShowStatusMenu(!showStatusMenu)}
                  className="flex items-center gap-1 text-[11px] font-semibold text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-750 px-2 py-0.5 rounded-lg border border-slate-700/60 transition-all group"
                  title="Alterar seu status de disponibilidade"
                >
                  <span className={`w-2 h-2 rounded-full ${currentStatus.color} inline-block flex-shrink-0`} />
                  <span className="truncate">{currentStatus.label}</span>
                  <ChevronDown className="w-3 h-3 text-slate-400 group-hover:text-white transition-transform" />
                </button>
                <span className="text-[10px] text-slate-500 truncate">@{user?.username || 'usuario'}</span>
              </div>
            </div>
          </div>

          {/* Botão Configurações */}
          <button
            onClick={onOpenSettings}
            className="p-2 rounded-xl text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-800 border border-slate-700/50 transition-all flex-shrink-0 shadow-sm"
            title="Configurações & Personalização"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>

        {/* POPOVER DO SELETOR DE STATUS */}
        {showStatusMenu && (
          <div className="relative z-30 animate-fadeIn">
            <div className="p-2 rounded-2xl bg-slate-950/95 border border-slate-700 shadow-2xl space-y-1 backdrop-blur-xl">
              <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider px-2 py-1 flex items-center justify-between border-b border-slate-800">
                <span>Definir Meu Status</span>
                <button onClick={() => setShowStatusMenu(false)} className="text-slate-500 hover:text-white">✕</button>
              </div>
              {Object.entries(STATUS_CONFIG).map(([key, st]) => (
                <button
                  key={key}
                  onClick={() => handleUpdateStatus(key)}
                  className={`w-full px-2.5 py-1.5 rounded-xl text-left flex items-center justify-between text-xs transition-all ${
                    currentStatusKey === key
                      ? 'bg-slate-800 text-white font-bold border border-slate-600'
                      : 'text-slate-300 hover:bg-slate-900/80'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`w-2.5 h-2.5 rounded-full ${st.color} ${st.glow} flex-shrink-0`} />
                    <div className="min-w-0">
                      <span className="block font-bold">{st.label}</span>
                      <span className="text-[10px] text-slate-400 block truncate">{st.description}</span>
                    </div>
                  </div>
                  {currentStatusKey === key && <Check className="w-4 h-4 text-brand-400 flex-shrink-0 ml-2" />}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* LINHA 2: Barra de Atalhos e Ferramentas Organizada Abaixo da Foto */}
        <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 gap-1 overflow-x-auto no-scrollbar">
          {/* Botão Painel Admin (Damon) */}
          {isAdmin && (
            <button
              onClick={onOpenAdmin}
              className="p-2 rounded-xl bg-red-500/15 text-red-400 border border-red-500/35 hover:bg-red-500/25 transition-all shadow-sm active:scale-95 flex-shrink-0"
              title="Painel Administrativo Damon"
            >
              <ShieldAlert className="w-4 h-4" />
            </button>
          )}

          {/* Botão Instalar App no Celular */}
          <button
            onClick={onOpenInstallPWA}
            className="p-2 rounded-xl text-emerald-400 hover:text-white bg-emerald-500/15 border border-emerald-500/30 hover:bg-emerald-500/25 transition-all active:scale-95 shadow-sm flex-shrink-0"
            title="Instalar App no Celular (PWA)"
          >
            <Download className="w-4 h-4" />
          </button>

          {/* Botão Amigos */}
          <button
            onClick={onOpenFriends}
            className="p-2 rounded-xl text-slate-300 hover:text-white bg-slate-800/90 hover:bg-slate-700/90 border border-slate-700/50 transition-all active:scale-95 shadow-sm flex-shrink-0"
            title="Central de Amigos"
          >
            <Users className="w-4 h-4" />
          </button>

          {/* Botão Carteira */}
          <button
            onClick={onOpenWallet}
            className="p-2 rounded-xl text-amber-300 hover:text-white bg-amber-500/15 border border-amber-500/30 hover:bg-amber-500/25 transition-all active:scale-95 shadow-sm flex-shrink-0"
            title="Minha Carteira Nexus"
          >
            <Wallet className="w-4 h-4" />
          </button>

          {/* Botão Loja Dourado com Moeda */}
          <button
            onClick={onOpenShop}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500/20 via-yellow-500/20 to-amber-600/20 border border-amber-500/50 text-amber-300 hover:scale-105 transition-all shadow-sm active:scale-95 group flex-shrink-0"
            title="Abrir Loja Nexus (Molduras, Badges, Temas)"
          >
            <img src="/nexus-coin.jpg" alt="Moeda" className="w-3.5 h-3.5 rounded-full ring-1 ring-amber-400/50" />
            <span className="text-xs font-extrabold group-hover:text-white">Loja</span>
          </button>

          {/* Botão Tutorial / Ajuda */}
          {onOpenTutorial && (
            <button
              onClick={onOpenTutorial}
              className="p-2 rounded-xl text-indigo-300 hover:text-white bg-indigo-500/15 border border-indigo-500/30 hover:bg-indigo-500/25 transition-all active:scale-95 shadow-sm flex-shrink-0"
              title="Guia & Tutorial de Recursos"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
          )}

          {/* Botão Nova Conversa */}
          <button
            onClick={onOpenNewChat}
            className="p-2 rounded-xl text-brand-300 hover:text-white bg-brand-600/20 hover:bg-brand-600/30 border border-brand-500/30 transition-all active:scale-95 flex-shrink-0"
            title="Nova Conversa Direta"
          >
            <MessageSquarePlus className="w-4 h-4" />
          </button>

          {/* Botão Novo Grupo */}
          <button
            onClick={onOpenNewGroup}
            className="p-2 rounded-xl text-cyan-300 hover:text-white bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500/30 transition-all active:scale-95 flex-shrink-0"
            title="Criar Novo Grupo"
          >
            <UserPlus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Barra de Stories Estilo Instagram */}
      <StoriesBar
        refreshKey={storiesRefreshKey}
        onOpenCreateStory={onOpenCreateStory}
        onOpenStoryViewer={onOpenStoryViewer}
      />

      {/* Barra de Busca e Filtros */}
      <div className="p-3 border-b border-slate-800/80 w-full max-w-full box-border">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={filterTab === 'master' ? 'Buscar pessoas para o modo master..' : 'Pesquisar conversas...'}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-background-surface/80 border border-slate-700/60 text-slate-100 placeholder-slate-500 text-xs focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all"
          />
        </div>

        {/* Abas de Filtros */}
        <div className="flex items-center gap-1 mt-2.5 overflow-x-auto no-scrollbar">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterTab(tab.id)}
              className={`px-3 py-1 rounded-lg text-[11px] font-semibold transition-all whitespace-nowrap ${
                filterTab === tab.id
                  ? tab.isMaster
                    ? 'bg-gradient-to-r from-rose-600 to-red-600 text-white shadow-md shadow-rose-600/30 border border-rose-400'
                    : 'bg-brand-600/30 text-brand-300 border border-brand-500/40'
                  : tab.isMaster
                  ? 'text-rose-400 hover:text-rose-300 hover:bg-rose-500/10'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-background-surface'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Lista de Conversas & Super DM Card */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {/* CARD SUPER DM (VISÍVEL QUANDO NA ABA MASTER) */}
        {filterTab === 'master' && (
          <div className="p-3.5 mb-2 rounded-2xl bg-gradient-to-br from-rose-950/50 via-slate-900 to-red-950/40 border border-rose-500/40 shadow-xl space-y-3 animate-fadeIn">
            <div className="flex items-center gap-2">
              <span className="text-base">🎭</span>
              <div>
                <h4 className="text-xs font-extrabold text-white flex items-center gap-1.5">
                  <span>Super DM</span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 uppercase font-extrabold">
                    Master
                  </span>
                </h4>
                <p className="text-[10px] text-slate-400">
                  Escolha com quem falar e qual identidade assumir nessa conversa privada.
                </p>
              </div>
            </div>

            <div>
              <label className="text-[10px] text-slate-400 font-bold block mb-1">Receber mensagens de</label>
              <select
                value={superDmTargetConv}
                onChange={(e) => setSuperDmTargetConv(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-background-dark border border-slate-700 text-xs text-white focus:border-rose-500 font-medium"
              >
                <option value="">Selecione quem você quer contatar...</option>

                <optgroup label="👥 Qualquer Usuário (Chat Direto / Privado)">
                  {allUsersList
                    .filter((u) => u.id !== user?.id)
                    .map((u) => (
                      <option key={`user:${u.id}`} value={`user:${u.id}`}>
                        👤 {u.display_name || u.username} (@{u.username})
                      </option>
                    ))}
                </optgroup>

                <optgroup label="💬 Salas e Grupos Oficiais">
                  <option value={`conv:${BELMONT_ID}`}>👑 BELMONT CONFERENCE</option>
                  {conversations
                    .filter((c) => c.type === 'group' && c.id !== BELMONT_ID)
                    .map((c) => (
                      <option key={`conv:${c.id}`} value={`conv:${c.id}`}>
                        👥 {c.name || 'Grupo'}
                      </option>
                    ))}
                </optgroup>
              </select>
            </div>

            <div>
              <label className="text-[10px] text-slate-400 font-bold block mb-1">Responder como</label>
              <select
                value={superDmIdentityUser}
                onChange={(e) => setSuperDmIdentityUser(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl bg-background-dark border border-slate-700 text-xs text-white focus:border-rose-500"
              >
                <option value="">Selecione a identidade...</option>
                {allUsersList.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.display_name || u.username} (@{u.username})
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={handleStartSuperDm}
              disabled={!superDmTargetConv || !superDmIdentityUser}
              className={`w-full py-2.5 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 shadow-lg transition-all ${
                superDmTargetConv && superDmIdentityUser
                  ? 'bg-gradient-to-r from-rose-600 via-red-600 to-rose-700 hover:from-rose-500 text-white shadow-rose-600/30 hover:scale-[1.01]'
                  : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
              }`}
            >
              <span>✨</span>
              <span>Abrir Super DM</span>
            </button>
          </div>
        )}

        {/* Botão de Retorno à Página Inicial / Hub */}
        {filterTab !== 'master' && (
          <button
            onClick={() => handleSelect(null)}
            className={`w-full p-3 rounded-2xl flex items-center gap-3 transition-all text-left ${
              activeConversationId === null || activeConversationId === 'home'
                ? 'bg-gradient-to-r from-brand-600/30 via-slate-800 to-indigo-950/40 border border-brand-500/50 shadow-md'
                : 'bg-background-surface/60 border border-slate-800/80 hover:border-slate-700 hover:bg-background-surface'
            }`}
          >
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-brand-500 to-indigo-600 flex items-center justify-center text-white shadow flex-shrink-0">
              <Home className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white truncate">Página Inicial</span>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-brand-500/20 text-brand-300 font-bold uppercase">
                  Hub
                </span>
              </div>
              <p className="text-[11px] text-slate-400 truncate mt-0.5">Patch notes, clima & dicas da plataforma</p>
            </div>
          </button>
        )}

        {loadingConversations ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-400 text-xs gap-3 select-none">
            <img
              src="/logo.gif"
              alt="Carregando"
              className="w-12 h-12 object-contain drop-shadow-[0_0_12px_rgba(99,102,241,0.6)]"
            />
            <span className="font-semibold text-slate-300">Carregando conversas...</span>
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-400 text-xs text-center px-4">
            <p>Nenhuma conversa encontrada.</p>
          </div>
        ) : (
          filteredConversations.map((conv) => {
            const isBelmont = conv.id === BELMONT_ID || conv.is_permanent;
            const isActive = activeConversationId === conv.id;
            const isPinned = isConversationPinned(conv.id);
            const directUser = conv.direct_user;
            const isDirect = conv.type === 'direct';
            const isOnline = isDirect && directUser && isUserOnline(directUser.id);
            const activeMasterIdentity = masterIdentities?.get(conv.id);

            const convName = isBelmont
              ? 'BELMONT CONFERENCE'
              : isDirect
              ? directUser?.display_name || directUser?.username || 'Usuário'
              : conv.name;

            const convAvatar = isBelmont
              ? '/belmont-logo.jpg'
              : isDirect
              ? directUser?.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${directUser?.id}`
              : conv.avatar_url || `https://api.dicebear.com/7.x/identicon/svg?seed=${conv.id}`;

            const hasUnread = conv.unread_count > 0 && !isActive;

            return (
              <div
                key={conv.id}
                onClick={() => {
                  if (isLongPressTriggeredRef.current) {
                    isLongPressTriggeredRef.current = false;
                    return;
                  }
                  handleSelect(conv.id);
                }}
                onContextMenu={(e) => handleContextMenu(conv, e)}
                onTouchStart={(e) => handleTouchStart(conv, e)}
                onTouchEnd={handleTouchEnd}
                onTouchMove={handleTouchMove}
                className={`group p-3 rounded-2xl flex items-center gap-3 cursor-pointer transition-all border relative overflow-hidden select-none ${
                  activeMasterIdentity
                    ? 'bg-gradient-to-r from-rose-950/40 via-slate-900 to-slate-900 border-rose-500/50 shadow-md'
                    : isBelmont
                    ? isActive
                      ? 'bg-gradient-to-r from-amber-950/70 via-slate-900 to-indigo-950/60 border-amber-500/80 shadow-lg shadow-amber-500/10'
                      : 'bg-gradient-to-r from-amber-950/30 via-slate-900/50 to-slate-900/30 border-amber-500/40 hover:border-amber-500/70 shadow-sm'
                    : isActive
                    ? 'bg-brand-600/20 border-brand-500/60 shadow-sm'
                    : hasUnread
                    ? 'bg-gradient-to-r from-rose-950/60 via-purple-950/40 to-slate-900 border-rose-500/70 shadow-lg shadow-rose-900/25 ring-1 ring-rose-500/40'
                    : isPinned
                    ? 'bg-amber-950/15 border-amber-500/30 hover:border-amber-500/60 hover:bg-slate-800/60 shadow-sm'
                    : 'bg-background-surface/50 border-slate-800/80 hover:border-slate-700/80 hover:bg-background-surface'
                }`}
              >
                {/* Barra Indicadora de Mensagem Nova Não Lida */}
                {hasUnread && (
                  <span className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-rose-500 via-pink-500 to-red-600 shadow-[0_0_10px_rgba(244,63,94,0.9)] animate-pulse" />
                )}

                <div className="relative flex-shrink-0">
                  <img
                    src={convAvatar}
                    alt={convName}
                    className={`w-11 h-11 rounded-2xl object-cover shadow ${
                      activeMasterIdentity
                        ? 'border-2 border-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.6)]'
                        : isBelmont
                        ? 'border-2 border-amber-400'
                        : hasUnread
                        ? 'border-2 border-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]'
                        : isPinned
                        ? 'border-2 border-amber-400/60 shadow-[0_0_8px_rgba(251,191,36,0.3)]'
                        : 'border border-slate-700'
                    }`}
                  />
                  {/* Ponto ou Badge no Avatar */}
                  {hasUnread && (
                    <span className="absolute -top-1.5 -right-1.5 px-1.5 py-0.2 rounded-full bg-gradient-to-r from-rose-600 to-red-600 text-white text-[10px] font-black border-2 border-slate-950 shadow-lg shadow-rose-600/80 animate-bounce z-10">
                      {conv.unread_count > 99 ? '99+' : conv.unread_count}
                    </span>
                  )}
                  {isDirect && !activeMasterIdentity && (
                    <span
                      className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-background-card ${
                        isOnline ? 'bg-chat-online' : 'bg-slate-500'
                      }`}
                    />
                  )}
                  {isBelmont && (
                    <span className="absolute -top-1 -right-1 p-0.5 bg-amber-500 rounded-full text-black shadow">
                      <Crown className="w-3 h-3" />
                    </span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span
                        className={`text-xs truncate ${
                          isBelmont
                            ? 'text-amber-300 font-extrabold tracking-wide'
                            : hasUnread
                            ? 'text-white font-extrabold drop-shadow-[0_0_6px_rgba(244,63,94,0.4)]'
                            : isPinned
                            ? 'text-amber-100 font-bold'
                            : 'text-slate-100 font-bold'
                        }`}
                      >
                        {convName}
                      </span>
                      {isPinned && !isBelmont && (
                        <span title="Conversa Fixada no Topo">
                          <Pin className="w-3 h-3 text-amber-400 fill-amber-400/40 rotate-45 flex-shrink-0" />
                        </span>
                      )}
                      {isBelmont && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-extrabold uppercase">
                          Principal
                        </span>
                      )}
                    </div>
                    {conv.last_message && (
                      <span className={`text-[10px] font-medium ${hasUnread ? 'text-rose-300 font-bold' : isPinned ? 'text-amber-300/80' : 'text-slate-500'}`}>
                        {formatLastMessageTime(conv.last_message.created_at)}
                      </span>
                    )}
                  </div>

                  {/* Subtítulo: Indicador de Identidade Ativa (ex: "Como Pricila") */}
                  {activeMasterIdentity && (
                    <div className="text-[10px] font-bold text-rose-400 flex items-center gap-1 mb-0.5">
                      <span>Como {activeMasterIdentity.display_name || activeMasterIdentity.username}</span>
                      <span className="text-[9px] px-1 py-0.1 rounded bg-rose-500/20 text-rose-300 font-extrabold uppercase">
                        ✨ Master
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-1.5">
                    <p
                      className={`text-[11px] truncate max-w-[155px] sm:max-w-[170px] ${
                        hasUnread ? 'text-rose-200 font-semibold' : 'text-slate-400'
                      }`}
                    >
                      {conv.last_message ? (
                        <span>{formatLastMessagePreview(conv.last_message)}</span>
                      ) : isBelmont ? (
                        <span className="text-amber-400/80">Sala permanente para todos os membros</span>
                      ) : (
                        <span className="italic">Nenhuma mensagem ainda</span>
                      )}
                    </p>

                    <div className="flex items-center gap-1">
                      {/* Badge Vermelho Luminoso de Não Lidas */}
                      {hasUnread && (
                        <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-rose-500 via-red-500 to-pink-500 text-white text-[10px] font-black min-w-[22px] text-center shadow-lg shadow-rose-600/50 animate-pulse border border-rose-300/80 flex-shrink-0">
                          {conv.unread_count > 99 ? '99+' : conv.unread_count}
                        </span>
                      )}

                      {/* Botão de 3 pontinhos para menu de opções no hover/touch */}
                      <button
                        type="button"
                        onClick={(e) => handleOpenMenuClick(conv, e)}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-slate-700/80 text-slate-400 hover:text-white transition-opacity flex-shrink-0"
                        title="Opções da conversa"
                      >
                        <MoreVertical className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* MENU CONTEXTUAL FLUTUANTE (Ao segurar toque no celular ou clicar com botão direito) */}
      {contextMenu && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setContextMenu(null)}
            onContextMenu={(e) => {
              e.preventDefault();
              setContextMenu(null);
            }}
          />
          <div
            style={{
              position: 'fixed',
              top: `${contextMenu.y}px`,
              left: `${contextMenu.x}px`
            }}
            className="w-56 bg-slate-900/95 border border-slate-700/80 rounded-2xl shadow-2xl py-1.5 z-50 text-xs animate-fadeIn backdrop-blur-xl overflow-hidden select-none"
          >
            <div className="px-3.5 py-2 border-b border-slate-800 flex items-center justify-between">
              <span className="font-extrabold text-white truncate max-w-[160px]">
                {contextMenu.conv.id === BELMONT_ID
                  ? 'BELMONT CONFERENCE'
                  : contextMenu.conv.type === 'group'
                  ? contextMenu.conv.name
                  : contextMenu.conv.direct_user?.display_name || contextMenu.conv.direct_user?.username || 'Conversa'}
              </span>
              {contextMenu.conv.id === BELMONT_ID && <Lock className="w-3.5 h-3.5 text-amber-400" />}
            </div>

            {/* Fixar / Desafixar Conversa */}
            <button
              onClick={() => {
                const targetId = contextMenu.conv.id;
                setContextMenu(null);
                togglePinConversation(targetId);
              }}
              className="w-full px-3.5 py-2 text-left text-amber-300 hover:bg-amber-500/10 flex items-center gap-2.5 transition-colors"
            >
              {isConversationPinned(contextMenu.conv.id) ? (
                <>
                  <PinOff className="w-4 h-4 text-amber-400 flex-shrink-0" /> Desafixar conversa
                </>
              ) : (
                <>
                  <Pin className="w-4 h-4 text-amber-400 flex-shrink-0" /> Fixar conversa no topo
                </>
              )}
            </button>

            {/* Marcar como lida */}
            <button
              onClick={() => {
                const targetId = contextMenu.conv.id;
                setContextMenu(null);
                sounds.playPop();
                if (isSupabaseConfigured && supabase && user) {
                  supabase
                    .from('conversation_participants')
                    .update({ unread_count: 0 })
                    .eq('conversation_id', targetId)
                    .eq('user_id', user.id)
                    .then(() => {});
                }
              }}
              className="w-full px-3.5 py-2 text-left text-slate-200 hover:bg-slate-800/80 flex items-center gap-2.5 transition-colors"
            >
              <CheckCheck className="w-4 h-4 text-sky-400 flex-shrink-0" /> Marcar como lida
            </button>

            {/* Limpar Mensagens */}
            <button
              onClick={() => {
                const conv = contextMenu.conv;
                setContextMenu(null);
                setConfirmModal({ type: 'clear', conv });
              }}
              className="w-full px-3.5 py-2 text-left text-amber-300 hover:bg-amber-500/10 flex items-center gap-2.5 transition-colors"
            >
              <Eraser className="w-4 h-4 text-amber-400 flex-shrink-0" /> Limpar mensagens
            </button>

            {/* Apagar Conversa */}
            <button
              onClick={() => {
                const conv = contextMenu.conv;
                setContextMenu(null);
                if (conv.id === BELMONT_ID || conv.is_permanent) {
                  setShowBelmontProtectModal(true);
                } else {
                  setConfirmModal({ type: 'delete', conv });
                }
              }}
              className={`w-full px-3.5 py-2 text-left flex items-center gap-2.5 transition-colors border-t border-slate-800/80 mt-1 ${
                contextMenu.conv.id === BELMONT_ID || contextMenu.conv.is_permanent
                  ? 'text-slate-500 hover:bg-slate-800/40 cursor-not-allowed'
                  : 'text-rose-400 hover:bg-rose-500/10'
              }`}
            >
              <Trash2 className="w-4 h-4 text-rose-400" />
              <span>{contextMenu.conv.id === BELMONT_ID ? 'Conversa Permanente' : 'Apagar conversa'}</span>
            </button>
          </div>
        </>
      )}

      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO OU LIMPEZA */}
      {confirmModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-5 sm:p-6 max-w-sm w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-2xl ${
                confirmModal.type === 'delete' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40' : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
              }`}>
                {confirmModal.type === 'delete' ? <Trash2 className="w-6 h-6" /> : <Eraser className="w-6 h-6" />}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm sm:text-base font-bold text-white">
                  {confirmModal.type === 'delete' ? 'Apagar conversa?' : 'Limpar mensagens?'}
                </h3>
                <p className="text-xs text-slate-400">
                  {confirmModal.type === 'delete'
                    ? 'Esta conversa e todas as suas mensagens serão apagadas permanentemente.'
                    : 'Todas as mensagens deste chat serão limpas para todos os participantes.'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmModal(null)}
                disabled={actionLoading}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmActionExecute}
                disabled={actionLoading}
                className={`flex-1 py-2.5 rounded-xl text-white text-xs font-bold transition-all shadow-lg ${
                  confirmModal.type === 'delete'
                    ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/30'
                    : 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/30'
                }`}
              >
                {actionLoading ? 'Processando...' : confirmModal.type === 'delete' ? 'Sim, apagar' : 'Sim, limpar tudo'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE PROTEÇÃO DA SALA PERMANENTE BELMONT CONFERENCE */}
      {showBelmontProtectModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-slate-900 border border-amber-500/50 rounded-3xl p-5 sm:p-6 max-w-sm w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/40">
                <Crown className="w-6 h-6" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-1.5">
                  <span>Sala Permanente</span>
                  <Lock className="w-4 h-4 text-amber-400" />
                </h3>
                <p className="text-xs text-slate-400">
                  A <strong>BELMONT CONFERENCE</strong> é a sala oficial e permanente do sistema e não pode ser apagada.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowBelmontProtectModal(false)}
              className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition-all shadow-lg shadow-amber-600/30"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
