import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { useSocket } from './SocketContext';
import { apiRequest } from '../lib/api';
import { sounds } from '../lib/sound';

const ChatContext = createContext(null);

export function ChatProvider({ children }) {
  const { user } = useAuth();
  const { socket, connected } = useSocket();

  const [conversations, setConversations] = useState([]);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [typingUsers, setTypingUsers] = useState(new Map()); // userId -> userObj
  const [replyingTo, setReplyingTo] = useState(null);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const activeConversation = conversations.find(c => c.id === activeConversationId) || null;

  // Atualizar configuração de som
  const toggleSound = () => {
    setSoundEnabled(prev => {
      const next = !prev;
      sounds.enabled = next;
      return next;
    });
  };

  // Carregar conversas do usuário
  const loadConversations = useCallback(async () => {
    if (!user) return;
    try {
      setLoadingConversations(true);
      const res = await apiRequest('/conversations');
      if (res.success && res.conversations) {
        setConversations(res.conversations);
        if (!activeConversationId && res.conversations.length > 0) {
          setActiveConversationId(res.conversations[0].id);
        }
      }
    } catch (err) {
      console.error('Erro ao carregar conversas:', err);
    } finally {
      setLoadingConversations(false);
    }
  }, [user, activeConversationId]);

  useEffect(() => {
    loadConversations();
  }, [user?.id]);

  // Carregar mensagens quando a conversa ativa mudar
  useEffect(() => {
    if (!activeConversationId) {
      setMessages([]);
      return;
    }

    async function loadMessages() {
      try {
        setLoadingMessages(true);
        const res = await apiRequest(`/conversations/${activeConversationId}/messages`);
        if (res.success && res.messages) {
          setMessages(res.messages);
        }
      } catch (err) {
        console.error('Erro ao carregar mensagens:', err);
      } finally {
        setLoadingMessages(false);
      }
    }

    loadMessages();
    setReplyingTo(null);
    setTypingUsers(new Map());

    // Entrar na sala do WebSocket da conversa
    if (socket && connected) {
      socket.emit('join_conversation', activeConversationId);
      socket.emit('mark_as_read', { conversationId: activeConversationId });
    }

    return () => {
      if (socket && connected) {
        socket.emit('leave_conversation', activeConversationId);
      }
    };
  }, [activeConversationId, socket, connected]);

  // Escutar eventos em tempo real do Socket
  useEffect(() => {
    if (!socket) return;

    // Recebimento de Nova Mensagem
    const handleNewMessage = (msg) => {
      if (msg.conversation_id === activeConversationId) {
        setMessages(prev => {
          // Evita duplicatas se foi enviada de forma otimista
          const exists = prev.some(m => m.id === msg.id || (msg.tempId && m.tempId === msg.tempId));
          if (exists) {
            return prev.map(m => (m.id === msg.id || (msg.tempId && m.tempId === msg.tempId) ? msg : m));
          }
          return [...prev, msg];
        });

        // Som de recebimento se não for do próprio usuário
        if (msg.sender_id !== user?.id) {
          sounds.playReceive();
        }

        // Marcar como lida automaticamente se a janela estiver ativa
        socket.emit('mark_as_read', { conversationId: activeConversationId, lastMessageId: msg.id });
      } else {
        // Notificação sonora para mensagens em outras conversas
        if (msg.sender_id !== user?.id) {
          sounds.playPop();
        }
      }

      // Atualizar lista de conversas com a última mensagem
      setConversations(prev => {
        return prev.map(conv => {
          if (conv.id === msg.conversation_id) {
            return {
              ...conv,
              last_message: msg,
              updated_at: msg.created_at,
              unread_count: conv.id === activeConversationId ? 0 : (conv.unread_count || 0) + 1
            };
          }
          return conv;
        }).sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at));
      });
    };

    // Mensagem Editada
    const handleMessageEdited = ({ messageId, conversationId, content, is_edited, updated_at }) => {
      if (conversationId === activeConversationId) {
        setMessages(prev => prev.map(m => m.id === messageId ? { ...m, content, is_edited: true, updated_at } : m));
      }
    };

    // Mensagem Deletada
    const handleDeleteMessage = ({ messageId, conversationId }) => {
      if (conversationId === activeConversationId) {
        setMessages(prev => prev.map(m => m.id === messageId ? { ...m, is_deleted: true, content: 'Esta mensagem foi apagada.' } : m));
      }
    };

    // Mensagem Fixada
    const handlePinMessage = ({ messageId, conversationId, isPinned }) => {
      if (conversationId === activeConversationId) {
        setMessages(prev => prev.map(m => m.id === messageId ? { ...m, is_pinned: isPinned } : m));
      }
    };

    // Reação Atualizada
    const handleReactionUpdated = ({ messageId, conversationId, userId: reactUserId, emoji }) => {
      if (conversationId === activeConversationId) {
        setMessages(prev => prev.map(m => {
          if (m.id === messageId) {
            const currentReactions = m.reactions || [];
            const hasReacted = currentReactions.some(r => r.user_id === reactUserId && r.emoji === emoji);
            let updatedReactions;
            if (hasReacted) {
              updatedReactions = currentReactions.filter(r => !(r.user_id === reactUserId && r.emoji === emoji));
            } else {
              updatedReactions = [...currentReactions, { emoji, user_id: reactUserId }];
            }
            return { ...m, reactions: updatedReactions };
          }
          return m;
        }));
      }
    };

    // Indicador de Digitação
    const handleTypingStart = ({ conversationId, user: typingUser }) => {
      if (conversationId === activeConversationId && typingUser.id !== user?.id) {
        setTypingUsers(prev => {
          const next = new Map(prev);
          next.set(typingUser.id, typingUser);
          return next;
        });
      }
    };

    const handleTypingStop = ({ conversationId, userId: stoppedUserId }) => {
      if (conversationId === activeConversationId) {
        setTypingUsers(prev => {
          const next = new Map(prev);
          next.delete(stoppedUserId);
          return next;
        });
      }
    };

    socket.on('new_message', handleNewMessage);
    socket.on('message_edited', handleMessageEdited);
    socket.on('message_deleted', handleDeleteMessage);
    socket.on('message_pinned_updated', handlePinMessage);
    socket.on('message_reaction_updated', handleReactionUpdated);
    socket.on('user_typing_start', handleTypingStart);
    socket.on('user_typing_stop', handleTypingStop);

    return () => {
      socket.off('new_message', handleNewMessage);
      socket.off('message_edited', handleMessageEdited);
      socket.off('message_deleted', handleDeleteMessage);
      socket.off('message_pinned_updated', handlePinMessage);
      socket.off('message_reaction_updated', handleReactionUpdated);
      socket.off('user_typing_start', handleTypingStart);
      socket.off('user_typing_stop', handleTypingStop);
    };
  }, [socket, activeConversationId, user?.id]);

  // Envio de Mensagem
  const sendMessage = async ({ content, type = 'text', attachments = [], replyToId = null }) => {
    if (!activeConversationId || !user) return;

    const tempId = `temp-${Date.now()}`;
    const optimisticMessage = {
      id: tempId,
      tempId,
      conversation_id: activeConversationId,
      sender_id: user.id,
      content,
      type,
      reply_to_id: replyToId || replyingTo?.id || null,
      reply_to: replyingTo ? {
        id: replyingTo.id,
        content: replyingTo.content,
        sender: replyingTo.sender
      } : null,
      attachments,
      reactions: [],
      is_edited: false,
      is_pinned: false,
      is_deleted: false,
      created_at: new Date().toISOString(),
      sender: {
        id: user.id,
        display_name: user.display_name,
        username: user.username,
        avatar_url: user.avatar_url
      },
      status: 'sending'
    };

    // Adiciona instantaneamente na UI (Atualização Otimista)
    setMessages(prev => [...prev, optimisticMessage]);
    setReplyingTo(null);
    sounds.playSend();

    if (socket && connected) {
      socket.emit('send_message', {
        conversationId: activeConversationId,
        senderId: user.id,
        content,
        type,
        replyToId: optimisticMessage.reply_to_id,
        attachments,
        sender: optimisticMessage.sender,
        tempId
      });
    }
  };

  // Notificar Digitação
  const emitTyping = (isTyping) => {
    if (!socket || !connected || !activeConversationId || !user) return;
    if (isTyping) {
      socket.emit('typing_start', {
        conversationId: activeConversationId,
        user: {
          id: user.id,
          displayName: user.display_name,
          username: user.username,
          avatarUrl: user.avatar_url
        }
      });
    } else {
      socket.emit('typing_stop', {
        conversationId: activeConversationId,
        user: { id: user.id }
      });
    }
  };

  // Ações de Mensagem
  const editMessage = (messageId, content) => {
    if (socket && connected) {
      socket.emit('edit_message', {
        messageId,
        conversationId: activeConversationId,
        content
      });
    }
  };

  const deleteMessage = (messageId) => {
    if (socket && connected) {
      socket.emit('delete_message', {
        messageId,
        conversationId: activeConversationId
      });
    }
  };

  const pinMessage = (messageId, isPinned) => {
    if (socket && connected) {
      socket.emit('pin_message', {
        messageId,
        conversationId: activeConversationId,
        isPinned
      });
    }
  };

  const reactMessage = (messageId, emoji) => {
    if (socket && connected) {
      socket.emit('react_message', {
        messageId,
        conversationId: activeConversationId,
        emoji
      });
    }
  };

  // Iniciar conversa direta com um usuário
  const startDirectChat = async (targetUser) => {
    try {
      const res = await apiRequest('/conversations/direct', {
        method: 'POST',
        body: JSON.stringify({ targetUserId: targetUser.id })
      });

      if (res.success) {
        await loadConversations();
        setActiveConversationId(res.conversationId);
        return res.conversationId;
      }
    } catch (err) {
      console.error('Erro ao iniciar conversa:', err);
    }
  };

  // Criar novo grupo
  const createGroup = async ({ name, description, avatarUrl, memberIds }) => {
    try {
      const res = await apiRequest('/conversations/group', {
        method: 'POST',
        body: JSON.stringify({ name, description, avatarUrl, memberIds })
      });

      if (res.success && res.conversation) {
        await loadConversations();
        setActiveConversationId(res.conversation.id);
        return res.conversation;
      }
    } catch (err) {
      console.error('Erro ao criar grupo:', err);
    }
  };

  return (
    <ChatContext.Provider
      value={{
        conversations,
        activeConversation,
        activeConversationId,
        setActiveConversationId,
        messages,
        loadingConversations,
        loadingMessages,
        typingUsers: Array.from(typingUsers.values()),
        replyingTo,
        setReplyingTo,
        soundEnabled,
        toggleSound,
        sendMessage,
        emitTyping,
        editMessage,
        deleteMessage,
        pinMessage,
        reactMessage,
        startDirectChat,
        createGroup,
        refreshConversations: loadConversations
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat deve ser usado dentro de um ChatProvider');
  }
  return context;
}
