const { supabase, isConfigured } = require('../config/supabase');
const { deleteMessageInCache } = require('../utils/messageCache');

// Mapeamento de timers de autodestruição em execução: messageId -> Timeout
const activeDestructionTimers = new Map();

/**
 * Converte o tipo de expiração (ex: '10s', '30s', '1m', '5m', '1h', '24h') em segundos
 */
function parseDurationSeconds(ghostType) {
  switch (ghostType) {
    case '10s': return 10;
    case '30s': return 30;
    case '1m': return 60;
    case '5m': return 300;
    case '1h': return 3600;
    case '24h': return 86400;
    default: return null;
  }
}

/**
 * Agenda a autodestruição definitiva de uma mensagem no servidor VPS
 */
function scheduleEphemeralDestruction(io, messageId, conversationId, durationSeconds) {
  if (!messageId || !conversationId || !durationSeconds || durationSeconds <= 0) return;

  // Cancela timer anterior se já houver
  if (activeDestructionTimers.has(messageId)) {
    clearTimeout(activeDestructionTimers.get(messageId));
  }

  console.log(`⏱️ [Ephemeral] Mensagem ${messageId} agendada para autodestruição em ${durationSeconds}s`);

  const timer = setTimeout(async () => {
    activeDestructionTimers.delete(messageId);
    await executeMessageDestruction(io, messageId, conversationId, 'expired');
  }, durationSeconds * 1000);

  activeDestructionTimers.set(messageId, timer);
}

/**
 * Executa a destruição da mensagem no banco de dados, no cache de RAM e nos clientes
 */
async function executeMessageDestruction(io, messageId, conversationId, reason = 'expired') {
  try {
    console.log(`🔥 [Ephemeral] Executando autodestruição da mensagem ${messageId} (${reason})`);

    // 1. Remove do cache em memória RAM da VPS
    deleteMessageInCache(conversationId, messageId);

    // 2. Apaga ou oculta o conteúdo no banco Supabase
    if (isConfigured && supabase) {
      await supabase
        .from('messages')
        .update({
          is_deleted: true,
          content: '🔥 Esta mensagem autodestruiu-se permanentemente.'
        })
        .eq('id', messageId);

      // Também remove anexos de mídia vinculados
      await supabase
        .from('message_attachments')
        .delete()
        .eq('message_id', messageId);
    }

    // 3. Emite notificação em tempo real para a sala da conversa
    io.to(`conversation:${conversationId}`).emit('message_deleted', {
      messageId,
      conversationId,
      reason
    });

    io.to(`conversation:${conversationId}`).emit('message_expired', {
      messageId,
      conversationId
    });

  } catch (error) {
    console.error('Erro ao executar destruição de mensagem efêmera:', error);
  }
}

/**
 * Trata o evento de queima imediata de foto de visualização única (view_once)
 */
async function handleBurnGhostMessage(socket, io, data) {
  try {
    const { messageId, conversationId } = data || {};
    if (!messageId || !conversationId) return;

    // Se havia timer agendado, limpa
    if (activeDestructionTimers.has(messageId)) {
      clearTimeout(activeDestructionTimers.get(messageId));
      activeDestructionTimers.delete(messageId);
    }

    await executeMessageDestruction(io, messageId, conversationId, 'view_once_burned');
  } catch (err) {
    console.error('Erro ao queimar mensagem de visualização única:', err);
  }
}

module.exports = {
  parseDurationSeconds,
  scheduleEphemeralDestruction,
  handleBurnGhostMessage,
  executeMessageDestruction
};
