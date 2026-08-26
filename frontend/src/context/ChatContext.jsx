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
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [typingUsers, setTypingUsers] = useState(new Map()); // userId -> userObj
  const [replyingTo, setReplyingTo] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [masterIdentities, setMasterIdentities] = useState(new Map()); // convId -> profileObject

  const setMasterIdentityForConv = (convId, profileObj) => {
    setMasterIdentities(prev => new Map(prev).set(convId, profileObj));
  };

  const clearMasterIdentityForConv = (convId) => {
    setMasterIdentities(prev => {
      const nextMap = new Map(prev);
      nextMap.delete(convId);
      return nextMap;
    });
  };

  const activeConversation = activeConversationId
    ? conversations.find(c => c.id === activeConversationId) || null
    : null;

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
    setEditingMessage(null);
    setTypingUsers(new Map());

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

  // --- SUPABASE REALTIME (INSERTs e UPDATEs de Edição/Exclusão em Tempo Real) ---
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
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${activeConversationId}`
        },
        (payload) => {
          const updated = payload.new;
          setMessages(prev => prev.map(m => m.id === updated.id ? { ...m, ...updated } : m));
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${activeConversationId}`
        },
        (payload) => {
          if (payload.old?.id) {
            setMessages(prev => prev.filter(m => m.id !== payload.old.id));
          } else {
            // Se for limpeza em massa
            setMessages([]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeConversationId, user?.id]);

  const [showPollModal, setShowPollModal] = useState(false);

  // Enviar Mensagem (Suporta tanto objeto { content, ... } quanto argumentos posicionais)
  const sendMessage = async (param1, param2 = [], param3 = 'text', param4 = null) => {
    let content = '';
    let attachments = [];
    let type = 'text';
    let replyToId = null;

    if (param1 && typeof param1 === 'object' && !Array.isArray(param1)) {
      content = param1.content || '';
      attachments = param1.attachments || [];
      type = param1.type || 'text';
      replyToId = param1.replyToId || null;
    } else {
      content = typeof param1 === 'string' ? param1 : '';
      attachments = Array.isArray(param2) ? param2 : [];
      type = typeof param3 === 'string' ? param3 : 'text';
      replyToId = param4 || null;
    }

    if (!user || (!content.trim() && attachments.length === 0)) return;

    const activeMasterUser = masterIdentities.get(activeConversationId);
    const effectiveSender = activeMasterUser || user;
    const effectiveSenderId = effectiveSender.id;

    const tempId = `temp-${Date.now()}`;
    const optimisticMessage = {
      id: tempId,
      tempId,
      conversation_id: activeConversationId,
      sender_id: effectiveSenderId,
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
        id: effectiveSender.id,
        display_name: effectiveSender.display_name || effectiveSender.username,
        username: effectiveSender.username,
        avatar_url: effectiveSender.avatar_url,
        equipped_frame: effectiveSender.equipped_frame,
        equipped_bubble: effectiveSender.equipped_bubble,
        equipped_badge: effectiveSender.equipped_badge,
        equipped_name_color: effectiveSender.equipped_name_color
      },
      status: 'sending'
    };

    setMessages(prev => [...prev, optimisticMessage]);
    setReplyingTo(null);
    sounds.playSend();

    // 1. Inserir no Supabase
    if (isSupabaseConfigured && supabase) {
      try {
        const { data: insertedMsg, error: insertErr } = await supabase.from('messages').insert({
          conversation_id: activeConversationId,
          sender_id: effectiveSenderId,
          content: content || '',
          type,
          reply_to_id: optimisticMessage.reply_to_id
        }).select().single();

        if (insertedMsg && !insertErr) {
          setMessages(prev => prev.map(m => m.tempId === tempId ? { ...optimisticMessage, id: insertedMsg.id, status: 'sent' } : m));

          // +5 moedas por envio
          const newBalance = (user.nexus_coins || 100) + 5;
          await supabase.from('profiles').update({ nexus_coins: newBalance }).eq('id', user.id);
        }
      } catch (err) {
        console.error('Erro ao persistir mensagem no Supabase:', err);
      }
    }

    // 2. Enviar via Socket.IO se conectado
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

  // Editar Mensagem
  const editMessage = async (messageId, newContent) => {
    if (!messageId || !newContent.trim()) return;

    // Atualização otimista local
    setMessages(prev => prev.map(m => m.id === messageId ? { ...m, content: newContent, is_edited: true, updated_at: new Date().toISOString() } : m));
    setEditingMessage(null);
    sounds.playPop();

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase
          .from('messages')
          .update({
            content: newContent,
            is_edited: true,
            updated_at: new Date().toISOString()
          })
          .eq('id', messageId);
      } catch (err) {
        console.error('Erro ao editar mensagem no Supabase:', err);
      }
    }

    if (socket && connected) {
      socket.emit('edit_message', {
        messageId,
        conversationId: activeConversationId,
        content: newContent
      });
    }
  };

  // Excluir Mensagem (com estado 'Esta mensagem foi excluída')
  const deleteMessage = async (messageId) => {
    if (!messageId) return;

    const placeholder = '🚫 Esta mensagem foi excluída';

    // Atualização otimista local
    setMessages(prev => prev.map(m => m.id === messageId ? { ...m, is_deleted: true, content: placeholder } : m));
    sounds.playPop();

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase
          .from('messages')
          .update({
            is_deleted: true,
            content: placeholder
          })
          .eq('id', messageId);
      } catch (err) {
        console.error('Erro ao excluir mensagem no Supabase:', err);
      }
    }

    if (socket && connected) {
      socket.emit('delete_message', {
        messageId,
        conversationId: activeConversationId
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

  const pinMessage = async (messageId, isPinned) => {
    setMessages(prev => prev.map(m => m.id === messageId ? { ...m, is_pinned: isPinned } : m));

    if (isSupabaseConfigured && supabase) {
      await supabase.from('messages').update({ is_pinned: isPinned }).eq('id', messageId);
    }

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
        editingMessage,
        soundEnabled,
        setActiveConversationId,
        loadConversations,
        sendMessage,
        editMessage,
        deleteMessage,
        pinMessage,
        reactToMessage,
        setReplyingTo,
        setEditingMessage,
        emitTyping,
        toggleSound,
        masterIdentities,
        setMasterIdentityForConv,
        clearMasterIdentityForConv,
        showPollModal,
        setShowPollModal,
        setMessages,
        clearMessages: () => setMessages([])
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
