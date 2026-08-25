import React, { useState } from 'react';
import { useChat } from '../../context/ChatContext';
import { useSocket } from '../../context/SocketContext';
import {
  ChevronLeft,
  Phone,
  Video,
  Search,
  MoreVertical,
  Users,
  Shield,
  VolumeX,
  Volume2,
  Crown,
  Lock
} from 'lucide-react';

const BELMONT_ID = '00000000-0000-0000-0000-000000000001';

export function ChatHeader({ onBack, onSearchToggle, isSearching }) {
  const { activeConversation, typingUsers } = useChat();
  const { isUserOnline } = useSocket();
  const [showMenu, setShowMenu] = useState(false);

  if (!activeConversation) return null;

  const isBelmont = activeConversation.id === BELMONT_ID || activeConversation.name === 'BELMONT CONFERENCE' || activeConversation.is_permanent;
  const isGroup = activeConversation.type === 'group' || isBelmont;
  const directUser = activeConversation.direct_user;
  const isOnline = !isGroup && directUser ? isUserOnline(directUser.id) : false;

  const avatar = isBelmont
    ? '/belmont-logo.jpg'
    : isGroup
    ? (activeConversation.avatar_url || `https://api.dicebear.com/7.x/identicon/svg?seed=${activeConversation.name}`)
    : (directUser?.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${directUser?.id}`);

  const title = isBelmont ? 'BELMONT CONFERENCE' : isGroup ? activeConversation.name : (directUser?.display_name || 'Usuário');
  const subtitle = isBelmont
    ? 'Sala Principal Oficial • Canal Permanente'
    : isGroup
    ? `${activeConversation.conversation_participants?.length || 2} membros`
    : isOnline
    ? 'online agora'
    : 'visto recentemente';

  return (
    <div className={`h-16 px-4 border-b flex items-center justify-between z-10 backdrop-blur ${
      isBelmont
        ? 'bg-gradient-to-r from-background-card via-slate-900 to-indigo-950/40 border-amber-500/30'
        : 'bg-background-card/90 border-slate-800'
    }`}>
      {/* Esquerda: Botão Voltar (Mobile) + Avatar + Informações */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onBack}
          className="md:hidden p-1.5 -ml-1 text-slate-400 hover:text-white rounded-lg hover:bg-background-surface transition-colors"
          title="Voltar para a lista"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>

        <div className="relative flex-shrink-0">
          <img
            src={avatar}
            alt={title}
            className={`w-10 h-10 rounded-full object-cover shadow-sm ${
              isBelmont
                ? 'border-2 border-amber-400/80 p-0.5 bg-black'
                : 'border border-slate-700'
            }`}
          />
          {isBelmont ? (
            <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-amber-500 rounded-full flex items-center justify-center text-[9px] border border-black">
              🔒
            </span>
          ) : isOnline ? (
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-chat-online rounded-full border-2 border-background-card" />
          ) : null}
        </div>

        <div className="min-w-0">
          <h2 className={`text-sm font-bold truncate flex items-center gap-1.5 ${
            isBelmont ? 'text-amber-300 font-extrabold tracking-wide' : 'text-white'
          }`}>
            {title}
            {isBelmont ? (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                <Crown className="w-3 h-3 text-amber-400" /> Sala Oficial
              </span>
            ) : isGroup ? (
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                Grupo
              </span>
            ) : null}
          </h2>

          {/* Indicador de Digitação ou Subtítulo */}
          {typingUsers.length > 0 ? (
            <div className="flex items-center gap-1 text-xs text-brand-400 animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-bounceShort" />
              <span>
                {typingUsers.length === 1
                  ? `${typingUsers[0].displayName} está digitando...`
                  : 'Várias pessoas digitando...'}
              </span>
            </div>
          ) : (
            <p className={`text-xs truncate ${
              isBelmont
                ? 'text-amber-400/80 font-medium'
                : isOnline
                ? 'text-chat-online font-medium'
                : 'text-slate-400'
            }`}>
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {/* Direita: Ações Rápidas */}
      <div className="flex items-center gap-1 text-slate-400">
        <button
          onClick={() => alert('Chamada de Voz em desenvolvimento para próxima release!')}
          className="p-2 rounded-xl hover:text-slate-200 hover:bg-background-surface transition-colors"
          title="Chamada de Voz"
        >
          <Phone className="w-4 h-4" />
        </button>

        <button
          onClick={() => alert('Chamada de Vídeo em desenvolvimento para próxima release!')}
          className="p-2 rounded-xl hover:text-slate-200 hover:bg-background-surface transition-colors"
          title="Chamada de Vídeo"
        >
          <Video className="w-4 h-4" />
        </button>

        <button
          onClick={onSearchToggle}
          className={`p-2 rounded-xl transition-colors ${
            isSearching ? 'text-brand-400 bg-background-surface' : 'hover:text-slate-200 hover:bg-background-surface'
          }`}
          title="Pesquisar mensagens"
        >
          <Search className="w-4 h-4" />
        </button>

        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 rounded-xl hover:text-slate-200 hover:bg-background-surface transition-colors"
            title="Mais opções da conversa"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {showMenu && (
            <div className="absolute right-0 top-full mt-2 w-52 bg-background-surface border border-slate-700 rounded-xl shadow-2xl py-1 z-30 text-xs animate-fadeIn">
              <div className="px-3 py-2 border-b border-slate-800 text-slate-400 text-[11px]">
                {isBelmont ? (
                  <div className="flex items-center gap-1 text-amber-300 font-semibold">
                    <Lock className="w-3 h-3" /> Sala Permanente Protegida
                  </div>
                ) : (
                  <span>Opções da Conversa</span>
                )}
              </div>
              <button
                onClick={() => {
                  alert(isBelmont ? 'Esta é a sala permanente BELMONT CONFERENCE. Todos os membros do sistema participam automaticamente deste canal.' : `ID da Conversa: ${activeConversation.id}`);
                  setShowMenu(false);
                }}
                className="w-full px-3 py-2 text-left text-slate-200 hover:bg-background-hover flex items-center gap-2"
              >
                <Users className="w-3.5 h-3.5 text-slate-400" /> Sobre esta sala
              </button>
              <button
                onClick={() => setShowMenu(false)}
                className="w-full px-3 py-2 text-left text-slate-200 hover:bg-background-hover flex items-center gap-2"
              >
                <VolumeX className="w-3.5 h-3.5 text-slate-400" /> Silenciar Notificações
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
