import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useChat } from '../../context/ChatContext';
import { supabase, isSupabaseConfigured } from '../../lib/supabaseClient';
import { sounds } from '../../lib/sound';
import confetti from 'canvas-confetti';
import { ANIMATED_STICKERS, STICKER_PRICE } from '../../lib/animatedStickers';
import { CreatePollModal } from '../polls/CreatePollModal';
import {
  Send,
  Paperclip,
  Smile,
  X,
  Image as ImageIcon,
  FileText,
  Reply,
  Loader2,
  Edit2,
  Check,
  Sparkles,
  Flame,
  Coins,
  BarChart3,
  Coffee,
  Ghost,
  Lock,
  Clock
} from 'lucide-react';

const EMOJI_CATEGORIES = [
  { name: 'Populares', emojis: ['😀', '😂', '😍', '🔥', '🚀', '👍', '🎉', '❤️', '👏', '✨', '😎', '💯'] },
  { name: 'Expressões', emojis: ['😇', '🥳', '🤔', '🙌', '🤝', '💪', '👀', '💡', '⚡', '🌟', '🎯', '🏆'] },
  { name: 'Símbolos', emojis: ['✅', '❌', '⚠️', '💎', '📌', '🔔', '💬', '📢', '💻', '📱', '🔒', '🔑'] }
];

export function MessageInput() {
  const { user, updateProfile } = useAuth();
  const {
    activeConversation,
    sendMessage,
    editMessage,
    emitTyping,
    replyingTo,
    setReplyingTo,
    editingMessage,
    setEditingMessage,
    showPollModal,
    setShowPollModal
  } = useChat();
  const [content, setContent] = useState('');
  const [attachments, setAttachments] = useState([]); // Array<{ file_name, file_url, file_type, file_size }>
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [activeEmojiTab, setActiveEmojiTab] = useState('emojis'); // 'emojis' | 'stickers'
  const [uploading, setUploading] = useState(false);

  // Estados do Modo Fantasma (Ghost Mode) 👻
  const [ghostMode, setGhostMode] = useState(null); // null | 'view_once' | '10s' | '1m' | '1h' | '24h'
  const [showGhostMenu, setShowGhostMenu] = useState(false);

  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);
  const typingTimerRef = useRef(null);

  // Verificações de permissão e contexto do chat
  const BELMONT_ID = '00000000-0000-0000-0000-000000000001';
  const isBelmont = activeConversation?.id === BELMONT_ID || activeConversation?.name === 'BELMONT CONFERENCE' || activeConversation?.is_permanent;
  const isGroup = activeConversation?.type === 'group' || isBelmont;
  const isDirectChat = Boolean(activeConversation && !isGroup);
  const isAdminUser = Boolean(user?.is_admin || user?.role === 'admin' || user?.username === 'damon');
  const isGroupAdmin = Boolean(isGroup && (isAdminUser || activeConversation?.created_by === user?.id));

  // Resetar modo fantasma se trocar para um grupo
  useEffect(() => {
    if (!isDirectChat) {
      setGhostMode(null);
      setShowGhostMenu(false);
    }
  }, [activeConversation?.id, isDirectChat]);

  // Preencher conteúdo ao entrar em modo de edição
  useEffect(() => {
    if (editingMessage) {
      setContent(editingMessage.content || '');
      setReplyingTo(null);
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    }
  }, [editingMessage]);

  // Ajuste automático de altura do textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [content]);

  // Suporte a colar imagens com Ctrl+V
  useEffect(() => {
    const handlePaste = (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            readAndAttachImage(file);
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  const handleInputChange = (e) => {
    setContent(e.target.value);
    emitTyping(true);

    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      emitTyping(false);
    }, 2000);
  };

  const handleSendCoffeeInvite = async () => {
    if (!user) return;
    if (!isGroup) {
      alert('O convite para café está disponível apenas em conversas de grupo.');
      return;
    }
    sounds.playPop();
    const invitePayload = JSON.stringify({
      coffee_invite: {
        senderId: user.id,
        senderName: user.display_name || user.username,
        senderAvatar: user.avatar_url,
        rewardAmount: 30,
        acceptedBy: null,
        acceptedByName: null,
        acceptedAt: null,
        createdAt: new Date().toISOString()
      }
    });
    await sendMessage({ content: invitePayload, attachments: [], type: 'coffee_invite' });
  };

  const handleSendNexusBurst = async () => {
    if (!user) return;
    try {
      sounds.playPop();

      const todayStr = new Date().toISOString().split('T')[0];
      const lastNexusDate = user.last_nexus_daily || localStorage.getItem(`nexus_daily_${user.id}`);
      const isFirstToday = lastNexusDate !== todayStr;

      let earnedCoins = 0;
      if (isFirstToday) {
        earnedCoins = 20;
        try {
          if (typeof confetti === 'function') {
            confetti({
              particleCount: 100,
              spread: 80,
              origin: { y: 0.6 },
              colors: ['#38bdf8', '#818cf8', '#fbbf24', '#a855f7', '#ec4899']
            });
          }
        } catch (confettiErr) {
          console.warn('Confetti error:', confettiErr);
        }

        const newBalance = (user.nexus_coins || 100) + 20;
        if (updateProfile) {
          await updateProfile({
            nexus_coins: newBalance,
            last_nexus_daily: todayStr
          });
        }
        localStorage.setItem(`nexus_daily_${user.id}`, todayStr);

        if (isSupabaseConfigured && supabase) {
          try {
            await supabase
              .from('profiles')
              .update({
                nexus_coins: newBalance,
                last_nexus_daily: todayStr
              })
              .eq('id', user.id);

            await supabase.from('nexus_transactions').insert({
              user_id: user.id,
              amount: 20,
              type: 'nexus_daily_command',
              description: 'Recompensa diária do comando /nexus ⚡ (+20 Coins)'
            });
          } catch (supaErr) {
            console.warn('Erro ao salvar moedas no Supabase:', supaErr);
          }
        }
      }

      const nexusPayload = JSON.stringify({
        nexus_burst: {
          senderId: user.id,
          senderName: user.display_name || user.username,
          senderUsername: user.username,
          senderAvatar: user.avatar_url,
          reward: earnedCoins,
          alreadyClaimedToday: !isFirstToday,
          createdAt: new Date().toISOString()
        }
      });

      await sendMessage({
        content: nexusPayload,
        attachments: [],
        type: 'nexus_burst'
      });
    } catch (err) {
      console.error('Erro ao enviar /nexus:', err);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const lower = content.trim().toLowerCase();

      // 0. Comando /nexus (Mandar logo animado + 20 moedas 1x ao dia)
      if (lower === '/nexus' || lower.startsWith('/nexus')) {
        setContent('');
        handleSendNexusBurst();
        return;
      }

      // 1. Enquete (/enquete) -> Apenas Administradores em Grupos
      if (lower.startsWith('/enquete')) {
        setContent('');
        if (!isGroupAdmin) {
          alert('Apenas administradores de grupo podem criar enquetes.');
          return;
        }
        setShowPollModal(true);
        return;
      }

      // 2. Café (/cafe) -> Apenas em Grupos
      if (lower.startsWith('/cafe') || lower.startsWith('/café')) {
        setContent('');
        if (!isGroup) {
          alert('O convite para café está disponível apenas em grupos.');
          return;
        }
        handleSendCoffeeInvite();
        return;
      }

      // 3. Modo Fantasma (/ghost, /fantasma, /1x, /timer) -> Apenas em Chats 1x1
      if (lower === '/ghost' || lower === '/fantasma' || lower === '/1x' || lower.startsWith('/1x') || lower.startsWith('/timer')) {
        setContent('');
        if (!isDirectChat) {
          alert('O Modo Fantasma está disponível exclusivamente em conversas privadas (1x1).');
          return;
        }
        if (lower === '/1x' || lower.startsWith('/1x')) {
          setGhostMode('view_once');
          sounds.playPop();
          return;
        }
        if (lower.startsWith('/timer')) {
          const parts = lower.split(' ');
          const t = parts[1] || '10s';
          if (['10s', '1m', '1h', '24h'].includes(t)) {
            setGhostMode(t);
          } else {
            setGhostMode('10s');
          }
          sounds.playPop();
          return;
        }
        setShowGhostMenu(true);
        return;
      }

      handleSend();
    }
  };

  const readAndAttachImage = (file) => {
    setUploading(true);
    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      const base64Url = loadEvent.target?.result;
      if (base64Url) {
        setAttachments(prev => [
          ...prev,
          {
            file_name: file.name || 'imagem.png',
            file_url: base64Url,
            file_type: 'image',
            file_size: file.size
          }
        ]);
      }
      setUploading(false);
    };
    reader.onerror = () => setUploading(false);
    reader.readAsDataURL(file);
  };

  const handleSend = async () => {
    if ((!content.trim() && attachments.length === 0) || uploading) return;

    const messageContent = content.trim();

    // Se for o comando /enquete, abre o modal de criação de enquetes
    if (messageContent.toLowerCase() === '/enquete' || messageContent.toLowerCase().startsWith('/enquete')) {
      setContent('');
      setShowPollModal(true);
      return;
    }

    const messageAttachments = [...attachments];

    setContent('');
    setAttachments([]);
    setShowEmojiPicker(false);
    setShowGhostMenu(false);
    emitTyping(false);

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    if (editingMessage) {
      await editMessage(editingMessage.id, messageContent);
      return;
    }

    // Se estiver em Modo Fantasma 👻
    if (ghostMode) {
      const ghostPayload = JSON.stringify({
        ghost_message: {
          ghostType: ghostMode,
          content: messageContent,
          attachments: messageAttachments,
          senderId: user.id,
          senderName: user.display_name || user.username,
          viewedBy: [],
          isExpired: false,
          createdAt: new Date().toISOString()
        }
      });

      await sendMessage({
        content: ghostPayload,
        type: 'ghost',
        attachments: [],
        replyToId: replyingTo?.id || null
      });

      // Se foi visualização única, reseta para normal após enviar
      if (ghostMode === 'view_once') {
        setGhostMode(null);
      }
      return;
    }

    await sendMessage({
      content: messageContent,
      type: messageAttachments.length > 0 ? (messageAttachments[0].file_type || 'image') : 'text',
      attachments: messageAttachments,
      replyToId: replyingTo?.id || null
    });
  };

  const handleSendSticker = async (sticker) => {
    const cost = sticker.price || STICKER_PRICE || 10;
    const currentCoins = user?.nexus_coins || 0;

    if (currentCoins < cost) {
      sounds.playError?.();
      alert(`Saldo insuficiente! Você precisa de ${cost} Nexus Coins para enviar a figurinha "${sticker.name}". Ganhe moedas conversando ou resgatando o bônus diário na Loja!`);
      return;
    }

    setShowEmojiPicker(false);

    // Debitar moedas do usuário
    const newCoins = currentCoins - cost;
    if (updateProfile) {
      updateProfile({ nexus_coins: newCoins });
    }

    if (isSupabaseConfigured && supabase && user) {
      try {
        await supabase.from('profiles').update({ nexus_coins: newCoins }).eq('id', user.id);
        await supabase.from('nexus_transactions').insert({
          user_id: user.id,
          amount: -cost,
          type: 'sticker_purchase',
          description: `Envio de figurinha animada: ${sticker.name}`
        });
      } catch (err) {
        console.error('Erro ao debitar moedas da figurinha:', err);
      }
    }

    sounds.playPop();

    await sendMessage({
      content: '',
      type: 'image',
      attachments: [
        {
          file_name: `${sticker.name}.webp`,
          file_url: sticker.url,
          file_type: 'image',
          file_size: 0
        }
      ],
      replyToId: replyingTo?.id || null
    });
  };

  const handleFileInputChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    files.forEach(file => {
      if (file.type.startsWith('image/')) {
        readAndAttachImage(file);
      } else {
        // Arquivo genérico
        const reader = new FileReader();
        reader.onload = (ev) => {
          setAttachments(prev => [
            ...prev,
            {
              file_name: file.name,
              file_url: ev.target?.result,
              file_type: 'file',
              file_size: file.size
            }
          ]);
        };
        reader.readAsDataURL(file);
      }
    });

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeAttachment = (index) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const addEmoji = (emoji) => {
    setContent(prev => prev + emoji);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  return (
    <div className="relative border-t border-slate-800 bg-background-surface/95 backdrop-blur-md p-2 sm:p-3 safe-bottom flex-shrink-0 z-20">
      {/* Banner de Edição de Mensagem */}
      {editingMessage && (
        <div className="mb-2 px-3 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-between text-xs animate-fadeIn">
          <div className="flex items-center gap-2 min-w-0">
            <Edit2 className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <span className="font-bold text-amber-300">Editando mensagem:</span>
            <span className="text-slate-300 truncate">{editingMessage.content}</span>
          </div>
          <button
            onClick={() => {
              setEditingMessage(null);
              setContent('');
            }}
            className="p-1 text-slate-400 hover:text-white rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Banner de Resposta (Reply Quote) */}
      {!editingMessage && replyingTo && (
        <div className="mb-2 px-3 py-1.5 rounded-xl bg-brand-500/10 border border-brand-500/30 flex items-center justify-between text-xs animate-fadeIn">
          <div className="flex items-center gap-2 min-w-0">
            <Reply className="w-3.5 h-3.5 text-brand-400 flex-shrink-0" />
            <span className="font-semibold text-brand-300">
              Respondendo a {replyingTo.sender?.display_name || 'Usuário'}:
            </span>
            <span className="text-slate-400 truncate">{replyingTo.content || 'Anexo'}</span>
          </div>
          <button
            onClick={() => setReplyingTo(null)}
            className="p-1 text-slate-400 hover:text-white rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Pré-visualização de Imagens e Anexos Selecionados */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2.5 p-2 bg-background-dark/80 rounded-2xl border border-slate-700/80 animate-fadeIn">
          {attachments.map((att, idx) => (
            <div
              key={idx}
              className="relative group p-1 rounded-xl bg-slate-900 border border-slate-700 flex items-center gap-2"
            >
              {att.file_type === 'image' ? (
                <img
                  src={att.file_url}
                  alt={att.file_name}
                  className="w-16 h-16 rounded-lg object-cover border border-brand-500/40"
                />
              ) : (
                <div className="flex items-center gap-2 px-2 py-1">
                  <FileText className="w-5 h-5 text-brand-400" />
                  <span className="text-xs text-slate-200 truncate max-w-[100px]">{att.file_name}</span>
                </div>
              )}
              <button
                type="button"
                onClick={() => removeAttachment(idx)}
                className="absolute -top-1.5 -right-1.5 p-1 rounded-full bg-rose-600 text-white hover:bg-rose-500 shadow-md transition-transform group-hover:scale-110"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
          <div className="flex items-center text-[11px] text-slate-400 pl-2">
            <span>Escreva sua mensagem abaixo e pressione Enter para enviar junto com a imagem</span>
          </div>
        </div>
      )}

      {/* Banner de Modo Fantasma Ativo */}
      {ghostMode && (
        <div className="mb-2 px-3 py-1.5 rounded-2xl bg-purple-950/90 border border-purple-500/50 flex items-center justify-between text-xs text-purple-200 shadow-xl animate-fadeIn backdrop-blur-md">
          <div className="flex items-center gap-2">
            <Ghost className="w-4 h-4 text-purple-400 animate-pulse" />
            <span className="font-extrabold text-purple-300">Modo Fantasma Ativo:</span>
            <span className="font-bold text-white bg-purple-600/40 px-2 py-0.5 rounded-lg border border-purple-500/40">
              {ghostMode === 'view_once' ? '👁️ Visualização Única (1x)' : `⏱️ Autodestruição em ${ghostMode}`}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setGhostMode(null)}
            className="p-1 rounded-lg hover:bg-purple-900/60 text-purple-300 hover:text-white transition-colors"
            title="Desativar Modo Fantasma"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Banner de Sugestão de Comandos Slash (filtrado por contexto e permissão) */}
      {content.startsWith('/') && (
        <div className="mb-2 p-1.5 rounded-2xl bg-slate-900/95 border border-brand-500/50 shadow-2xl backdrop-blur-md animate-fadeIn space-y-1">
          {/* Comando /nexus (Mandar logo animado + 20 moedas 1x ao dia) */}
          <button
            type="button"
            onClick={() => {
              setContent('');
              handleSendNexusBurst();
            }}
            className="w-full px-3 py-2 rounded-xl bg-gradient-to-r from-brand-600/25 via-indigo-600/25 to-purple-600/25 hover:from-brand-600/35 text-left flex items-center justify-between text-xs transition-colors border border-brand-500/30"
          >
            <div className="flex items-center gap-2">
              <img src="/logo.gif" alt="Nexus" className="w-5 h-5 rounded-lg object-cover border border-brand-400" />
              <div>
                <span className="font-extrabold text-amber-300">/nexus</span>
                <span className="text-slate-300 ml-2">Mandar o logo animado no chat (+20 Coins 1x ao dia) 🔥</span>
              </div>
            </div>
            <span className="text-[10px] text-amber-300 font-bold bg-amber-500/20 px-2 py-0.5 rounded-lg border border-amber-500/30">
              Mandar NEXUS ↵
            </span>
          </button>

          {/* Enquete: apenas Administradores em Grupos */}
          {isGroupAdmin && (
            <button
              type="button"
              onClick={() => {
                setContent('');
                setShowPollModal(true);
              }}
              className="w-full px-3 py-2 rounded-xl bg-brand-600/20 hover:bg-brand-600/30 text-left flex items-center justify-between text-xs transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="p-1 rounded-lg bg-brand-500 text-white font-extrabold text-xs">📊</span>
                <div>
                  <span className="font-extrabold text-brand-300">/enquete</span>
                  <span className="text-slate-300 ml-2">Criar nova enquete de grupo (Admin)</span>
                </div>
              </div>
              <span className="text-[10px] text-brand-400 font-bold bg-brand-500/20 px-2 py-0.5 rounded-lg border border-brand-500/30">
                Abrir Enquete ↵
              </span>
            </button>
          )}

          {/* Café: apenas em Grupos */}
          {isGroup && (
            <button
              type="button"
              onClick={() => {
                setContent('');
                handleSendCoffeeInvite();
              }}
              className="w-full px-3 py-2 rounded-xl bg-amber-600/20 hover:bg-amber-600/30 text-left flex items-center justify-between text-xs transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="p-1 rounded-lg bg-amber-500 text-white font-extrabold text-xs">☕</span>
                <div>
                  <span className="font-extrabold text-amber-300">/cafe</span>
                  <span className="text-slate-300 ml-2">Convidar para pausa do café no grupo (+30 Coins)</span>
                </div>
              </div>
              <span className="text-[10px] text-amber-400 font-bold bg-amber-500/20 px-2 py-0.5 rounded-lg border border-amber-500/30">
                Enviar Café ↵
              </span>
            </button>
          )}

          {/* Modo Fantasma: apenas em conversas privadas 1x1 */}
          {isDirectChat && (
            <button
              type="button"
              onClick={() => {
                setContent('');
                setShowGhostMenu(true);
              }}
              className="w-full px-3 py-2 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-left flex items-center justify-between text-xs transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="p-1 rounded-lg bg-purple-500 text-white font-extrabold text-xs">👻</span>
                <div>
                  <span className="font-extrabold text-purple-300">/fantasma ou /1x</span>
                  <span className="text-slate-300 ml-2">Mensagens privadas 1x1 com autodestruição ou visualização única</span>
                </div>
              </div>
              <span className="text-[10px] text-purple-400 font-bold bg-purple-500/20 px-2 py-0.5 rounded-lg border border-purple-500/30">
                Ativar Fantasma ↵
              </span>
            </button>
          )}
        </div>
      )}

      {/* Caixa de Texto e Controles */}
      <div className="flex items-end gap-1.5 sm:gap-2">
        {/* Anexar Arquivo ou Imagem */}
        {!editingMessage && (
          <div className="flex-shrink-0">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileInputChange}
              accept="image/*,.pdf,.doc,.docx,.txt"
              multiple
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="p-2 sm:p-2.5 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-background-hover transition-colors flex items-center justify-center"
              title="Anexar imagem ou arquivo"
            >
              {uploading ? <Loader2 className="w-5 h-5 animate-spin text-brand-400" /> : <Paperclip className="w-5 h-5" />}
            </button>
          </div>
        )}

        {/* Input Textarea */}
        <div className={`flex-1 min-w-0 relative rounded-2xl border transition-all flex items-end ${
          ghostMode
            ? 'bg-purple-950/40 border-purple-500/80 ring-1 ring-purple-500/50'
            : 'bg-background-dark border-slate-700/80 focus-within:border-brand-500'
        }`}>
          <textarea
            ref={textareaRef}
            rows={1}
            value={content}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={
              editingMessage
                ? "Edite sua mensagem..."
                : ghostMode
                ? "Mensagem fantasma..."
                : attachments.length > 0
                ? "Legenda da imagem..."
                : isDirectChat
                ? "Digite uma mensagem..."
                : isGroupAdmin
                ? "Digite uma mensagem, /cafe ou /enquete..."
                : "Digite uma mensagem ou /cafe..."
            }
            className="w-full bg-transparent px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none resize-none max-h-28 sm:max-h-32 leading-relaxed min-w-0"
          />

          {/* Botões de Ação: Fantasma (1x1), Café (Grupos), Enquete (Admin) & Emojis */}
          <div className="pb-2 pr-1.5 sm:pb-2.5 sm:pr-2 flex items-center gap-0.5 relative flex-shrink-0">
            {/* Botão Modo Fantasma 👻 (Apenas em chats 1x1) */}
            {!editingMessage && isDirectChat && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowGhostMenu(!showGhostMenu)}
                  className={`p-1 sm:p-1.5 transition-all rounded-lg relative ${
                    ghostMode
                      ? 'text-purple-400 bg-purple-500/20 ring-1 ring-purple-500 animate-pulse'
                      : 'text-slate-400 hover:text-purple-400'
                  }`}
                  title="Modo Fantasma & Mensagens Temporárias (Exclusivo 1x1) 👻"
                >
                  <Ghost className="w-4 h-4 sm:w-5 sm:h-5" />
                  {ghostMode && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-purple-400 ring-2 ring-background-dark" />
                  )}
                </button>

                {/* Popover do Modo Fantasma */}
                {showGhostMenu && (
                  <div className="absolute bottom-full right-0 mb-3 w-64 bg-slate-950/95 border border-purple-500/50 rounded-2xl shadow-2xl p-3 z-30 backdrop-blur-xl animate-fadeIn">
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-purple-900/50">
                      <div className="flex items-center gap-1.5 text-purple-300 font-extrabold text-xs">
                        <Ghost className="w-4 h-4 text-purple-400" />
                        <span>Modo Fantasma 1x1 👻</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowGhostMenu(false)}
                        className="text-slate-400 hover:text-white p-1"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="space-y-1 text-xs">
                      <button
                        type="button"
                        onClick={() => {
                          setGhostMode('view_once');
                          setShowGhostMenu(false);
                          sounds.playPop();
                        }}
                        className={`w-full p-2 rounded-xl text-left flex items-center justify-between transition-colors ${
                          ghostMode === 'view_once' ? 'bg-purple-600 text-white font-bold' : 'text-slate-200 hover:bg-purple-950/50'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Lock className="w-4 h-4 text-purple-400" />
                          <span>Visualização Única (1x)</span>
                        </div>
                        <span className="text-[10px] opacity-75">Foto Secreta</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setGhostMode('10s');
                          setShowGhostMenu(false);
                          sounds.playPop();
                        }}
                        className={`w-full p-2 rounded-xl text-left flex items-center justify-between transition-colors ${
                          ghostMode === '10s' ? 'bg-purple-600 text-white font-bold' : 'text-slate-200 hover:bg-purple-950/50'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Flame className="w-4 h-4 text-rose-400" />
                          <span>10 Segundos</span>
                        </div>
                        <span className="text-[10px] opacity-75">10s após ler</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setGhostMode('1m');
                          setShowGhostMenu(false);
                          sounds.playPop();
                        }}
                        className={`w-full p-2 rounded-xl text-left flex items-center justify-between transition-colors ${
                          ghostMode === '1m' ? 'bg-purple-600 text-white font-bold' : 'text-slate-200 hover:bg-purple-950/50'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-amber-400" />
                          <span>1 Minuto</span>
                        </div>
                        <span className="text-[10px] opacity-75">1m após ler</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setGhostMode('1h');
                          setShowGhostMenu(false);
                          sounds.playPop();
                        }}
                        className={`w-full p-2 rounded-xl text-left flex items-center justify-between transition-colors ${
                          ghostMode === '1h' ? 'bg-purple-600 text-white font-bold' : 'text-slate-200 hover:bg-purple-950/50'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-sky-400" />
                          <span>1 Hora</span>
                        </div>
                        <span className="text-[10px] opacity-75">1h de duração</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setGhostMode(null);
                          setShowGhostMenu(false);
                          sounds.playPop();
                        }}
                        className="w-full p-2 rounded-xl text-left flex items-center gap-2 text-rose-400 hover:bg-rose-500/10 transition-colors mt-1 border-t border-purple-950 pt-2"
                      >
                        <X className="w-4 h-4" />
                        <span>Desativar Modo Fantasma</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Botão Convite de Café ☕ (Apenas em Grupos) */}
            {/* Botão Convite de Café ☕ (Apenas em Grupos) */}
            {!editingMessage && isGroup && (
              <button
                type="button"
                onClick={handleSendCoffeeInvite}
                className="p-1 text-slate-400 hover:text-amber-400 transition-colors group flex-shrink-0"
                title="Convidar o Grupo para um Café ☕ (+30 Coins)"
              >
                <Coffee className="w-4 h-4 sm:w-5 sm:h-5 group-hover:rotate-12 transition-transform" />
              </button>
            )}

            {/* Botão Enquete 📊 (Apenas Administradores em Grupos) */}
            {!editingMessage && isGroupAdmin && (
              <button
                type="button"
                onClick={() => setShowPollModal(true)}
                className="p-1 text-slate-400 hover:text-brand-400 transition-colors flex-shrink-0"
                title="Criar Enquete no Grupo (/enquete)"
              >
                <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            )}

            {/* Botão Comando /nexus ⚡ */}
            {!editingMessage && (
              <button
                type="button"
                onClick={handleSendNexusBurst}
                className="w-6 h-6 sm:w-7 sm:h-7 rounded-xl bg-slate-800/90 hover:bg-slate-700/90 border border-brand-500/50 hover:border-amber-400 shadow-sm flex items-center justify-center p-0.5 transition-all hover:scale-110 active:scale-95 group flex-shrink-0"
                title="Mandar um NEXUS! (/nexus) • +20 Coins 1x ao dia ⚡"
              >
                <img
                  src="/logo.gif"
                  alt="Nexus"
                  className="w-4 h-4 sm:w-5 sm:h-5 rounded-lg object-cover"
                />
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="p-1 sm:p-1.5 text-slate-400 hover:text-yellow-400 transition-colors flex-shrink-0"
              title="Emojis e Figurinhas Animadas"
            >
              <Smile className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            {showEmojiPicker && (
              <div className="absolute bottom-full right-0 mb-3 w-[calc(100vw-2rem)] sm:w-84 max-w-xs sm:max-w-sm bg-background-surface/95 border border-slate-700 rounded-2xl shadow-2xl p-3 z-30 backdrop-blur-md animate-fadeIn">
                {/* Abas Emojis vs Figurinhas Animadas + Atalho /nexus */}
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 gap-1.5">
                  <div className="flex gap-1 bg-background-dark p-0.5 rounded-xl border border-slate-800 text-xs">
                    <button
                      type="button"
                      onClick={() => setActiveEmojiTab('emojis')}
                      className={`px-2.5 py-1 rounded-lg font-bold transition-colors ${
                        activeEmojiTab === 'emojis' ? 'bg-brand-600 text-white' : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Emojis
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveEmojiTab('stickers')}
                      className={`px-2.5 py-1 rounded-lg font-bold transition-colors flex items-center gap-1 ${
                        activeEmojiTab === 'stickers' ? 'bg-gradient-to-r from-amber-600 to-rose-600 text-white' : 'text-amber-400/80 hover:text-amber-300'
                      }`}
                    >
                      <Sparkles className="w-3 h-3" /> Figurinhas
                    </button>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setShowEmojiPicker(false);
                        handleSendNexusBurst();
                      }}
                      className="px-2 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[10px] font-black flex items-center gap-1 transition-all shadow-sm flex-shrink-0"
                      title="Mandar /nexus no chat e coletar moedas"
                    >
                      <span>⚡</span>
                      <span>/nexus (+20)</span>
                    </button>

                    <button onClick={() => setShowEmojiPicker(false)} className="text-slate-400 hover:text-white p-1">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* ABA 1: EMOJIS PADRÃO */}
                {activeEmojiTab === 'emojis' && (
                  <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                    {EMOJI_CATEGORIES.map(cat => (
                      <div key={cat.name}>
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                          {cat.name}
                        </span>
                        <div className="grid grid-cols-6 gap-1">
                          {cat.emojis.map(e => (
                            <button
                              key={e}
                              type="button"
                              onClick={() => addEmoji(e)}
                              className="text-base p-1 rounded-lg hover:bg-slate-700/60 transition-transform hover:scale-125 flex items-center justify-center"
                            >
                              {e}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* ABA 2: FIGURINHAS ANIMADAS (ANIMATED STICKERS) */}
                {activeEmojiTab === 'stickers' && (
                  <div className="space-y-2 max-h-56 overflow-y-auto p-1">
                    {/* Header de Saldo de Moedas */}
                    <div className="flex items-center justify-between px-2 py-1 rounded-xl bg-amber-500/10 border border-amber-500/30 text-[10px]">
                      <span className="text-amber-300 font-extrabold flex items-center gap-1">
                        <img src="/nexus-coin.jpg" alt="Moeda" className="w-3 h-3 rounded-full" />
                        <span>Meu Saldo: {user?.nexus_coins || 0}</span>
                      </span>
                      <span className="text-slate-400 font-semibold">Preço por envio</span>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      {ANIMATED_STICKERS.map(sticker => (
                        <button
                          key={sticker.id}
                          type="button"
                          onClick={() => handleSendSticker(sticker)}
                          title={`${sticker.name} (${sticker.price || 10} Nexus Coins)`}
                          className="p-2 rounded-xl bg-background-dark/80 hover:bg-amber-500/15 border border-slate-800 hover:border-amber-500/50 transition-all flex flex-col items-center justify-center gap-1 group hover:scale-105 relative shadow-sm"
                        >
                          <img src={sticker.url} alt={sticker.name} className="w-10 h-10 object-contain drop-shadow" />
                          <span className="text-[9px] text-slate-300 truncate max-w-full font-bold">{sticker.name}</span>

                          {/* Preço da Figurinha */}
                          <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-extrabold flex items-center gap-0.5">
                            <img src="/nexus-coin.jpg" alt="Moeda" className="w-2.5 h-2.5 rounded-full" />
                            <span>{sticker.price || 10}</span>
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Botão Enviar / Salvar Edição */}
        <button
          type="button"
          onClick={handleSend}
          disabled={(!content.trim() && attachments.length === 0) || uploading}
          className={`p-2.5 sm:p-3 rounded-2xl text-white shadow-lg transition-all flex items-center justify-center flex-shrink-0 active:scale-95 ${
            editingMessage
              ? 'bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black shadow-amber-500/20'
              : content.trim() || attachments.length > 0
              ? 'bg-brand-600 hover:bg-brand-500 shadow-brand-500/25 hover:scale-105'
              : 'bg-slate-800 text-slate-500 cursor-not-allowed'
          }`}
          title={editingMessage ? "Salvar alteração" : "Enviar mensagem"}
        >
          {editingMessage ? <Check className="w-5 h-5" /> : <Send className="w-4 h-4 sm:w-5 sm:h-5" />}
        </button>
      </div>
    </div>
  );
}
