const { supabase, isConfigured } = require('../config/supabase');
const { v4: uuidv4 } = require('uuid');

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

    // Emite para todos os membros conectados na sala da conversa
    io.to(`conversation:${conversationId}`).emit('new_message', formattedMessage);

    // Emite notificação global de nova mensagem para quem não está na sala ativa
    io.emit('conversation_updated', {
      conversationId,
      lastMessage: formattedMessage,
      unreadCountDelta: 1
    });

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

    if (isConfigured && supabase) {
      await supabase
        .from('messages')
        .update({ content, is_edited: true, updated_at: updatedAt })
        .eq('id', messageId)
        .eq('sender_id', senderId);
    }

    io.to(`conversation:${conversationId}`).emit('message_edited', {
      messageId,
      conversationId,
      content,
      is_edited: true,
      updated_at: updatedAt
    });
  } catch (error) {
    console.error('Erro ao editar mensagem:', error);
  }
}

/**
 * Trata exclusão de mensagem em tempo real
 */
async function handleDeleteMessage(socket, io, data) {
  try {
    const { messageId, conversationId, senderId } = data;
    if (!messageId || !conversationId) return;

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
 * Trata confirmação de leitura de mensagens
 */
async function handleMarkAsRead(socket, io, data) {
  try {
    const { conversationId, userId, lastMessageId } = data;
    if (!conversationId || !userId) return;

    if (isConfigured && supabase) {
      await supabase
        .from('conversation_participants')
        .update({
          last_read_message_id: lastMessageId || null,
          unread_count: 0
        })
        .eq('conversation_id', conversationId)
        .eq('user_id', userId);
    }

    socket.to(`conversation:${conversationId}`).emit('messages_read_by_user', {
      conversationId,
      userId,
      readAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Erro ao marcar mensagens como lidas:', error);
  }
}

module.exports = {
  handleSendMessage,
  handleEditMessage,
  handleDeleteMessage,
  handlePinMessage,
  handleReactMessage,
  handleMarkAsRead
};
