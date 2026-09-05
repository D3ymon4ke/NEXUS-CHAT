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
  Lock,
  Trash2,
  Eraser,
  AlertTriangle,
  Pin,
  PinOff,
  X
} from 'lucide-react';

const BELMONT_ID = '00000000-0000-0000-0000-000000000001';

export function ChatHeader({ onBack, onSearchToggle, isSearching, onOpenProfile }) {
  const {
    activeConversation,
    typingUsers = [],
    deleteConversation,
    clearConversation,
    isConversationPinned,
    togglePinConversation
  } = useChat();
  const { isUserOnline } = useSocket();
  const [showMenu, setShowMenu] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null); // null | 'clear' | 'delete'
  const [actionLoading, setActionLoading] = useState(false);

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

  const handleProfileClick = () => {
    if (!isGroup && directUser && onOpenProfile) {
      onOpenProfile(directUser);
    }
  };

  const handleConfirmExecute = async () => {
    setActionLoading(true);
    try {
      if (confirmAction === 'clear') {
        await clearConversation(activeConversation.id);
      } else if (confirmAction === 'delete') {
        await deleteConversation(activeConversation.id);
        onBack?.();
      }
    } catch (err) {
      console.error('Erro ao executar ação:', err);
    } finally {
      setActionLoading(false);
      setConfirmAction(null);
      setShowMenu(false);
    }
  };

  return (
    <>
      <div className={`min-h-[3.75rem] sm:min-h-[4rem] pt-[max(0.75rem,env(safe-area-inset-top))] pb-2 px-2.5 sm:px-4 border-b flex items-center justify-between z-10 backdrop-blur flex-shrink-0 w-full max-w-full min-w-0 box-border ${
        isBelmont
          ? 'bg-gradient-to-r from-background-card via-slate-900 to-indigo-950/40 border-amber-500/30'
          : 'bg-background-card/90 border-slate-800'
      }`}>
        {/* Esquerda: Botão Voltar (Mobile) + Avatar + Informações */}
        <div
          onClick={handleProfileClick}
          className={`flex items-center gap-2 sm:gap-3 min-w-0 flex-1 mr-1.5 ${
            !isGroup && directUser ? 'cursor-pointer hover:opacity-90 transition-opacity' : ''
          }`}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              onBack?.();
            }}
            className="md:hidden p-1.5 -ml-1 text-slate-400 hover:text-white rounded-lg hover:bg-background-surface transition-colors flex-shrink-0"
            title="Voltar para a lista"
            aria-label="Voltar"
          >
            <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>

          <div className="relative flex-shrink-0">
            <img
              src={avatar}
              alt={title}
              className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full object-cover shadow-sm ${
                isBelmont
                  ? 'border-2 border-amber-400/80 p-0.5 bg-black'
                  : 'border border-slate-700'
              }`}
            />
            {isBelmont ? (
              <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 sm:w-4 sm:h-4 bg-amber-500 rounded-full flex items-center justify-center text-[8px] sm:text-[9px] border border-black">
                🔒
              </span>
            ) : isOnline ? (
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 sm:w-3 sm:h-3 bg-chat-online rounded-full border-2 border-background-card" />
            ) : null}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 min-w-0">
              <h2 className={`text-xs sm:text-sm font-bold truncate ${
                isBelmont ? 'text-amber-300 font-extrabold tracking-wide' : 'text-white'
              }`}>
                {title}
              </h2>
              {isConversationPinned?.(activeConversation.id) && !isBelmont && (
                <span title="Conversa Fixada no Topo">
                  <Pin className="w-3.5 h-3.5 text-amber-400 fill-amber-400/40 rotate-45 flex-shrink-0" />
                </span>
              )}
              {isBelmont ? (
                <span className="text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1 flex-shrink-0">
                  <Crown className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-amber-400" />
                  <span className="hidden sm:inline">Sala Oficial</span>
                </span>
              ) : isGroup ? (
                <span className="text-[9px] sm:text-[10px] px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 flex-shrink-0">
                  Grupo
                </span>
              ) : null}
            </div>

            {/* Indicador de Digitação ou Subtítulo */}
            {typingUsers.length > 0 ? (
              <div className="flex items-center gap-1 text-[11px] sm:text-xs text-brand-400 animate-pulse truncate min-w-0">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-bounceShort flex-shrink-0" />
                <span className="truncate">
                  {typingUsers.length === 1
                    ? `${typingUsers[0].displayName} está digitando...`
                    : 'Várias pessoas digitando...'}
                </span>
              </div>
            ) : (
              <p className={`text-[11px] sm:text-xs truncate ${
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
        <div className="flex items-center gap-0.5 sm:gap-1 text-slate-400 flex-shrink-0">
          <button
            onClick={() => alert('Chamada de Voz em desenvolvimento para próxima release!')}
            className="hidden sm:flex p-2 rounded-xl hover:text-slate-200 hover:bg-background-surface transition-colors"
            title="Chamada de Voz"
          >
            <Phone className="w-4 h-4" />
          </button>

          <button
            onClick={() => alert('Chamada de Vídeo em desenvolvimento para próxima release!')}
            className="hidden sm:flex p-2 rounded-xl hover:text-slate-200 hover:bg-background-surface transition-colors"
            title="Chamada de Vídeo"
          >
            <Video className="w-4 h-4" />
          </button>

          <button
            onClick={onSearchToggle}
            className={`p-1.5 sm:p-2 rounded-xl transition-colors ${
              isSearching ? 'text-brand-400 bg-background-surface' : 'hover:text-slate-200 hover:bg-background-surface'
            }`}
            title="Pesquisar mensagens"
            aria-label="Pesquisar"
          >
            <Search className="w-4 h-4" />
          </button>

          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1.5 sm:p-2 rounded-xl hover:text-slate-200 hover:bg-background-surface transition-colors"
              title="Mais opções da conversa"
              aria-label="Mais opções"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {showMenu && (
              <>
                <div
                  className="fixed inset-0 z-20"
                  onClick={() => setShowMenu(false)}
                />
                <div className="absolute right-0 top-full mt-2 w-52 sm:w-56 max-w-[calc(100vw-1.5rem)] bg-background-surface/95 border border-slate-700/80 rounded-2xl shadow-2xl py-1.5 z-30 text-xs animate-fadeIn backdrop-blur-md">
                  <div className="px-3 py-2 border-b border-slate-800 text-slate-400 text-[11px]">
                    {isBelmont ? (
                      <div className="flex items-center gap-1.5 text-amber-300 font-semibold truncate">
                        <Lock className="w-3.5 h-3.5 flex-shrink-0" /> Sala Permanente Protegida
                      </div>
                    ) : (
                      <span className="font-semibold text-slate-300">Opções da Conversa</span>
                    )}
                  </div>

                  {/* Fixar / Desafixar Conversa */}
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      togglePinConversation?.(activeConversation.id);
                    }}
                    className="w-full px-3 py-2 text-left text-amber-300 hover:bg-amber-500/10 flex items-center gap-2 transition-colors"
                  >
                    {isConversationPinned?.(activeConversation.id) ? (
                      <>
                        <PinOff className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" /> Desafixar conversa
                      </>
                    ) : (
                      <>
                        <Pin className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" /> Fixar conversa no topo
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => {
                      alert(isBelmont ? 'Esta é a sala permanente BELMONT CONFERENCE. Todos os membros do sistema participam automaticamente deste canal.' : `ID da Conversa: ${activeConversation.id}`);
                      setShowMenu(false);
                    }}
                    className="w-full px-3 py-2 text-left text-slate-200 hover:bg-background-hover flex items-center gap-2 transition-colors"
                  >
                    <Users className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" /> Sobre esta sala
                  </button>

                  {/* Botão Limpar Tudo / Limpar Conversa */}
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      setConfirmAction('clear');
                    }}
                    className="w-full px-3 py-2 text-left text-amber-300 hover:bg-amber-500/10 flex items-center gap-2 transition-colors"
                  >
                    <Eraser className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" /> Limpar mensagens (Limpar tudo)
                  </button>

                  {/* Botão Apagar Conversa (Desabilitado se for Belmont) */}
                  {!isBelmont && (
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        setConfirmAction('delete');
                      }}
                      className="w-full px-3 py-2 text-left text-rose-400 hover:bg-rose-500/10 flex items-center gap-2 transition-colors border-t border-slate-800/60 mt-1"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" /> Apagar conversa
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Modal de Confirmação para Limpar ou Apagar */}
      {confirmAction && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-5 sm:p-6 max-w-sm w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-2xl ${
                confirmAction === 'delete' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40' : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
              }`}>
                {confirmAction === 'delete' ? <Trash2 className="w-6 h-6" /> : <Eraser className="w-6 h-6" />}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm sm:text-base font-bold text-white">
                  {confirmAction === 'delete' ? 'Apagar conversa?' : 'Limpar mensagens?'}
                </h3>
                <p className="text-xs text-slate-400">
                  {confirmAction === 'delete'
                    ? 'Esta conversa e todas as suas mensagens serão apagadas permanentemente.'
                    : 'Todas as mensagens deste chat serão limpas.'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmAction(null)}
                disabled={actionLoading}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmExecute}
                disabled={actionLoading}
                className={`flex-1 py-2.5 rounded-xl text-white text-xs font-bold transition-all shadow-lg ${
                  confirmAction === 'delete'
                    ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/30'
                    : 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/30'
                }`}
              >
                {actionLoading ? 'Processando...' : confirmAction === 'delete' ? 'Sim, apagar' : 'Sim, limpar tudo'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

