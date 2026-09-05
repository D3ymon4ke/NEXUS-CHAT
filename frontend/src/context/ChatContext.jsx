import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { useSocket } from './SocketContext';
import { apiRequest } from '../lib/api';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { sounds } from '../lib/sound';
import { notificationService, formatNotificationPreview } from '../lib/notificationService';

const ChatContext = createContext(null);
const BELMONT_ID = '00000000-0000-0000-0000-000000000001';

const getStoredPins = (userId) => {
  try {
    const raw = localStorage.getItem(`nexus_pinned_convs_${userId || 'guest'}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {}
  return [BELMONT_ID];
};

const sortConversationsList = (convList = [], pinnedIds = []) => {
  if (!Array.isArray(convList)) return [];
  const safePinnedIds = Array.isArray(pinnedIds) ? pinnedIds : [];
  return [...convList].sort((a, b) => {
    if (!a || !b) return 0;
    const aPinned = safePinnedIds.includes(a.id) || a.is_pinned || a.id === BELMONT_ID;
    const bPinned = safePinnedIds.includes(b.id) || b.is_pinned || b.id === BELMONT_ID;

    // Se um é fixado e o outro não
    if (aPinned && !bPinned) return -1;
    if (!aPinned && bPinned) return 1;

    // Se ambos forem fixados
    if (aPinned && bPinned) {
      if (a.id === BELMONT_ID) return -1;
      if (b.id === BELMONT_ID) return 1;
      const indexA = safePinnedIds.indexOf(a.id);
      const indexB = safePinnedIds.indexOf(b.id);
      if (indexA !== -1 && indexB !== -1 && indexA !== indexB) {
        return indexA - indexB;
      }
    }

    // Ordenação padrão pela mensagem mais recente
    const timeA = a.last_message?.created_at ? new Date(a.last_message.created_at).getTime() : 0;
    const timeB = b.last_message?.created_at ? new Date(b.last_message.created_at).getTime() : 0;
    const safeTimeA = isNaN(timeA) ? 0 : timeA;
    const safeTimeB = isNaN(timeB) ? 0 : timeB;
    return safeTimeB - safeTimeA;
  });
};

export function ChatProvider({ children }) {
  const { user } = useAuth();
  const { socket, connected } = useSocket();

  const [conversations, setConversations] = useState([]);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [pinnedConversationIds, setPinnedConversationIds] = useState(() => getStoredPins(user?.id));
  const [typingUsersMap, setTypingUsersMap] = useState(new Map()); // `${convId}_${userId}` -> userObj
  const [replyingTo, setReplyingTo] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [masterIdentities, setMasterIdentities] = useState(new Map()); // convId -> profileObject

  // Sincronizar pinos locais quando o usuário mudar
  useEffect(() => {
    if (user?.id) {
      const stored = getStoredPins(user.id);
      setPinnedConversationIds(stored);
    }
  }, [user?.id]);

  // Listener para eventos de clique em notificações enviados pelo Service Worker
  useEffect(() => {
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      const handleSwMessage = (event) => {
        if (event.data && event.data.type === 'OPEN_CONVERSATION' && event.data.conversationId) {
          setActiveConversationId(event.data.conversationId);
        }
      };
      navigator.serviceWorker.addEventListener('message', handleSwMessage);
      return () => {
        navigator.serviceWorker.removeEventListener('message', handleSwMessage);
      };
    }
  }, []);

  // Limpeza periódica de usuários digitando expirados
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setTypingUsersMap((prev) => {
        let hasExpired = false;
        const next = new Map();
        prev.forEach((val, key) => {
          if (val.expiresAt > now) {
            next.set(key, val);
          } else {
            hasExpired = true;
          }
        });
        return hasExpired ? next : prev;
      });
    }, 2000);

    return () => clearInterval(interval);
  }, []);

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

  // Lista de usuários digitando na conversa ativa
  const activeTypingUsers = Array.from(typingUsersMap.values()).filter(
    (t) => t && t.conversationId === activeConversationId && (t.expiresAt || 0) > Date.now()
  );

  const toggleSound = () => {
    setSoundEnabled(prev => {
      const next = !prev;
      sounds.enabled = next;
      return next;
    });
  };

  // Fixar / Desafixar Conversa no Topo
  const togglePinConversation = useCallback((conversationId) => {
    if (!conversationId) return;
    sounds.playPop();

    setPinnedConversationIds((prev) => {
      const isCurrentlyPinned = prev.includes(conversationId);
      let next;
      if (isCurrentlyPinned) {
        next = prev.filter((id) => id !== conversationId);
      } else {
        next = [conversationId, ...prev.filter((id) => id !== conversationId)];
      }

      if (user?.id) {
        try {
          localStorage.setItem(`nexus_pinned_convs_${user.id}`, JSON.stringify(next));
        } catch (e) {}
      }

      setConversations((currentConvs) =>
        sortConversationsList(
          currentConvs.map((c) => (c.id === conversationId ? { ...c, is_pinned: !isCurrentlyPinned } : c)),
          next
        )
      );

      return next;
    });

    if (isSupabaseConfigured && supabase && user?.id) {
      try {
        const isPinnedNow = !pinnedConversationIds.includes(conversationId);
        supabase
          .from('conversation_participants')
          .update({ is_pinned: isPinnedNow })
          .eq('conversation_id', conversationId)
          .eq('user_id', user.id)
          .then(() => {})
          .catch(() => {});
      } catch (err) {}
    }
  }, [user?.id, pinnedConversationIds]);

  const isConversationPinned = useCallback((conversationId) => {
    if (!conversationId) return false;
    return conversationId === BELMONT_ID || pinnedConversationIds.includes(conversationId);
  }, [pinnedConversationIds]);

  // Carregar conversas do usuário
  const loadConversations = useCallback(async () => {
    if (!user) return;
    try {
      setLoadingConversations(true);
      const res = await apiRequest('/conversations');
      if (res.success && res.conversations) {
        const currentPins = getStoredPins(user?.id);
        const sorted = sortConversationsList(res.conversations, currentPins);
        setConversations(sorted);
        if (!activeConversationId && sorted.length > 0) {
          setActiveConversationId(sorted[0].id);
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

    // 1. Carregamento instantâneo do cache local para resposta imediata
    try {
      const cached = localStorage.getItem(`nexus_msgs_${activeConversationId}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
        }
      }
    } catch (e) {
      console.warn('Erro ao ler cache de mensagens:', e);
    }

    async function loadMessages() {
      try {
        setLoadingMessages(true);
        if (isSupabaseConfigured && supabase) {
          try {
            const { data: dbMsgs, error: dbErr } = await supabase
              .from('messages')
              .select(`
                *,
                sender:profiles(*),
                attachments:message_attachments(*),
                reactions:message_reactions(id, emoji, user_id)
              `)
              .eq('conversation_id', activeConversationId)
              .order('created_at', { ascending: true })
              .limit(200);

            if (dbMsgs && !dbErr) {
              // Reconstruir citações de respostas (reply_to) a partir de reply_to_id
              const msgMap = new Map();
              dbMsgs.forEach((m) => msgMap.set(m.id, m));

              const resolvedMsgs = dbMsgs.map((m) => {
                let resolvedReply = m.reply_to;
                if (!resolvedReply && m.reply_to_id && msgMap.has(m.reply_to_id)) {
                  const target = msgMap.get(m.reply_to_id);
                  resolvedReply = {
                    id: target.id,
                    content: target.content,
                    sender: target.sender
                  };
                }
                return {
                  ...m,
                  reply_to: resolvedReply || null
                };
              });

              // Buscar mensagens citadas antigas que não estejam no bloco atual
              const missingReplyIds = resolvedMsgs
                .filter((m) => m.reply_to_id && !m.reply_to)
                .map((m) => m.reply_to_id);

              if (missingReplyIds.length > 0) {
                try {
                  const { data: missingTargets } = await supabase
                    .from('messages')
                    .select('id, content, sender:profiles(*)')
                    .in('id', missingReplyIds);

                  if (missingTargets && missingTargets.length > 0) {
                    const missingMap = new Map(missingTargets.map((t) => [t.id, t]));
                    resolvedMsgs.forEach((m) => {
                      if (m.reply_to_id && !m.reply_to && missingMap.has(m.reply_to_id)) {
                        const target = missingMap.get(m.reply_to_id);
                        m.reply_to = {
                          id: target.id,
                          content: target.content,
                          sender: target.sender
                        };
                      }
                    });
                  }
                } catch (missErr) {
                  console.warn('Aviso ao buscar mensagens citadas:', missErr);
                }
              }

              setMessages(resolvedMsgs);
              try {
                localStorage.setItem(`nexus_msgs_${activeConversationId}`, JSON.stringify(resolvedMsgs));
              } catch (cacheErr) {}
              return;
            } else if (dbErr) {
              console.warn('Aviso Supabase ao carregar mensagens:', dbErr);
            }
          } catch (supaErr) {
            console.warn('Fallback para API de mensagens:', supaErr);
          }
        }

        const res = await apiRequest(`/conversations/${activeConversationId}/messages`);
        if (res.success && res.messages) {
          setMessages(res.messages);
          try {
            localStorage.setItem(`nexus_msgs_${activeConversationId}`, JSON.stringify(res.messages));
          } catch (cacheErr) {}
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
    setTypingUsersMap(new Map());

    // Limpar badge de não lidas para a conversa selecionada
    if (activeConversationId) {
      setConversations(prev => prev.map(c => c.id === activeConversationId ? { ...c, unread_count: 0 } : c));
      if (isSupabaseConfigured && supabase && user) {
        supabase
          .from('conversation_participants')
          .update({ unread_count: 0 })
          .eq('conversation_id', activeConversationId)
          .eq('user_id', user.id)
          .then(() => {});
      }
    }

    if (socket && connected) {
      socket.emit('join_conversation', activeConversationId);
      socket.emit('mark_as_read', { conversationId: activeConversationId });
    }

    return () => {
      if (socket && connected) {
        socket.emit('leave_conversation', activeConversationId);
      }
    };
  }, [activeConversationId, socket, connected, user?.id]);

  // --- SUPABASE REALTIME (Mensagens Globais, Broadcast & Notificações de Conversas em Tempo Real) ---
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase || !user) return;

    const channel = supabase
      .channel('chat_global_messages_listener')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages'
        },
        async (payload) => {
          const newMsg = payload.new;
          if (newMsg) {
            // Atualizar lista local de conversas com snippet e badge de não lidas
            setConversations((prev) => {
              const isCurrentActive = newMsg.conversation_id === activeConversationId;
              let found = false;
              const next = prev.map((c) => {
                if (c.id === newMsg.conversation_id) {
                  found = true;
                  return {
                    ...c,
                    last_message: {
                      id: newMsg.id,
                      content: newMsg.content,
                      type: newMsg.type,
                      sender_id: newMsg.sender_id,
                      created_at: newMsg.created_at
                    },
                    unread_count: isCurrentActive ? 0 : (c.unread_count || 0) + 1
                  };
                }
                return c;
              });

              // Se a conversa não estava na lista (ex: primeiro contato), recarrega via API
              if (!found && loadConversations) {
                loadConversations();
              }

              return sortConversationsList(next, pinnedConversationIds);
            });

            // Se for na conversa ativa e de outro usuário, adicionar à lista de mensagens visíveis
            if (newMsg.conversation_id === activeConversationId && newMsg.sender_id !== user.id) {
              const [{ data: sender }, { data: dbAtts }] = await Promise.all([
                supabase.from('profiles').select('*').eq('id', newMsg.sender_id).maybeSingle(),
                supabase.from('message_attachments').select('*').eq('message_id', newMsg.id)
              ]);

              const formatted = {
                ...newMsg,
                sender: sender || { id: newMsg.sender_id, display_name: 'Usuário' },
                attachments: dbAtts || [],
                reactions: []
              };

              setMessages((prev) => {
                if (prev.some((m) => m.id === formatted.id || (m.tempId && m.tempId === formatted.id))) return prev;
                const updated = [...prev, formatted];
                try {
                  localStorage.setItem(`nexus_msgs_${activeConversationId}`, JSON.stringify(updated));
                } catch (e) {}
                return updated;
              });
              sounds.playReceive();
            } else if (newMsg.conversation_id !== activeConversationId && newMsg.sender_id !== user.id) {
              sounds.playReceive();
            }

            // Disparar Notificação Nativa/Push se o app estiver em segundo plano ou em outra conversa
            if (newMsg.sender_id !== user.id) {
              const isHidden = typeof document !== 'undefined' && document.hidden;
              const isOtherConv = newMsg.conversation_id !== activeConversationId;
              if (isHidden || isOtherConv) {
                (async () => {
                  try {
                    const [{ data: senderData }, { data: attsData }] = await Promise.all([
                      supabase.from('profiles').select('*').eq('id', newMsg.sender_id).maybeSingle(),
                      supabase.from('message_attachments').select('*').eq('message_id', newMsg.id)
                    ]);
                    const senderName = senderData?.display_name || senderData?.username || 'Novo Membro';
                    const previewText = formatNotificationPreview(newMsg.content, newMsg.type, attsData);
                    notificationService.sendNotification({
                      title: senderName,
                      body: previewText,
                      icon: senderData?.avatar_url || '/belmont-logo.jpg',
                      conversationId: newMsg.conversation_id,
                      onClick: () => {
                        setActiveConversationId(newMsg.conversation_id);
                      }
                    });
                  } catch (notifErr) {
                    console.warn('Aviso de notificação:', notifErr);
                  }
                })();
              }
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages'
        },
        (payload) => {
          const updated = payload.new;
          if (updated && updated.conversation_id === activeConversationId) {
            setMessages((prev) => prev.map((m) => (m.id === updated.id ? { ...m, ...updated } : m)));
          }
          if (loadConversations) loadConversations();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'messages'
        },
        (payload) => {
          if (payload.old?.id) {
            setMessages((prev) => prev.filter((m) => m.id !== payload.old.id));
          } else {
            setMessages([]);
          }
          if (loadConversations) loadConversations();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'message_reactions'
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newReaction = payload.new;
            if (newReaction) {
              setMessages((prev) => {
                const updated = prev.map((m) => {
                  if (m.id === newReaction.message_id) {
                    const reactions = m.reactions || [];
                    if (!reactions.some((r) => r.id === newReaction.id || (r.user_id === newReaction.user_id && r.emoji === newReaction.emoji))) {
                      return { ...m, reactions: [...reactions, newReaction] };
                    }
                  }
                  return m;
                });
                try {
                  localStorage.setItem(`nexus_msgs_${activeConversationId}`, JSON.stringify(updated));
                } catch (e) {}
                return updated;
              });
            }
          } else if (payload.eventType === 'DELETE') {
            const oldReaction = payload.old;
            if (oldReaction) {
              setMessages((prev) => {
                const updated = prev.map((m) => {
                  const reactions = m.reactions || [];
                  if (reactions.some((r) => r.id === oldReaction.id)) {
                    return { ...m, reactions: reactions.filter((r) => r.id !== oldReaction.id) };
                  }
                  return m;
                });
                try {
                  localStorage.setItem(`nexus_msgs_${activeConversationId}`, JSON.stringify(updated));
                } catch (e) {}
                return updated;
              });
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations'
        },
        () => {
          if (loadConversations) loadConversations();
        }
      )
      .on('broadcast', { event: 'typing' }, (eventPayload) => {
        const payload = eventPayload?.payload;
        if (!payload || payload.userId === user?.id) return;
        const { conversationId, userId, displayName, avatarUrl, username, isTyping } = payload;
        const key = `${conversationId}_${userId}`;
        setTypingUsersMap((prev) => {
          const next = new Map(prev);
          if (isTyping) {
            next.set(key, {
              conversationId,
              userId,
              displayName: displayName || username || 'Usuário',
              avatarUrl,
              username,
              expiresAt: Date.now() + 4000
            });
          } else {
            next.delete(key);
          }
          return next;
        });
      })
      .on('broadcast', { event: 'instant_reaction' }, (eventPayload) => {
        const { messageId, conversationId, userId, emoji, isRemoving } = eventPayload?.payload || {};
        if (!messageId || userId === user?.id) return;
        if (conversationId === activeConversationId) {
          setMessages((prev) =>
            prev.map((m) => {
              if (m.id === messageId) {
                const reactions = m.reactions || [];
                const nextReactions = isRemoving
                  ? reactions.filter((r) => !(r.user_id === userId && r.emoji === emoji))
                  : [
                      ...reactions.filter((r) => !(r.user_id === userId && r.emoji === emoji)),
                      { id: `realtime-${Date.now()}`, message_id: messageId, user_id: userId, emoji }
                    ];
                return { ...m, reactions: nextReactions };
              }
              return m;
            })
          );
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeConversationId, user?.id, loadConversations, pinnedConversationIds]);

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
        const safeType = (type === 'coffee_invite' || type === 'ghost' || type === 'poll' || type === 'nexus_burst') ? 'text' : (type || 'text');
        const { data: insertedMsg, error: insertErr } = await supabase.from('messages').insert({
          conversation_id: activeConversationId,
          sender_id: effectiveSenderId,
          content: content || '',
          type: safeType,
          reply_to_id: optimisticMessage.reply_to_id
        }).select().single();

        if (insertedMsg && !insertErr) {
          let savedAttachments = attachments || [];

          // Inserir anexos de mídia na tabela message_attachments
          if (attachments && attachments.length > 0) {
            try {
              const attachmentPayloads = attachments.map((att) => ({
                message_id: insertedMsg.id,
                file_url: att.file_url || att.url || '',
                file_name: att.file_name || att.name || 'imagem.jpg',
                file_size: att.file_size || att.size || 0,
                file_type: att.file_type || att.type || (att.file_url?.startsWith('data:image') ? 'image' : 'file')
              }));

              const { data: dbAtts, error: dbAttErr } = await supabase
                .from('message_attachments')
                .insert(attachmentPayloads)
                .select();

              if (dbAtts && !dbAttErr) {
                savedAttachments = dbAtts;
              } else if (dbAttErr) {
                console.warn('Erro ao inserir message_attachments no Supabase:', dbAttErr);
              }
            } catch (attEx) {
              console.warn('Erro ao processar anexos:', attEx);
            }
          }

          const confirmedMsg = {
            ...optimisticMessage,
            id: insertedMsg.id,
            attachments: savedAttachments,
            status: 'sent'
          };

          setMessages((prev) => {
            const updated = prev.map((m) => (m.tempId === tempId ? confirmedMsg : m));
            try {
              localStorage.setItem(`nexus_msgs_${activeConversationId}`, JSON.stringify(updated));
            } catch (e) {}
            return updated;
          });

          // Atualizar last_message na conversa
          setConversations((prev) =>
            prev.map((c) =>
              c.id === activeConversationId
                ? {
                    ...c,
                    last_message: confirmedMsg,
                    updated_at: new Date().toISOString()
                  }
                : c
            )
          );

          // +5 moedas por envio
          const newBalance = (user.nexus_coins || 100) + 5;
          await supabase.from('profiles').update({ nexus_coins: newBalance }).eq('id', user.id);
        } else if (insertErr) {
          console.warn('Erro ao inserir mensagem no Supabase:', insertErr);
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

  // Limpar todas as mensagens da conversa (Limpar tudo / Limpar histórico)
  const clearConversation = async (conversationId) => {
    const targetConvId = conversationId || activeConversationId;
    if (!targetConvId) return { success: false, error: 'ID da conversa não fornecido.' };

    try {
      sounds.playPop();

      // Atualização otimista local
      if (targetConvId === activeConversationId) {
        setMessages([]);
      }

      setConversations(prev =>
        prev.map(c => c.id === targetConvId ? { ...c, last_message: null, unread_count: 0 } : c)
      );

      // 1. Supabase
      if (isSupabaseConfigured && supabase) {
        try {
          await supabase.from('messages').delete().eq('conversation_id', targetConvId);
          await supabase
            .from('conversation_participants')
            .update({ unread_count: 0 })
            .eq('conversation_id', targetConvId);
        } catch (supaErr) {
          console.warn('Erro ao limpar mensagens no Supabase:', supaErr);
        }
      }

      // 2. API Backend
      try {
        await apiRequest(`/conversations/${targetConvId}/messages`, { method: 'DELETE' });
      } catch (apiErr) {
        console.warn('Fallback API clear messages:', apiErr);
      }

      // 3. Socket.IO
      if (socket && connected) {
        socket.emit('clear_conversation', { conversationId: targetConvId });
      }

      return { success: true };
    } catch (err) {
      console.error('Erro ao limpar conversa:', err);
      return { success: false, error: err.message };
    }
  };

  // Apagar Conversa completa
  const deleteConversation = async (conversationId) => {
    const targetConvId = conversationId || activeConversationId;
    if (!targetConvId) return { success: false, error: 'ID da conversa não fornecido.' };

    if (targetConvId === BELMONT_ID) {
      return { success: false, error: 'A sala oficial BELMONT CONFERENCE é permanente e não pode ser apagada.' };
    }

    try {
      sounds.playPop();

      // Atualização otimista local
      setConversations(prev => prev.filter(c => c.id !== targetConvId));

      if (activeConversationId === targetConvId) {
        setActiveConversationId(null);
        setMessages([]);
      }

      // 1. Supabase
      if (isSupabaseConfigured && supabase) {
        try {
          await supabase.from('messages').delete().eq('conversation_id', targetConvId);
          await supabase.from('conversation_participants').delete().eq('conversation_id', targetConvId);
          await supabase.from('conversations').delete().eq('id', targetConvId);
        } catch (supaErr) {
          console.warn('Erro ao apagar conversa no Supabase:', supaErr);
        }
      }

      // 2. API Backend
      try {
        await apiRequest(`/conversations/${targetConvId}`, { method: 'DELETE' });
      } catch (apiErr) {
        console.warn('Fallback API delete conversation:', apiErr);
      }

      // 3. Socket.IO
      if (socket && connected) {
        socket.emit('delete_conversation', { conversationId: targetConvId });
      }

      return { success: true };
    } catch (err) {
      console.error('Erro ao apagar conversa:', err);
      return { success: false, error: err.message };
    }
  };

  // --- LISTENERS WEBSOCKET SOCKET.IO (Edições em tempo real, exclusões e limpezas) ---
  useEffect(() => {
    if (!socket || !connected) return;

    const handleNewMsg = (msg) => {
      if (!msg) return;
      setConversations(prev => {
        const isCurrentActive = msg.conversation_id === activeConversationId;
        let found = false;
        const next = prev.map(c => {
          if (c.id === msg.conversation_id) {
            found = true;
            return {
              ...c,
              last_message: msg,
              unread_count: isCurrentActive ? 0 : (c.unread_count || 0) + 1
            };
          }
          return c;
        });
        if (!found && loadConversations) loadConversations();
        return next;
      });

      if (msg.conversation_id === activeConversationId && msg.sender_id !== user?.id) {
        setMessages(prev => {
          if (prev.some(m => m.id === msg.id || (m.tempId && m.tempId === msg.id))) return prev;
          return [...prev, msg];
        });
        sounds.playReceive();
      }
    };

    const handleMsgEdited = (data) => {
      const { messageId, conversationId, content, is_edited, updated_at } = data;
      if (conversationId === activeConversationId) {
        setMessages(prev => prev.map(m => (m.id === messageId ? { ...m, content, is_edited: true, updated_at: updated_at || new Date().toISOString() } : m)));
      }
      setConversations(prev => prev.map(c => {
        if (c.id === conversationId && c.last_message?.id === messageId) {
          return {
            ...c,
            last_message: { ...c.last_message, content, is_edited: true }
          };
        }
        return c;
      }));
    };

    const handleMsgDeleted = (data) => {
      const { messageId, conversationId } = data;
      if (conversationId === activeConversationId) {
        setMessages(prev => prev.map(m => m.id === messageId ? { ...m, is_deleted: true, content: '🚫 Esta mensagem foi excluída' } : m));
      }
    };

    const handleConvCleared = (data) => {
      const { conversationId } = data;
      if (conversationId === activeConversationId) {
        setMessages([]);
      }
      setConversations(prev => prev.map(c => c.id === conversationId ? { ...c, last_message: null, unread_count: 0 } : c));
    };

    const handleConvDeleted = (data) => {
      const { conversationId } = data;
      setConversations(prev => prev.filter(c => c.id !== conversationId));
      if (activeConversationId === conversationId) {
        setActiveConversationId(null);
        setMessages([]);
      }
    };

    socket.on('new_message', handleNewMsg);
    socket.on('message_edited', handleMsgEdited);
    socket.on('conversation_message_edited', handleMsgEdited);
    socket.on('message_deleted', handleMsgDeleted);
    socket.on('conversation_cleared', handleConvCleared);
    socket.on('conversation_deleted', handleConvDeleted);
    socket.on('conversation_removed', handleConvDeleted);

    return () => {
      socket.off('new_message', handleNewMsg);
      socket.off('message_edited', handleMsgEdited);
      socket.off('conversation_message_edited', handleMsgEdited);
      socket.off('message_deleted', handleMsgDeleted);
      socket.off('conversation_cleared', handleConvCleared);
      socket.off('conversation_deleted', handleConvDeleted);
      socket.off('conversation_removed', handleConvDeleted);
    };
  }, [socket, connected, activeConversationId, user?.id, loadConversations]);

  const emitTyping = (isTyping) => {
    if (!activeConversationId || !user) return;

    // 1. Broadcast instantâneo via Supabase Realtime (funciona em produção na Vercel)
    if (isSupabaseConfigured && supabase) {
      supabase.channel('chat_global_messages_listener').send({
        type: 'broadcast',
        event: 'typing',
        payload: {
          conversationId: activeConversationId,
          userId: user.id,
          displayName: user.display_name || user.username,
          username: user.username,
          avatarUrl: user.avatar_url,
          isTyping
        }
      }).catch(() => {});
    }

    // 2. Socket.IO (quando configurado)
    if (socket && connected) {
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

    let isRemoving = false;

    // 1. Atualização Otimista Local + Cache
    setMessages((prev) => {
      const updated = prev.map((m) => {
        if (m.id === messageId) {
          const reactions = m.reactions || [];
          const exists = reactions.some((r) => r.user_id === user.id && r.emoji === emoji);
          isRemoving = exists;
          const nextReactions = exists
            ? reactions.filter((r) => !(r.user_id === user.id && r.emoji === emoji))
            : [...reactions, { id: `temp-${Date.now()}`, message_id: messageId, user_id: user.id, emoji }];
          return { ...m, reactions: nextReactions };
        }
        return m;
      });

      try {
        localStorage.setItem(`nexus_msgs_${activeConversationId}`, JSON.stringify(updated));
      } catch (e) {}

      return updated;
    });

    sounds.playPop();

    // Broadcast instantâneo via Supabase Realtime
    if (isSupabaseConfigured && supabase && activeConversationId) {
      supabase.channel('chat_global_messages_listener').send({
        type: 'broadcast',
        event: 'instant_reaction',
        payload: {
          messageId,
          conversationId: activeConversationId,
          userId: user.id,
          emoji,
          isRemoving
        }
      }).catch(() => {});
    }

    // 2. Persistência no Banco Supabase
    if (isSupabaseConfigured && supabase) {
      try {
        if (isRemoving) {
          await supabase
            .from('message_reactions')
            .delete()
            .eq('message_id', messageId)
            .eq('user_id', user.id)
            .eq('emoji', emoji);
        } else {
          const { data: insertedReaction, error: reactErr } = await supabase
            .from('message_reactions')
            .insert({
              message_id: messageId,
              user_id: user.id,
              emoji
            })
            .select()
            .single();

          if (insertedReaction) {
            setMessages((prev) => {
              const updated = prev.map((m) => {
                if (m.id === messageId) {
                  const reactions = m.reactions || [];
                  return {
                    ...m,
                    reactions: reactions.map((r) =>
                      r.user_id === user.id && r.emoji === emoji ? insertedReaction : r
                    )
                  };
                }
                return m;
              });
              try {
                localStorage.setItem(`nexus_msgs_${activeConversationId}`, JSON.stringify(updated));
              } catch (e) {}
              return updated;
            });
          } else if (reactErr) {
            console.warn('Erro ao salvar reação no Supabase:', reactErr);
          }
        }
      } catch (err) {
        console.error('Erro ao persistir reação:', err);
      }
    }

    if (socket && connected) {
      socket.emit('react_message', { messageId, conversationId: activeConversationId, userId: user.id, emoji });
    }
  };

  // Iniciar ou abrir conversa direta com um usuário
  const startDirectChat = async (targetUser) => {
    if (!user || !targetUser) return;
    try {
      setLoadingConversations(true);

      // 1. Verificar se já existe conversa direta carregada localmente
      const existingConv = conversations.find(
        (c) =>
          c.type === 'direct' &&
          (c.direct_user?.id === targetUser.id ||
            c.id === targetUser.conversation_id ||
            (c.participants && c.participants.some((p) => p.user_id === targetUser.id)))
      );

      if (existingConv) {
        setActiveConversationId(existingConv.id);
        return existingConv;
      }

      // 2. Se Supabase ativo, verificar participações mútuas no banco
      if (isSupabaseConfigured && supabase) {
        const { data: myConvs } = await supabase
          .from('conversation_participants')
          .select('conversation_id')
          .eq('user_id', user.id);

        const myConvIds = (myConvs || []).map((p) => p.conversation_id);

        if (myConvIds.length > 0) {
          const { data: sharedConvs } = await supabase
            .from('conversation_participants')
            .select('conversation_id, conversations!inner(type)')
            .eq('user_id', targetUser.id)
            .in('conversation_id', myConvIds)
            .eq('conversations.type', 'direct')
            .limit(1);

          if (sharedConvs && sharedConvs.length > 0) {
            const matchedId = sharedConvs[0].conversation_id;
            setActiveConversationId(matchedId);
            if (loadConversations) await loadConversations();
            return { id: matchedId };
          }
        }

        // 3. Criar nova conversa direta no Supabase
        const { data: newConv, error: convErr } = await supabase
          .from('conversations')
          .insert({ type: 'direct' })
          .select()
          .single();

        if (newConv && !convErr) {
          await supabase.from('conversation_participants').insert([
            { conversation_id: newConv.id, user_id: user.id, role: 'member' },
            { conversation_id: newConv.id, user_id: targetUser.id, role: 'member' }
          ]);

          const formattedNewConv = {
            ...newConv,
            type: 'direct',
            name: targetUser.display_name || targetUser.username,
            avatar_url: targetUser.avatar_url,
            direct_user: targetUser,
            unread_count: 0,
            last_message: null
          };

          setConversations((prev) => [formattedNewConv, ...prev]);
          setActiveConversationId(newConv.id);
          return formattedNewConv;
        }
      }

      // Fallback local caso esteja sem conexão
      const localDirectId = `direct-${Date.now()}`;
      const localConv = {
        id: localDirectId,
        type: 'direct',
        name: targetUser.display_name || targetUser.username,
        avatar_url: targetUser.avatar_url,
        direct_user: targetUser,
        unread_count: 0,
        last_message: null
      };

      setConversations((prev) => [localConv, ...prev]);
      setActiveConversationId(localDirectId);
      return localConv;
    } catch (err) {
      console.error('Erro ao iniciar chat direto:', err);
    } finally {
      setLoadingConversations(false);
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
        typingUsers: activeTypingUsers,
        pinnedConversationIds,
        togglePinConversation,
        isConversationPinned,
        replyingTo,
        editingMessage,
        soundEnabled,
        setActiveConversationId,
        loadConversations,
        sendMessage,
        editMessage,
        deleteMessage,
        deleteConversation,
        clearConversation,
        pinMessage,
        reactToMessage,
        startDirectChat,
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
