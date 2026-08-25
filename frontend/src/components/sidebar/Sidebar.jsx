import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useChat } from '../../context/ChatContext';
import { useSocket } from '../../context/SocketContext';
import { format, isToday, isYesterday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  MessageSquarePlus,
  Users,
  Search,
  Settings,
  Shield,
  ShieldAlert,
  Sparkles,
  Flame,
  Crown,
  Wallet,
  Home
} from 'lucide-react';

const BELMONT_ID = '00000000-0000-0000-0000-000000000001';

export function Sidebar({
  onOpenNewChat,
  onOpenNewGroup,
  onOpenSettings,
  onOpenAuth,
  onOpenShop,
  onOpenWallet,
  onOpenAdmin
}) {
  const { user } = useAuth();
  const { conversations, activeConversationId, setActiveConversationId, loadingConversations } = useChat();
  const { isUserOnline, connected } = useSocket();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterTab, setFilterTab] = useState('all'); // 'all' | 'unread' | 'direct' | 'group'

  // Filtragem de Conversas
  const filteredConversations = conversations.filter((conv) => {
    const isBelmont = conv.id === BELMONT_ID || conv.is_permanent;

    // Se estiver em 'all' ou 'group', Belmont sempre aparece
    if (filterTab === 'direct' && isBelmont) return false;
    if (filterTab === 'unread' && (!conv.unread_count || conv.unread_count === 0)) return false;
    if (filterTab === 'direct' && conv.type !== 'direct') return false;
    if (filterTab === 'group' && conv.type !== 'group' && !isBelmont) return false;

    // Filtro por termo de busca
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

        {/* Botões de Ação da Barra Lateral + Loja + Carteira + Admin */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {/* Botão Painel Admin (Visível apenas para Damon / Admin) */}
          {(user?.role === 'admin' || user?.username?.toLowerCase() === 'damon') && (
            <button
              onClick={onOpenAdmin}
              className="p-1.5 rounded-xl bg-red-500/20 text-red-400 border border-red-500/40 hover:bg-red-500/30 transition-all shadow-sm"
              title="Painel Administrativo Damon"
            >
              <ShieldAlert className="w-4 h-4" />
            </button>
          )}

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
            <Users className="w-4 h-4" />
          </button>
          <button
            onClick={onOpenSettings}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-background-surface transition-colors"
            title="Configurações"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Barra de Busca */}
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
          onClick={() => setActiveConversationId(null)}
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
          <div className="text-center py-12 px-4 text-slate-400 text-xs">
            <p className="font-semibold text-slate-300 mb-1">Nenhuma conversa encontrada</p>
            <p className="text-slate-500">Clique em + para iniciar uma nova conversa com alguém.</p>
          </div>
        ) : (
          filteredConversations.map((conv) => {
            const isBelmont = conv.id === BELMONT_ID || conv.name === 'BELMONT CONFERENCE' || conv.is_permanent;
            const isActive = conv.id === activeConversationId;
            const isGroup = conv.type === 'group' || isBelmont;
            const directUser = conv.direct_user;
            const isOnline = !isGroup && directUser ? isUserOnline(directUser.id) : false;

            const avatar = isBelmont
              ? '/belmont-logo.jpg'
              : isGroup
              ? (conv.avatar_url || `https://api.dicebear.com/7.x/identicon/svg?seed=${conv.name}`)
              : (directUser?.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${directUser?.id}`);

            const title = isBelmont ? 'BELMONT CONFERENCE' : isGroup ? conv.name : (directUser?.display_name || 'Usuário');
            const lastMsg = conv.last_message;
            const time = formatLastMessageTime(lastMsg?.created_at || conv.updated_at);

            return (
              <div
                key={conv.id}
                onClick={() => setActiveConversationId(conv.id)}
                className={`relative flex items-center gap-3 p-3 rounded-2xl cursor-pointer transition-all border ${
                  isBelmont
                    ? isActive
                      ? 'bg-gradient-to-r from-amber-500/20 via-indigo-950/40 to-brand-900/30 border-amber-500/60 shadow-lg shadow-amber-500/10 ring-1 ring-amber-500/40'
                      : 'bg-gradient-to-r from-indigo-950/40 to-slate-900/60 border-amber-500/30 hover:border-amber-500/60'
                    : isActive
                    ? 'bg-brand-600/20 border-brand-500/40 shadow-sm'
                    : 'bg-transparent border-transparent hover:bg-background-surface/60'
                }`}
              >
                {/* Avatar com badge online ou Logo Especial Belmont */}
                <div className="relative flex-shrink-0">
                  <img
                    src={avatar}
                    alt={title}
                    className={`w-12 h-12 rounded-2xl object-cover shadow-sm ${
                      isBelmont
                        ? 'border-2 border-amber-400/80 p-0.5 bg-black'
                        : 'border border-slate-700'
                    }`}
                  />
                  {isBelmont ? (
                    <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-gradient-to-tr from-amber-600 to-yellow-400 rounded-full flex items-center justify-center shadow-md border border-black text-[10px]">
                      👑
                    </span>
                  ) : isOnline ? (
                    <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-chat-online rounded-full border-2 border-background-card" />
                  ) : null}
                </div>

                {/* Detalhes da Conversa */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className={`font-bold text-sm truncate flex items-center gap-1.5 ${
                      isBelmont ? 'text-amber-300 tracking-wide font-extrabold' : 'text-slate-100'
                    }`}>
                      {title}
                      {isBelmont && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold uppercase tracking-wider">
                          Principal
                        </span>
                      )}
                    </span>
                    <span className="text-[10px] text-slate-400 flex-shrink-0 ml-1">
                      {time}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <p className={`text-xs truncate pr-2 ${isBelmont ? 'text-slate-300' : 'text-slate-400'}`}>
                      {lastMsg?.sender_id === user?.id && (
                        <span className="text-brand-400 font-medium mr-1">Você:</span>
                      )}
                      {lastMsg ? (
                        lastMsg.is_deleted ? (
                          <span className="italic opacity-60">Mensagem apagada</span>
                        ) : lastMsg.content ? (
                          lastMsg.content
                        ) : (
                          '📷 Anexo'
                        )
                      ) : (
                        isBelmont ? 'Sala permanente para todos os membros' : 'Nenhuma mensagem ainda'
                      )}
                    </p>

                    {/* Contador de Mensagens Não Lidas */}
                    {conv.unread_count > 0 && (
                      <span className="flex-shrink-0 px-1.5 py-0.5 min-w-[20px] text-center rounded-full bg-brand-500 text-white font-bold text-[10px] shadow-sm animate-pulse">
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
