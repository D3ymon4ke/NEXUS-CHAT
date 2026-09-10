import React, { useState, useEffect, useRef } from 'react';
import { useChat } from '../../context/ChatContext';
import { useAuth } from '../../context/AuthContext';
import { ChatHeader } from './ChatHeader';
import { MessageBubble } from './MessageBubble';
import { MessageInput } from './MessageInput';
import { PinnedBanner } from './PinnedBanner';
import { ImageViewerModal } from './ImageViewerModal';
import { WALLPAPER_STYLES } from '../../lib/shopCatalog';
import { format, isToday, isYesterday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronDown, ChevronUp, MessageSquare, ShieldCheck, Sparkles, Search, X, WifiOff } from 'lucide-react';

export function ChatArea({ onBack, onOpenProfile }) {
  const { user } = useAuth();
  const {
    activeConversation,
    activeConversationId,
    messages,
    loadingMessages,
    typingUsers = [],
    sendMessage,
    editMessage,
    deleteMessage,
    pinMessage,
    reactToMessage,
    setReplyingTo,
    setEditingMessage,
    masterIdentities,
    clearMasterIdentityForConv,
    isOffline,
    pendingOutboxCount
  } = useChat();

  const isAdmin = Boolean(user?.role === 'admin' || user?.is_admin || user?.username?.toLowerCase() === 'damon');
  const activeMasterUser = isAdmin ? masterIdentities?.get(activeConversationId) : null;

  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const [highlightMessageId, setHighlightMessageId] = useState(null);
  const [filterOnlyMatches, setFilterOnlyMatches] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [showScrollBottom, setShowScrollBottom] = useState(false);

  const messagesEndRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const isInitialLoadForConvRef = useRef(true);

  // Auto-scroll otimizado para o final (instantâneo ao trocar de chat, suave para novas mensagens)
  const scrollToBottom = (smooth = true) => {
    const el = scrollContainerRef.current;
    if (el) {
      el.scrollLeft = 0;
      if (!smooth) {
        el.scrollTop = el.scrollHeight;
        return;
      }
    }
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
  };

  useEffect(() => {
    isInitialLoadForConvRef.current = true;
    scrollToBottom(false);
  }, [activeConversation?.id]);

  useEffect(() => {
    if (isInitialLoadForConvRef.current) {
      isInitialLoadForConvRef.current = false;
      scrollToBottom(false);
      return;
    }
    if (!showScrollBottom) {
      scrollToBottom(true);
    }
  }, [messages.length]);

  // Travar rigorosamente qualquer deslocamento horizontal indesejado
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const lockX = () => {
      if (el.scrollLeft !== 0) {
        el.scrollLeft = 0;
      }
    };
    el.scrollLeft = 0;
    el.addEventListener('scroll', lockX, { passive: true });
    return () => el.removeEventListener('scroll', lockX);
  }, [activeConversation?.id]);

  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    if (scrollContainerRef.current.scrollLeft !== 0) {
      scrollContainerRef.current.scrollLeft = 0;
    }
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const isUp = scrollHeight - scrollTop - clientHeight > 150;
    setShowScrollBottom(isUp);
  };

  if (!activeConversation) {
    if (activeConversationId) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center p-8 bg-background-darker/60 select-none">
          <div className="w-8 h-8 rounded-full border-2 border-brand-500/30 border-t-brand-400 animate-spin mb-3" />
          <span className="text-xs text-slate-400 font-medium">Carregando conversa...</span>
        </div>
      );
    }
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-background-darker/60 backdrop-blur select-none">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-brand-600/30 to-purple-600/30 border border-brand-500/20 flex items-center justify-center mb-4 shadow-xl">
          <MessageSquare className="w-10 h-10 text-brand-400" />
        </div>
        <h3 className="text-xl font-bold text-white mb-2">Nenhuma conversa selecionada</h3>
        <p className="text-sm text-slate-400 max-w-sm">
          Escolha uma conversa na barra lateral ou inicie um novo chat para começar a trocar mensagens em tempo real.
        </p>
      </div>
    );
  }

  // Cálculo de correspondências da busca dentro da conversa
  const matchingMessages = React.useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase().trim();
    return messages.filter((m) => {
      if (m.is_deleted) return false;
      const contentMatch = m.content && m.content.toLowerCase().includes(q);
      const attMatch = m.attachments && m.attachments.some((a) => (a.file_name || a.name || '').toLowerCase().includes(q));
      return contentMatch || attMatch;
    });
  }, [messages, searchQuery]);

  // Navegar entre os resultados da busca
  const jumpToMatch = (index) => {
    if (matchingMessages.length === 0) return;
    const boundedIndex = (index + matchingMessages.length) % matchingMessages.length;
    setCurrentMatchIndex(boundedIndex);
    const targetMsg = matchingMessages[boundedIndex];
    if (targetMsg) {
      const targetId = targetMsg.id || targetMsg.tempId;
      setHighlightMessageId(targetId);
      const el = document.getElementById(`msg-${targetId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  };

  // Quando o termo de busca muda, foca na ocorrência mais recente
  useEffect(() => {
    if (matchingMessages.length > 0) {
      jumpToMatch(matchingMessages.length - 1);
    } else {
      setHighlightMessageId(null);
    }
  }, [searchQuery, matchingMessages.length]);

  // Atalhos de teclado
  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (e.shiftKey) {
        jumpToMatch(currentMatchIndex - 1);
      } else {
        jumpToMatch(currentMatchIndex + 1);
      }
    } else if (e.key === 'Escape') {
      setIsSearching(false);
      setSearchQuery('');
      setHighlightMessageId(null);
    }
  };

  // Filtrar mensagens para a busca (caso o usuário queira ver só os matches)
  const displayMessages = filterOnlyMatches && searchQuery.trim()
    ? matchingMessages
    : messages;

  const pinnedMessages = messages.filter((m) => m.is_pinned);

  // Função para formatar o divisor de data
  const formatDateSeparator = (dateString) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '';
      if (isToday(date)) return 'Hoje';
      if (isYesterday(date)) return 'Ontem';
      return format(date, "d 'de' MMMM", { locale: ptBR });
    } catch (e) {
      return '';
    }
  };

  const wallpaperClass = WALLPAPER_STYLES[user?.equipped_wallpaper] || 'bg-background-darker';

  return (
    <div className={`flex-1 flex flex-col h-full min-h-0 min-w-0 w-full max-w-full overflow-hidden relative ${wallpaperClass}`}>
      {/* Header */}
      <ChatHeader
        onBack={onBack}
        onSearchToggle={() => {
          setIsSearching(!isSearching);
          setSearchQuery('');
          setHighlightMessageId(null);
        }}
        isSearching={isSearching}
        onOpenProfile={onOpenProfile}
      />

      {/* Banner de Modo Offline Inteligente */}
      {isOffline && (
        <div className="px-3 sm:px-4 py-1.5 bg-amber-500/15 border-b border-amber-500/30 flex items-center justify-between text-amber-300 text-xs z-20 animate-fadeIn flex-shrink-0">
          <div className="flex items-center gap-2">
            <WifiOff className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
            <span className="font-semibold text-[11px] sm:text-xs">
              Modo Offline • Histórico e busca disponíveis via IndexedDB
            </span>
          </div>
          {pendingOutboxCount > 0 && (
            <span className="text-[10px] bg-amber-500/25 px-2 py-0.5 rounded-full border border-amber-500/40 font-bold flex items-center gap-1">
              <span>{pendingOutboxCount} {pendingOutboxCount === 1 ? 'pendente' : 'pendentes'}</span>
              <span>⏳</span>
            </span>
          )}
        </div>
      )}

      {/* Banner de Super DM Ativa (Modo Master Secreto) */}
      {activeMasterUser && (
        <div className="px-3 sm:px-4 py-2 bg-gradient-to-r from-rose-950/90 via-slate-900 to-purple-950/80 border-b border-rose-500/40 flex items-center justify-between z-20 select-none animate-fadeIn flex-shrink-0 min-w-0 w-full max-w-full shadow-lg">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="relative flex-shrink-0">
              <img
                src={activeMasterUser.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${activeMasterUser.id}`}
                alt="Avatar"
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover border border-rose-400 shadow"
              />
              <span className="absolute -bottom-0.5 -right-0.5 text-[10px]">🎭</span>
            </div>
            <div className="text-xs min-w-0 flex-1">
              <span className="text-rose-300 font-extrabold uppercase text-[9px] sm:text-[10px] tracking-wide block truncate">
                Super DM Ativa • Modo Master
              </span>
              <span className="text-slate-200 text-[11px] sm:text-xs truncate block">
                Respondendo como: <strong className="text-amber-300 font-bold">{activeMasterUser.display_name || activeMasterUser.username}</strong>
              </span>
            </div>
          </div>
          <button
            onClick={() => clearMasterIdentityForConv(activeConversationId)}
            className="px-2.5 py-1 rounded-xl bg-rose-600/30 hover:bg-rose-600/50 text-rose-200 border border-rose-500/40 text-[10px] sm:text-[11px] font-bold transition-all flex-shrink-0 ml-2"
          >
            Sair
          </button>
        </div>
      )}

      {/* Barra de Pesquisa de Mensagens Interna com Navegador */}
      {isSearching && (
        <div className="px-3 sm:px-4 py-2 bg-background-surface/95 border-b border-slate-800/80 flex items-center justify-between gap-2 animate-fadeIn flex-shrink-0 min-w-0 w-full max-w-full backdrop-blur z-20 shadow-md">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Search className="w-4 h-4 text-brand-400 flex-shrink-0" />
            <input
              type="text"
              autoFocus
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder="Pesquisar mensagens (Enter para avançar)..."
              className="flex-1 min-w-0 bg-transparent text-xs text-slate-100 placeholder-slate-400 focus:outline-none"
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setHighlightMessageId(null);
                }}
                className="text-slate-400 hover:text-white flex-shrink-0 p-1 rounded-md"
                title="Limpar busca"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {searchQuery && (
            <div className="flex items-center gap-1.5 flex-shrink-0 border-l border-slate-700/60 pl-2">
              <span className="text-[11px] font-medium text-slate-300 select-none">
                {matchingMessages.length > 0
                  ? `${currentMatchIndex + 1} de ${matchingMessages.length}`
                  : 'Nenhum resultado'}
              </span>

              <button
                disabled={matchingMessages.length === 0}
                onClick={() => jumpToMatch(currentMatchIndex - 1)}
                className="p-1 rounded text-slate-300 hover:text-white hover:bg-slate-700/60 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                title="Resultado anterior (Shift+Enter)"
              >
                <ChevronUp className="w-4 h-4" />
              </button>

              <button
                disabled={matchingMessages.length === 0}
                onClick={() => jumpToMatch(currentMatchIndex + 1)}
                className="p-1 rounded text-slate-300 hover:text-white hover:bg-slate-700/60 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                title="Próximo resultado (Enter)"
              >
                <ChevronDown className="w-4 h-4" />
              </button>

              <button
                onClick={() => {
                  setIsSearching(false);
                  setSearchQuery('');
                  setHighlightMessageId(null);
                }}
                className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-slate-700/40 transition-colors ml-1"
                title="Fechar pesquisa (Esc)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Banner de Mensagens Fixadas */}
      <PinnedBanner
        pinnedMessages={pinnedMessages}
        onUnpin={(msgId) => pinMessage(msgId, false)}
        onJumpToMessage={(msgId) => {
          const el = document.getElementById(`msg-${msgId}`);
          el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }}
      />

      {/* Área de Mensagens com Scroll */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        style={{ overflowX: 'hidden', touchAction: 'pan-y' }}
        className="flex-1 min-h-0 min-w-0 w-full max-w-full overflow-y-auto overflow-x-hidden touch-pan-y overscroll-x-none overscroll-contain px-2.5 sm:px-4 py-3 sm:py-4 space-y-1 relative"
      >
        {loadingMessages && displayMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 text-xs gap-3 select-none">
            <div className="relative">
              <div className="w-9 h-9 rounded-full border-2 border-brand-500/30 border-t-brand-400 animate-spin" />
            </div>
            <span className="font-semibold text-slate-400 text-[11px]">Sincronizando histórico...</span>
          </div>
        ) : displayMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-12 text-slate-400">
            <Sparkles className="w-8 h-8 text-brand-400/50 mb-2" />
            <p className="text-sm font-semibold text-slate-300">Início da conversa</p>
            <p className="text-xs text-slate-500 mt-0.5">Envie a primeira mensagem para começar a conversar!</p>
          </div>
        ) : (
          displayMessages.map((msg, index) => {
            const isOwn = msg.sender_id === user?.id || Boolean(activeMasterUser && msg.sender_id === activeMasterUser.id);
            const prevMsg = displayMessages[index - 1];

            // Verifica se mudou o dia para inserir o divisor de data
            const showDateSeparator =
              !prevMsg ||
              new Date(prevMsg.created_at).toDateString() !== new Date(msg.created_at).toDateString();

            return (
              <React.Fragment key={msg.id || msg.tempId || index}>
                {showDateSeparator && (
                  <div className="flex items-center justify-center my-4">
                    <span className="px-3 py-1 rounded-full text-[11px] font-medium bg-background-surface/80 text-slate-400 border border-slate-800 shadow-sm">
                      {formatDateSeparator(msg.created_at)}
                    </span>
                  </div>
                )}

                <div
                  id={`msg-${msg.id || msg.tempId}`}
                  className={`w-full max-w-full min-w-0 rounded-2xl ${
                    highlightMessageId === (msg.id || msg.tempId)
                      ? 'ring-2 ring-brand-400 bg-brand-500/20 py-1.5 px-2 shadow-[0_0_20px_rgba(59,130,246,0.35)] transition-all duration-300'
                      : ''
                  }`}
                >
                  <MessageBubble
                    message={msg}
                    isOwn={isOwn}
                    showSenderInfo={activeConversation?.type === 'group' || activeConversation?.id === '00000000-0000-0000-0000-000000000001' || (activeConversation?.participants?.length || 0) >= 3}
                    onReply={(m) => setReplyingTo(m)}
                    onEdit={(m) => setEditingMessage(m)}
                    onDelete={(id) => deleteMessage(id)}
                    onPin={(id, isPinned) => pinMessage(id, isPinned)}
                    onReact={(id, emoji) => reactToMessage(id, emoji)}
                    onImageClick={(url) => setSelectedImage(url)}
                    onOpenProfile={(u) => onOpenProfile && onOpenProfile(u)}
                  />
                </div>
              </React.Fragment>
            );
          })
        )}

        {Array.isArray(typingUsers) && typingUsers.length > 0 && (
          <div className="flex items-center gap-2 py-1.5 px-3 rounded-2xl bg-slate-800/80 border border-slate-700/60 w-fit text-xs text-slate-300 shadow-md backdrop-blur animate-fadeIn my-1">
            {typingUsers[0]?.action === 'uploading_photo' ? (
              <span className="text-sm animate-bounceShort">📸</span>
            ) : typingUsers[0]?.action === 'uploading_file' ? (
              <span className="text-sm animate-bounceShort">📎</span>
            ) : (
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-bounce [animation-delay:-0.3s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-bounce [animation-delay:-0.15s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-bounce" />
              </div>
            )}
            <span className="text-[11px] font-medium text-slate-300">
              {typingUsers[0]?.action === 'uploading_photo'
                ? `${typingUsers[0]?.displayName || typingUsers[0]?.username || 'Alguém'} está enviando uma foto...`
                : typingUsers[0]?.action === 'uploading_file'
                ? `${typingUsers[0]?.displayName || typingUsers[0]?.username || 'Alguém'} está enviando um arquivo...`
                : typingUsers.length === 1
                ? `${typingUsers[0]?.displayName || typingUsers[0]?.username || 'Alguém'} está digitando...`
                : `${typingUsers.map((u) => u?.displayName || u?.username || 'Alguém').join(', ')} estão digitando...`}
            </span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Botão Flutuante de Scroll para o Final */}
      {showScrollBottom && (
        <button
          onClick={() => scrollToBottom(true)}
          className="absolute bottom-20 right-6 p-2 rounded-full bg-brand-600 hover:bg-brand-500 text-white shadow-xl border border-white/10 transition-all hover:scale-110 z-20"
          title="Rolar para o final"
        >
          <ChevronDown className="w-5 h-5" />
        </button>
      )}

      {/* Input de Mensagem */}
      <MessageInput />

      {/* Lightbox / Visualizador de Imagens */}
      <ImageViewerModal
        imageUrl={selectedImage}
        onClose={() => setSelectedImage(null)}
      />
    </div>
  );
}
