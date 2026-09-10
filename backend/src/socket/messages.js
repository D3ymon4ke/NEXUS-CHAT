const { supabase, isConfigured } = require('../config/supabase');
const { v4: uuidv4 } = require('uuid');
const {
  getCachedMessages,
  setCachedMessages,
  addMessageToCache,
  updateMessageInCache,
  markDeliveredInCache,
  markReadInCache,
  deleteMessageInCache,
  clearConversationCache
} = require('../utils/messageCache');
const {
  parseDurationSeconds,
  scheduleEphemeralDestruction
} = require('./ephemeral');
const { sendPushForNewMessage } = require('../services/pushService');

/**
 * Trata o envio de uma nova mensagem em tempo real
 */
async function handleSendMessage(socket, io, data) {
  try {
    const {
      conversationId,
      senderId,
      content,
      type = 'text',
      replyToId = null,
      attachments = [],
      sender = null,
      tempId = null
    } = data;

    if (!conversationId || !senderId || (!content && attachments.length === 0)) {
      socket.emit('error_message', { message: 'Dados de mensagem incompletos.' });
      return;
    }

    const messageId = uuidv4();
    const createdAt = new Date().toISOString();

    const formattedMessage = {
      id: messageId,
      tempId, // Usado pelo frontend para matching otimista
      conversation_id: conversationId,
      sender_id: senderId,
      content: content || '',
      type,
      reply_to_id: replyToId,
      is_edited: false,
      is_pinned: false,
      is_deleted: false,
      created_at: createdAt,
      updated_at: createdAt,
      sender: sender || {
        id: senderId,
        display_name: 'Usuário',
        username: 'usuario',
        avatar_url: null
      },
      attachments: attachments || [],
      reactions: [],
      status: 'sent'
    };

    // Armazena instantaneamente no cache de RAM da VPS (< 1ms)
    addMessageToCache(conversationId, formattedMessage);

    // Salvar no Supabase se configurado
    if (isConfigured && supabase) {
      const { error: msgError } = await supabase.from('messages').insert({
        id: messageId,
        conversation_id: conversationId,
        sender_id: senderId,
        content: content || '',
        type,
        reply_to_id: replyToId,
        created_at: createdAt
      });

      if (msgError) {
        console.error('Erro ao persistir mensagem no Supabase:', msgError);
      }

      // Inserir anexos caso existam
      if (attachments && attachments.length > 0) {
        const attachmentInserts = attachments.map(att => ({
          message_id: messageId,
          file_url: att.file_url || att.url,
          file_name: att.file_name || att.name,
          file_size: att.file_size || att.size || 0,
          file_type: att.file_type || att.type || 'document'
        }));
        await supabase.from('message_attachments').insert(attachmentInserts);
      }

      // Atualizar data de última atividade da conversa
      await supabase
        .from('conversations')
        .update({ updated_at: createdAt })
        .eq('id', conversationId);
    }

    // 1. Emite para todos os membros conectados na sala da conversa
    io.to(`conversation:${conversationId}`).emit('new_message', formattedMessage);

    // 2. Emite diretamente para a sala pessoal de cada participante (estilo Telegram/WhatsApp)
    // Garante que o participante receba instantaneamente mesmo sem estar com o chat aberto na tela
    if (isConfigured && supabase) {
      supabase
        .from('conversation_participants')
        .select('user_id')
        .eq('conversation_id', conversationId)
        .then(({ data: participants }) => {
          if (participants && participants.length > 0) {
            participants.forEach((p) => {
              if (p.user_id) {
                io.to(`user:${p.user_id}`).emit('new_message', formattedMessage);
              }
            });
          }
        })
        .catch(() => {});
    }

    // Recompensa de Economia: +5 Nexus Coins por mensagem enviada (cooldown de 5s para evitar spam)
    handleMessageCoinReward(senderId, socket, io);

    // 3. Emite notificação global de nova mensagem para quem não está na sala ativa
    io.emit('conversation_updated', {
      conversationId,
      lastMessage: formattedMessage,
      unreadCountDelta: 1,
      senderId
    });

    // Dispara Web Push em background para membros offline através da VPS (Item 7)
    sendPushForNewMessage(conversationId, formattedMessage, senderId).catch((pushErr) => {
      console.warn('Aviso ao disparar Web Push no handleSendMessage:', pushErr.message);
    });

    // Agenda autodestruição no servidor VPS se for mensagem efêmera / temporária (Item 6)
    if (type === 'ghost' || (content && typeof content === 'string' && content.includes('"ghost_message"'))) {
      try {
        let ghostData = null;
        if (typeof content === 'string' && content.startsWith('{')) {
          const parsed = JSON.parse(content);
          ghostData = parsed.ghost_message;
        } else if (typeof content === 'object' && content.ghost_message) {
          ghostData = content.ghost_message;
        }

        if (ghostData && ghostData.ghostType) {
          const secs = parseDurationSeconds(ghostData.ghostType);
          if (secs) {
            scheduleEphemeralDestruction(io, messageId, conversationId, secs);
          }
        }
      } catch (ghostErr) {
        console.warn('Aviso ao agendar autodestruição:', ghostErr);
      }
    }

  } catch (error) {
    console.error('Erro ao processar envio de mensagem:', error);
    socket.emit('error_message', { message: 'Falha ao processar mensagem.' });
  }
}

/**
 * Trata a edição de mensagem em tempo real
 */
async function handleEditMessage(socket, io, data) {
  try {
    const { messageId, conversationId, content, senderId } = data;
    if (!messageId || !conversationId || !content) return;

    const updatedAt = new Date().toISOString();

    // Atualiza cache de RAM imediatamente
    updateMessageInCache(conversationId, messageId, {
      content,
      is_edited: true,
      updated_at: updatedAt
    });

    if (isConfigured && supabase) {
      let query = supabase
        .from('messages')
        .update({ content, is_edited: true, updated_at: updatedAt })
        .eq('id', messageId);

      // Se senderId for passado, valida o autor da mensagem
      if (senderId) {
        query = query.eq('sender_id', senderId);
      }

      await query;
    }

    io.to(`conversation:${conversationId}`).emit('message_edited', {
      messageId,
      conversationId,
      content,
      is_edited: true,
      updated_at: updatedAt
    });

    // Atualiza preview na lista de conversas
    io.emit('conversation_message_edited', {
      conversationId,
      messageId,
      content
    });
  } catch (error) {
    console.error('Erro ao editar mensagem:', error);
  }
}

/**
 * Trata limpeza de mensagens de uma conversa em tempo real
 */
async function handleClearConversation(socket, io, data) {
  try {
    const { conversationId, userId } = data;
    if (!conversationId) return;

    // Limpa cache de RAM da conversa
    clearConversationCache(conversationId);

    io.to(`conversation:${conversationId}`).emit('conversation_cleared', {
      conversationId,
      clearedBy: userId,
      clearedAt: new Date().toISOString()
    });

    io.emit('conversation_updated', {
      conversationId,
      lastMessage: null,
      unreadCountDelta: 0
    });
  } catch (error) {
    console.error('Erro ao processar socket clear conversation:', error);
  }
}

/**
 * Trata exclusão de uma conversa em tempo real
 */
async function handleDeleteConversation(socket, io, data) {
  try {
    const { conversationId, userId } = data;
    if (!conversationId) return;

    clearConversationCache(conversationId);

    io.to(`conversation:${conversationId}`).emit('conversation_deleted', {
      conversationId,
      deletedBy: userId
    });

    io.emit('conversation_removed', {
      conversationId
    });
  } catch (error) {
    console.error('Erro ao processar socket delete conversation:', error);
  }
}

/**
 * Trata exclusão de mensagem em tempo real
 */
async function handleDeleteMessage(socket, io, data) {
  try {
    const { messageId, conversationId, senderId } = data;
    if (!messageId || !conversationId) return;

    // Atualiza cache de RAM
    deleteMessageInCache(conversationId, messageId);

    if (isConfigured && supabase) {
      await supabase
        .from('messages')
        .update({ is_deleted: true, content: 'Esta mensagem foi apagada.' })
        .eq('id', messageId);
    }

    io.to(`conversation:${conversationId}`).emit('message_deleted', {
      messageId,
      conversationId
    });
  } catch (error) {
    console.error('Erro ao deletar mensagem:', error);
  }
}

/**
 * Trata fixação/desafixação de mensagem
 */
async function handlePinMessage(socket, io, data) {
  try {
    const { messageId, conversationId, isPinned } = data;
    if (!messageId || !conversationId) return;

    updateMessageInCache(conversationId, messageId, { is_pinned: isPinned });

    if (isConfigured && supabase) {
      await supabase
        .from('messages')
        .update({ is_pinned: isPinned })
        .eq('id', messageId);
    }

    io.to(`conversation:${conversationId}`).emit('message_pinned_updated', {
      messageId,
      conversationId,
      isPinned
    });
  } catch (error) {
    console.error('Erro ao fixar mensagem:', error);
  }
}

/**
 * Trata reações de emojis em mensagens
 */
async function handleReactMessage(socket, io, data) {
  try {
    const { messageId, conversationId, userId, emoji } = data;
    if (!messageId || !conversationId || !userId || !emoji) return;

    if (isConfigured && supabase) {
      // Verifica se já existe a reação
      const { data: existing } = await supabase
        .from('message_reactions')
        .select('id')
        .eq('message_id', messageId)
        .eq('user_id', userId)
        .eq('emoji', emoji)
        .single();

      if (existing) {
        // Remove reação existente (toggle off)
        await supabase.from('message_reactions').delete().eq('id', existing.id);
      } else {
        // Insere nova reação
        await supabase.from('message_reactions').insert({
          message_id: messageId,
          user_id: userId,
          emoji
        });
      }
    }

    io.to(`conversation:${conversationId}`).emit('message_reaction_updated', {
      messageId,
      conversationId,
      userId,
      emoji
    });
  } catch (error) {
    console.error('Erro ao processar reação:', error);
  }
}

/**
 * Trata confirmação de recebimento/entrega no aparelho do destinatário
 */
async function handleMessageDelivered(socket, io, data) {
  try {
    const { conversationId, messageId, tempId, senderId, deliveredToUserId } = data;
    if (!conversationId) return;

    // Atualiza o cache de RAM na VPS
    markDeliveredInCache(conversationId, messageId, tempId);

    const payload = {
      conversationId,
      messageId,
      tempId,
      deliveredToUserId: deliveredToUserId || socket.user?.id,
      deliveredAt: new Date().toISOString()
    };

    // Emite para a sala da conversa
    socket.to(`conversation:${conversationId}`).emit('message_delivered', payload);

    // Se soubermos o remetente, envia também para a sala pessoal dele
    if (senderId) {
      io.to(`user:${senderId}`).emit('message_delivered', payload);
    }
  } catch (error) {
    console.error('Erro ao processar confirmação de entrega:', error);
  }
}

/**
 * Trata confirmação de leitura de mensagens
 */
async function handleMarkAsRead(socket, io, data) {
  try {
    const { conversationId, userId, lastMessageId } = data;
    const effectiveUserId = userId || socket.user?.id;
    if (!conversationId || !effectiveUserId) return;

    // Atualiza status das mensagens no cache de RAM
    markReadInCache(conversationId, effectiveUserId);

    if (isConfigured && supabase) {
      await supabase
        .from('conversation_participants')
        .update({
          last_read_message_id: lastMessageId || null,
          unread_count: 0
        })
        .eq('conversation_id', conversationId)
        .eq('user_id', effectiveUserId);
    }

    const payload = {
      conversationId,
      userId: effectiveUserId,
      readAt: new Date().toISOString()
    };

    socket.to(`conversation:${conversationId}`).emit('messages_read_by_user', payload);
    io.emit('conversation_messages_read', payload);
  } catch (error) {
    console.error('Erro ao marcar mensagens como lidas:', error);
  }
}

/**
 * Retorna as mensagens em cache de RAM diretamente pelo Socket (< 2ms)
 */
function handleGetConversationCache(socket, io, data, callback) {
  const { conversationId } = data || {};
  if (!conversationId) {
    if (typeof callback === 'function') callback({ success: false, messages: [] });
    return;
  }

  const cached = getCachedMessages(conversationId);
  const result = {
    success: true,
    conversationId,
    messages: cached || [],
    fromCache: !!cached
  };

  if (typeof callback === 'function') {
    callback(result);
  }
  socket.emit('conversation_cache_loaded', result);
}

/**
 * Sincroniza/aquece o cache de RAM a partir do cliente
 */
function handleSyncConversationCache(socket, io, data) {
  const { conversationId, messages } = data || {};
  if (conversationId && Array.isArray(messages) && messages.length > 0) {
    setCachedMessages(conversationId, messages);
  }
}

// Rastreamento de cooldown de moedas por usuário (5 segundos)
const lastCoinRewardTimes = new Map();

async function handleMessageCoinReward(userId, socket, io) {
  try {
    if (!userId || userId.startsWith('system')) return;

    const now = Date.now();
    const lastTime = lastCoinRewardTimes.get(userId) || 0;

    // Cooldown de 5 segundos entre mensagens para ganhar moedas
    if (now - lastTime < 5000) return;
    lastCoinRewardTimes.set(userId, now);

    const rewardAmount = 5;

    if (isConfigured && supabase) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('nexus_coins')
        .eq('id', userId)
        .single();

      const newBalance = (profile?.nexus_coins || 0) + rewardAmount;

      await supabase
        .from('profiles')
        .update({ nexus_coins: newBalance })
        .eq('id', userId);

      await supabase.from('nexus_transactions').insert({
        user_id: userId,
        amount: rewardAmount,
        type: 'message_reward',
        description: 'Recompensa por envio de mensagem'
      });

      // Notifica o cliente específico com o saldo atualizado e a animação de moedas
      io.to(`user:${userId}`).emit('coins_earned', {
        amount: rewardAmount,
        newBalance,
        reason: 'Mensagem enviada (+5 🪙)'
      });
    } else {
      socket.emit('coins_earned', {
        amount: rewardAmount,
        newBalance: 355,
        reason: 'Mensagem enviada (+5 🪙)'
      });
    }
  } catch (err) {
    console.error('Erro ao premiar moedas por mensagem:', err);
  }
}

module.exports = {
  handleSendMessage,
  handleEditMessage,
  handleDeleteMessage,
  handlePinMessage,
  handleReactMessage,
  handleMarkAsRead,
  handleMessageDelivered,
  handleClearConversation,
  handleDeleteConversation,
  handleMessageCoinReward,
  handleGetConversationCache,
  handleSyncConversationCache
};
