import React, { useState, useEffect } from 'react';
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
  Check
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

const FRAME_STYLES = {
  frame_cyber_neon: 'border-2 border-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.7)]',
  frame_belmont_gold: 'border-2 border-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.8)]',
  frame_inferno: 'border-2 border-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.7)]',
  frame_galaxy: 'border-2 border-purple-400 shadow-[0_0_10px_rgba(192,132,252,0.8)]'
};

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
    setMasterIdentityForConv
  } = useChat();
  const { isUserOnline, connected } = useSocket();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterTab, setFilterTab] = useState('all'); // 'all' | 'unread' | 'direct' | 'group' | 'master'
  const [allUsersList, setAllUsersList] = useState([]);
  const [superDmTargetConv, setSuperDmTargetConv] = useState('');
  const [superDmIdentityUser, setSuperDmIdentityUser] = useState('');
  const [showStatusMenu, setShowStatusMenu] = useState(false);

  const isAdmin = user?.role === 'admin' || user?.username?.toLowerCase() === 'damon';
  const userFrame = FRAME_STYLES[user?.equipped_frame] || 'border border-slate-700';
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

          let foundId = null;
          if (myParts && myParts.length > 0) {
            const myConvIds = myParts.map((p) => p.conversation_id);
            const { data: directPart } = await supabase
              .from('conversation_participants')
              .select('conversation_id, conversations!inner(type)')
              .eq('user_id', targetUserId)
              .eq('conversations.type', 'direct')
              .in('conversation_id', myConvIds)
              .maybeSingle();

            if (directPart) {
              foundId = directPart.conversation_id;
            }
          }

          if (foundId) {
            targetConvId = foundId;
          } else {
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
      } else {
        targetConvId = superDmTargetConv.replace('conv:', '');
      }

      if (targetConvId && setMasterIdentityForConv) {
        setMasterIdentityForConv(targetConvId, selectedProfile);
        sounds.playPop();
        confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
        handleSelect(targetConvId);
      }
    } catch (err) {
      console.error('Erro ao iniciar Super DM:', err);
    } finally {
      setStartingSuperDm(false);
    }
  };

  // Filtragem de Conversas
  const filteredConversations = conversations.filter((conv) => {
    const isBelmont = conv.id === BELMONT_ID || conv.is_permanent;

    if (filterTab === 'master') return true; // Mostra todas no Master
    if (filterTab === 'direct' && isBelmont) return false;
    if (filterTab === 'unread' && (!conv.unread_count || conv.unread_count === 0)) return false;
    if (filterTab === 'direct' && conv.type !== 'direct') return false;
    if (filterTab === 'group' && conv.type !== 'group' && !isBelmont) return false;

    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    const name = (conv.type === 'group' ? conv.name : conv.direct_user?.display_name || conv.direct_user?.username || '').toLowerCase();
    const lastContent = (conv.last_message?.content || '').toLowerCase();
    return name.includes(term) || lastContent.includes(term);
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
    <div className="w-full md:w-80 lg:w-96 h-full flex flex-col bg-background-card border-r border-slate-800 flex-shrink-0 select-none">
      {/* Topbar Reestruturada: Perfil do Usuário na Linha 1 + Menu de Ações na Linha 2 (Abaixo da Foto) */}
      <div className="p-3 border-b border-slate-800 bg-slate-900/80 backdrop-blur-md space-y-2.5">
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
      <div className="p-3 border-b border-slate-800/80">
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
              className="w-12 h-12 rounded-xl object-cover border border-brand-500/50 shadow-md"
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

            return (
              <div
                key={conv.id}
                onClick={() => handleSelect(conv.id)}
                className={`p-3 rounded-2xl flex items-center gap-3 cursor-pointer transition-all border ${
                  activeMasterIdentity
                    ? 'bg-gradient-to-r from-rose-950/40 via-slate-900 to-slate-900 border-rose-500/50 shadow-md'
                    : isBelmont
                    ? isActive
                      ? 'bg-gradient-to-r from-amber-950/70 via-slate-900 to-indigo-950/60 border-amber-500/80 shadow-lg shadow-amber-500/10'
                      : 'bg-gradient-to-r from-amber-950/30 via-slate-900/50 to-slate-900/30 border-amber-500/40 hover:border-amber-500/70 shadow-sm'
                    : isActive
                    ? 'bg-brand-600/20 border-brand-500/60 shadow-sm'
                    : 'bg-background-surface/50 border-slate-800/80 hover:border-slate-700/80 hover:bg-background-surface'
                }`}
              >
                <div className="relative flex-shrink-0">
                  <img
                    src={convAvatar}
                    alt={convName}
                    className={`w-11 h-11 rounded-2xl object-cover shadow ${
                      activeMasterIdentity
                        ? 'border-2 border-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.6)]'
                        : isBelmont
                        ? 'border-2 border-amber-400'
                        : 'border border-slate-700'
                    }`}
                  />
                  {/* Ponto Vermelho Indicador de Notificação / Modo Master */}
                  {(conv.unread_count > 0 || activeMasterIdentity) && (
                    <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-rose-600 border-2 border-slate-900 shadow-md animate-ping" />
                  )}
                  {conv.unread_count > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 px-1.5 py-0.2 rounded-full bg-rose-600 border-2 border-slate-900 text-white text-[10px] font-extrabold shadow-[0_0_12px_rgba(225,29,72,0.9)] animate-bounce z-10">
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
                      <span className={`text-xs font-bold truncate ${isBelmont ? 'text-amber-300 font-extrabold tracking-wide' : 'text-slate-100'}`}>
                        {convName}
                      </span>
                      {isBelmont && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-extrabold uppercase">
                          Principal
                        </span>
                      )}
                    </div>
                    {conv.last_message && (
                      <span className="text-[10px] text-slate-500 font-medium">
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

                  <div className="flex items-center justify-between">
                    <p className="text-[11px] text-slate-400 truncate max-w-[170px]">
                      {conv.last_message ? (
                        <span>{conv.last_message.content || 'Anexo'}</span>
                      ) : isBelmont ? (
                        <span className="text-amber-400/80">Sala permanente para todos os membros</span>
                      ) : (
                        <span className="italic">Nenhuma mensagem ainda</span>
                      )}
                    </p>

                    {/* Badge Vermelho Luminoso */}
                    {conv.unread_count > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-rose-600 to-red-600 text-white text-[10px] font-extrabold min-w-[20px] text-center shadow-lg shadow-rose-600/40 animate-pulse border border-rose-400/50">
                        {conv.unread_count > 99 ? '99+' : conv.unread_count}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
