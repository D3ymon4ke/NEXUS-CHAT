/**
 * Cache em Memória RAM para Mensagens do Chat (Ultra-baixo tempo de resposta: < 2ms)
 * Armazena as últimas 150 mensagens de conversas ativas diretamente na memória da VPS.
 */

const conversationCache = new Map();
const MAX_MESSAGES_PER_CONV = 150;

/**
 * Retorna as mensagens em cache para uma conversa
 */
function getCachedMessages(conversationId) {
  if (!conversationId) return null;
  const list = conversationCache.get(conversationId);
  return list ? [...list] : null;
}

/**
 * Define ou atualiza todo o bloco de mensagens em cache de uma conversa de forma segura (mesclando por ID)
 */
function setCachedMessages(conversationId, messages) {
  if (!conversationId || !Array.isArray(messages)) return;
  const existing = conversationCache.get(conversationId) || [];
  
  const msgMap = new Map();
  existing.forEach(m => {
    if (m && (m.id || m.tempId)) {
      const key = m.id || m.tempId;
      msgMap.set(key, m);
    }
  });

  messages.forEach(m => {
    if (m && (m.id || m.tempId)) {
      const key = m.id || m.tempId;
      const prev = msgMap.get(key) || {};
      msgMap.set(key, { ...prev, ...m });
    }
  });

  const merged = Array.from(msgMap.values())
    .sort((a, b) => new Date(a.created_at || a.createdAt || 0) - new Date(b.created_at || b.createdAt || 0))
    .slice(-MAX_MESSAGES_PER_CONV);

  conversationCache.set(conversationId, merged);
}

/**
 * Adiciona uma nova mensagem ao cache
 */
function addMessageToCache(conversationId, message) {
  if (!conversationId || !message) return;
  const list = conversationCache.get(conversationId) || [];

  const existingIdx = list.findIndex(
    m => (message.id && m.id === message.id) ||
         (message.tempId && (m.tempId === message.tempId || m.id === message.tempId)) ||
         (m.tempId && message.id === m.tempId)
  );

  if (existingIdx >= 0) {
    list[existingIdx] = { ...list[existingIdx], ...message };
  } else {
    list.push(message);
    if (list.length > MAX_MESSAGES_PER_CONV) {
      list.shift();
    }
  }

  conversationCache.set(conversationId, list);
}

/**
 * Atualiza campos de uma mensagem existente (ex: edição, reações, fixação)
 */
function updateMessageInCache(conversationId, messageId, patch) {
  if (!conversationId || !messageId) return;
  const list = conversationCache.get(conversationId);
  if (!list) return;

  const idx = list.findIndex(m => m.id === messageId || (patch?.tempId && m.tempId === patch.tempId));
  if (idx >= 0) {
    list[idx] = { ...list[idx], ...patch };
    conversationCache.set(conversationId, list);
  }
}

/**
 * Atualiza o status para 'delivered' (dois tiques cinzas)
 */
function markDeliveredInCache(conversationId, messageId, tempId) {
  if (!conversationId) return;
  const list = conversationCache.get(conversationId);
  if (!list) return;

  const idx = list.findIndex(
    m => (messageId && m.id === messageId) || (tempId && m.tempId === tempId)
  );

  if (idx >= 0 && list[idx].status !== 'read') {
    list[idx] = { ...list[idx], status: 'delivered' };
    conversationCache.set(conversationId, list);
  }
}

/**
 * Atualiza todas as mensagens recebidas na conversa para 'read' (dois tiques cianos)
 */
function markReadInCache(conversationId, readerId) {
  if (!conversationId) return;
  const list = conversationCache.get(conversationId);
  if (!list) return;

  let changed = false;
  list.forEach((m, idx) => {
    if (m.sender_id !== readerId && m.status !== 'read') {
      list[idx] = { ...m, status: 'read' };
      changed = true;
    }
  });

  if (changed) {
    conversationCache.set(conversationId, list);
  }
}

/**
 * Marca ou remove mensagem apagada no cache
 */
function deleteMessageInCache(conversationId, messageId) {
  if (!conversationId || !messageId) return;
  const list = conversationCache.get(conversationId);
  if (!list) return;

  const idx = list.findIndex(m => m.id === messageId);
  if (idx >= 0) {
    list[idx] = { ...list[idx], is_deleted: true, content: 'Esta mensagem foi apagada.' };
    conversationCache.set(conversationId, list);
  }
}

/**
 * Limpa o histórico de uma conversa do cache
 */
function clearConversationCache(conversationId) {
  if (conversationId) {
    conversationCache.delete(conversationId);
  }
}

module.exports = {
  getCachedMessages,
  setCachedMessages,
  addMessageToCache,
  updateMessageInCache,
  markDeliveredInCache,
  markReadInCache,
  deleteMessageInCache,
  clearConversationCache
};
