import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { useSocket } from './SocketContext';
import { apiRequest } from '../lib/api';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { sounds } from '../lib/sound';

const ChatContext = createContext(null);
const BELMONT_ID = '00000000-0000-0000-0000-000000000001';

export function ChatProvider({ children }) {
  const { user } = useAuth();
  const { socket, connected } = useSocket();

  const [conversations, setConversations] = useState([]);
  const [activeConversationId, setActiveConversationId] = useState(BELMONT_ID);
  const [messages, setMessages] = useState([]);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [typingUsers, setTypingUsers] = useState(new Map()); // userId -> userObj
  const [replyingTo, setReplyingTo] = useState(null);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const activeConversation = conversations.find(c => c.id === activeConversationId) || {
    id: BELMONT_ID,
    name: 'BELMONT CONFERENCE',
    type: 'group',
    is_permanent: true,
    avatar_url: '/belmont-logo.jpg'
  };

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

  // --- SUPABASE REALTIME (Canal de Mensagens em Tempo Real Nativo da Nuvem) ---
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase || !activeConversationId) return;

    const channel = supabase
      .channel(`chat:room:${activeConversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${activeConversationId}`
        },
        async (payload) => {
          const newMsg = payload.new;
          if (newMsg.sender_id !== user?.id) {
            const { data: sender } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', newMsg.sender_id)
              .single();

            const formatted = {
              ...newMsg,
              sender: sender || { id: newMsg.sender_id, display_name: 'Usuário' },
              attachments: [],
              reactions: []
            };

            setMessages(prev => {
              if (prev.some(m => m.id === formatted.id || (m.tempId && m.tempId === formatted.id))) return prev;
              return [...prev, formatted];
            });
            sounds.playReceive();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeConversationId, user?.id]);

  // Escutar eventos em tempo real do Socket (quando conectado)
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (msg) => {
      if (msg.conversation_id === activeConversationId) {
        setMessages(prev => {
          const exists = prev.some(m => m.id === msg.id || (msg.tempId && m.tempId === msg.tempId));
          if (exists) {
            return prev.map(m => (m.id === msg.id || (msg.tempId && m.tempId === msg.tempId) ? msg : m));
          }
          return [...prev, msg];
        });

        if (msg.sender_id !== user?.id) {
          sounds.playReceive();
        }

        socket.emit('mark_as_read', { conversationId: activeConversationId, lastMessageId: msg.id });
      } else {
        if (msg.sender_id !== user?.id) {
          sounds.playPop();
        }
      }

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

    socket.on('new_message', handleNewMessage);
    return () => {
      socket.off('new_message', handleNewMessage);
    };
  }, [socket, activeConversationId, user?.id]);

  // Enviar Mensagem (com suporte a Supabase direto + Socket.IO)
  const sendMessage = async ({ content, attachments = [], type = 'text', replyToId = null }) => {
    if (!user || (!content.trim() && attachments.length === 0)) return;

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
        avatar_url: user.avatar_url,
        equipped_frame: user.equipped_frame,
        equipped_bubble: user.equipped_bubble,
        equipped_badge: user.equipped_badge,
        equipped_name_color: user.equipped_name_color
      },
      status: 'sending'
    };

    setMessages(prev => [...prev, optimisticMessage]);
    setReplyingTo(null);
    sounds.playSend();

    // 1. Envio via Supabase Direto
    if (isSupabaseConfigured && supabase) {
      try {
        const { data: insertedMsg, error: insertErr } = await supabase.from('messages').insert({
          conversation_id: activeConversationId,
          sender_id: user.id,
          content: content || '',
          type,
          reply_to_id: optimisticMessage.reply_to_id
        }).select().single();

        if (insertedMsg && !insertErr) {
          setMessages(prev => prev.map(m => m.tempId === tempId ? { ...optimisticMessage, id: insertedMsg.id, status: 'sent' } : m));

          // Atualizar Nexus Coins (+5 moedas por envio)
          const newBalance = (user.nexus_coins || 100) + 5;
          await supabase.from('profiles').update({ nexus_coins: newBalance }).eq('id', user.id);
        }
      } catch (err) {
        console.error('Erro ao persistir mensagem no Supabase:', err);
      }
    }

    // 2. Envio via WebSocket (se conectado)
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

  const editMessage = (messageId, content) => {
    if (socket && connected) {
      socket.emit('edit_message', { messageId, conversationId: activeConversationId, content });
    }
  };

  const deleteMessage = (messageId) => {
    if (socket && connected) {
      socket.emit('delete_message', { messageId, conversationId: activeConversationId });
    }
  };

  const pinMessage = (messageId, isPinned) => {
    if (socket && connected) {
      socket.emit('pin_message', { messageId, conversationId: activeConversationId, isPinned });
    }
  };

  const reactToMessage = async (messageId, emoji) => {
    if (!user) return;
    setMessages(prev => prev.map(m => {
      if (m.id === messageId) {
        const reactions = m.reactions || [];
        const exists = reactions.some(r => r.user_id === user.id && r.emoji === emoji);
        const updated = exists
          ? reactions.filter(r => !(r.user_id === user.id && r.emoji === emoji))
          : [...reactions, { id: `temp-${Date.now()}`, message_id: messageId, user_id: user.id, emoji }];
        return { ...m, reactions: updated };
      }
      return m;
    }));

    if (socket && connected) {
      socket.emit('react_message', { messageId, conversationId: activeConversationId, userId: user.id, emoji });
    }
  };

  return (
    <ChatContext.Provider
      value={{
        conversations,
        activeConversationId,
        activeConversation,
        messages,
        loadingConversations,
        loadingMessages,
        typingUsers,
        replyingTo,
        soundEnabled,
        setActiveConversationId,
        loadConversations,
        sendMessage,
        emitTyping,
        editMessage,
        deleteMessage,
        pinMessage,
        reactToMessage,
        setReplyingTo,
        toggleSound
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
