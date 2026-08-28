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
import { ChevronDown, MessageSquare, ShieldCheck, Sparkles, Search, X } from 'lucide-react';

export function ChatArea({ onBack, onOpenProfile }) {
  const { user } = useAuth();
  const {
    activeConversation,
    activeConversationId,
    messages,
    loadingMessages,
    sendMessage,
    editMessage,
    deleteMessage,
    pinMessage,
    reactToMessage,
    setReplyingTo,
    setEditingMessage,
    masterIdentities,
    clearMasterIdentityForConv
  } = useChat();

  const activeMasterUser = masterIdentities?.get(activeConversationId);

  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [showScrollBottom, setShowScrollBottom] = useState(false);

  const messagesEndRef = useRef(null);
  const scrollContainerRef = useRef(null);

  // Auto-scroll para o final quando novas mensagens chegam
  const scrollToBottom = (smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
  };

  useEffect(() => {
    scrollToBottom(false);
  }, [activeConversation?.id]);

  useEffect(() => {
    if (!showScrollBottom) {
      scrollToBottom(true);
    }
  }, [messages.length]);

  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const isUp = scrollHeight - scrollTop - clientHeight > 150;
    setShowScrollBottom(isUp);
  };

  if (!activeConversation) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-background-darker/60 backdrop-blur">
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

  // Filtrar mensagens para a busca
  const displayMessages = searchQuery.trim()
    ? messages.filter((m) => m.content?.toLowerCase().includes(searchQuery.toLowerCase()))
    : messages;

  const pinnedMessages = messages.filter((m) => m.is_pinned);

  // Função para formatar o divisor de data
  const formatDateSeparator = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isToday(date)) return 'Hoje';
    if (isYesterday(date)) return 'Ontem';
    return format(date, "d 'de' MMMM", { locale: ptBR });
  };

  const wallpaperClass = WALLPAPER_STYLES[user?.equipped_wallpaper] || 'bg-background-darker';

  return (
    <div className={`flex-1 flex flex-col h-full min-h-0 min-w-0 w-full max-w-full overflow-hidden relative transition-colors duration-500 ${wallpaperClass}`}>
      {/* Header */}
      <ChatHeader
        onBack={onBack}
        onSearchToggle={() => {
          setIsSearching(!isSearching);
          setSearchQuery('');
        }}
        isSearching={isSearching}
        onOpenProfile={onOpenProfile}
      />

      {/* Banner de Super DM Ativa (Modo Master Secreto) */}
      {activeMasterUser && (
        <div className="px-3 sm:px-4 py-2 bg-gradient-to-r from-rose-950/90 via-slate-900 to-purple-950/80 border-b border-rose-500/40 flex items-center justify-between z-20 select-none animate-fadeIn flex-shrink-0 min-w-0 w-full max-w-full">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span className="text-base sm:text-lg flex-shrink-0">🎭</span>
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
            className="px-2 py-1 rounded-xl bg-rose-600/30 hover:bg-rose-600/50 text-rose-200 border border-rose-500/40 text-[10px] sm:text-[11px] font-bold transition-all flex-shrink-0 ml-2"
          >
            Sair
          </button>
        </div>
      )}

      {/* Barra de Pesquisa de Mensagens Interna */}
      {isSearching && (
        <div className="px-3 sm:px-4 py-2 bg-background-surface/90 border-b border-slate-800 flex items-center gap-2 animate-fadeIn flex-shrink-0 min-w-0 w-full max-w-full">
          <Search className="w-4 h-4 text-slate-400 flex-shrink-0" />
          <input
            type="text"
            autoFocus
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Pesquisar nesta conversa..."
            className="flex-1 min-w-0 bg-transparent text-xs text-slate-200 placeholder-slate-500 focus:outline-none"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="text-slate-400 hover:text-white flex-shrink-0 p-1">
              <X className="w-3.5 h-3.5" />
            </button>
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
        className="flex-1 min-h-0 min-w-0 w-full max-w-full overflow-y-auto overscroll-contain px-2.5 sm:px-4 py-3 sm:py-4 space-y-1 relative"
      >
        {loadingMessages ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 text-xs gap-3 select-none">
            <div className="relative">
              <img
                src="/logov2.gif"
                alt="Carregando"
                className="w-14 h-14 object-contain drop-shadow-[0_0_15px_rgba(99,102,241,0.6)]"
              />
            </div>
            <span className="font-semibold text-slate-300">Carregando mensagens...</span>
          </div>
        ) : displayMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-12 text-slate-400">
            <Sparkles className="w-8 h-8 text-brand-400/50 mb-2" />
            <p className="text-sm font-semibold text-slate-300">Início da conversa</p>
            <p className="text-xs text-slate-500 mt-0.5">Envie a primeira mensagem para começar a conversar!</p>
          </div>
        ) : (
          displayMessages.map((msg, index) => {
            const isOwn = msg.sender_id === user?.id;
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

                <div id={`msg-${msg.id}`}>
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
