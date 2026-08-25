import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useChat } from '../../context/ChatContext';
import { useSocket } from '../../context/SocketContext';
import { StoriesBar } from '../stories/StoriesBar';
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
  UserPlus
} from 'lucide-react';

const BELMONT_ID = '00000000-0000-0000-0000-000000000001';

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
  storiesRefreshKey,
  onSelectConversation
}) {
  const { user } = useAuth();
  const { conversations, activeConversationId, setActiveConversationId, loadingConversations } = useChat();
  const { isUserOnline, connected } = useSocket();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterTab, setFilterTab] = useState('all'); // 'all' | 'unread' | 'direct' | 'group'

  const handleSelect = (convId) => {
    setActiveConversationId(convId);
    if (onSelectConversation) onSelectConversation(convId);
  };

  // Filtragem de Conversas
  const filteredConversations = conversations.filter((conv) => {
    const isBelmont = conv.id === BELMONT_ID || conv.is_permanent;

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

  return (
    <div className="w-full md:w-80 lg:w-96 h-full flex flex-col bg-background-card border-r border-slate-800 flex-shrink-0 select-none">
      {/* Topbar: Perfil do Usuário + Ações */}
      <div className="p-3.5 border-b border-slate-800 flex items-center justify-between bg-background-surface/40">
        <div
          onClick={onOpenSettings}
          className="flex items-center gap-2.5 cursor-pointer group hover:opacity-90 transition-opacity min-w-0"
        >
          <div className="relative flex-shrink-0">
            <img
              src={user?.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${user?.id}`}
              alt={user?.display_name}
              className="w-10 h-10 rounded-full object-cover border-2 border-slate-700 group-hover:border-brand-500 transition-colors shadow"
            />
            <span
              className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-background-card ${
                connected ? 'bg-chat-online' : 'bg-amber-500'
              }`}
              title={connected ? 'Conectado ao Realtime' : 'Conectando...'}
            />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm font-bold text-white truncate group-hover:text-brand-300 transition-colors">
              {user?.display_name || 'Meu Perfil'}
            </h1>
            <p className="text-[11px] text-slate-400 truncate">@{user?.username || 'usuario'}</p>
          </div>
        </div>

        {/* Botões de Ação da Barra Lateral */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {/* Botão Painel Admin (Damon) */}
          {(user?.role === 'admin' || user?.username?.toLowerCase() === 'damon') && (
            <button
              onClick={onOpenAdmin}
              className="p-1.5 rounded-xl bg-red-500/20 text-red-400 border border-red-500/40 hover:bg-red-500/30 transition-all shadow-sm"
              title="Painel Administrativo Damon"
            >
              <ShieldAlert className="w-4 h-4" />
            </button>
          )}

          {/* Botão Amigos */}
          <button
            onClick={onOpenFriends}
            className="p-1.5 rounded-xl text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition-all"
            title="Central de Amigos"
          >
            <Users className="w-4 h-4" />
          </button>

          {/* Botão Carteira */}
          <button
            onClick={onOpenWallet}
            className="p-1.5 rounded-xl text-amber-300 hover:text-white bg-amber-500/15 border border-amber-500/30 hover:bg-amber-500/25 transition-all"
            title="Minha Carteira Nexus"
          >
            <Wallet className="w-4 h-4" />
          </button>

          {/* Botão Loja */}
          <button
            onClick={onOpenShop}
            className="flex items-center gap-1 px-2 py-1 rounded-xl bg-gradient-to-r from-amber-500/20 via-yellow-500/20 to-amber-600/20 border border-amber-500/40 text-amber-300 hover:scale-105 transition-all shadow-sm group"
            title="Abrir Loja Nexus & Recompensas"
          >
            <img src="/nexus-coin.jpg" alt="Moeda" className="w-3.5 h-3.5 rounded-full" />
            <span className="text-[11px] font-extrabold group-hover:text-white">Loja</span>
          </button>

          <button
            onClick={onOpenNewChat}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-background-surface transition-colors"
            title="Nova Conversa"
          >
            <MessageSquarePlus className="w-4 h-4" />
          </button>
          <button
            onClick={onOpenNewGroup}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-background-surface transition-colors"
            title="Novo Grupo"
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
            placeholder="Pesquisar conversas..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-background-surface/80 border border-slate-700/60 text-slate-100 placeholder-slate-500 text-xs focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all"
          />
        </div>

        {/* Abas de Filtros */}
        <div className="flex items-center gap-1 mt-2.5">
          {[
            { id: 'all', label: 'Todas' },
            { id: 'unread', label: 'Não lidas' },
            { id: 'direct', label: 'Diretas' },
            { id: 'group', label: 'Grupos' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterTab(tab.id)}
              className={`px-3 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                filterTab === tab.id
                  ? 'bg-brand-600/30 text-brand-300 border border-brand-500/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-background-surface'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Lista de Conversas */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {/* Botão de Retorno à Página Inicial / Hub */}
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

        {loadingConversations ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-400 text-xs gap-2">
            <div className="w-6 h-6 border-2 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" />
            <span>Carregando conversas...</span>
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
                  isBelmont
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
                      isBelmont ? 'border-2 border-amber-400' : 'border border-slate-700'
                    }`}
                  />
                  {isDirect && (
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
                  <div className="flex items-center justify-between mb-1">
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

                  <div className="flex items-center justify-between">
                    <p className="text-[11px] text-slate-400 truncate max-w-[180px]">
                      {conv.last_message ? (
                        <span>{conv.last_message.content || 'Anexo'}</span>
                      ) : isBelmont ? (
                        <span className="text-amber-400/80">Sala permanente para todos os membros</span>
                      ) : (
                        <span className="italic">Nenhuma mensagem ainda</span>
                      )}
                    </p>

                    {conv.unread_count > 0 && (
                      <span className="px-1.5 py-0.5 rounded-full bg-brand-600 text-white text-[10px] font-bold min-w-[18px] text-center shadow">
                        {conv.unread_count}
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
