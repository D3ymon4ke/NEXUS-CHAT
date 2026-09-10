// Mapeamento: `${conversationId}:${userId}` -> NodeJS.Timeout
const actionTimeouts = new Map();

/**
 * Registra o início de uma ação rica em tempo real (estilo Telegram)
 * action: 'typing' | 'uploading_photo' | 'uploading_file'
 */
function handleActionStart(socket, io, data) {
  const { conversationId, user, action = 'typing' } = data;
  if (!conversationId || !user) return;

  const key = `${conversationId}:${user.id}`;

  if (actionTimeouts.has(key)) {
    clearTimeout(actionTimeouts.get(key));
  }

  const payload = {
    conversationId,
    action, // 'typing', 'uploading_photo', 'uploading_file'
    user: {
      id: user.id,
      displayName: user.displayName || user.username || 'Alguém',
      avatarUrl: user.avatarUrl
    },
    startedAt: Date.now()
  };

  // Notifica os participantes dentro da sala da conversa
  socket.to(`conversation:${conversationId}`).emit('user_action_start', payload);

  // Mantém emissão de compatibilidade se for digitação
  if (action === 'typing') {
    socket.to(`conversation:${conversationId}`).emit('user_typing_start', payload);
  }

  // Notifica globalmente para atualizar a lista lateral (sidebar preview)
  io.emit('user_action_preview', payload);

  // Timeout de segurança de 4.5 segundos
  const timeout = setTimeout(() => {
    handleActionStop(socket, io, data);
  }, 4500);

  actionTimeouts.set(key, timeout);
}

/**
 * Registra o término da ação
 */
function handleActionStop(socket, io, data) {
  const { conversationId, user } = data;
  if (!conversationId || !user) return;

  const key = `${conversationId}:${user.id}`;
  if (actionTimeouts.has(key)) {
    clearTimeout(actionTimeouts.get(key));
    actionTimeouts.delete(key);
  }

  const payload = {
    conversationId,
    userId: user.id
  };

  socket.to(`conversation:${conversationId}`).emit('user_action_stop', payload);
  socket.to(`conversation:${conversationId}`).emit('user_typing_stop', payload);
  io.emit('user_action_preview_stop', payload);
}

// Funções de compatibilidade com chamadas anteriores
function handleTypingStart(socket, io, data) {
  handleActionStart(socket, io, { ...data, action: 'typing' });
}

function handleTypingStop(socket, io, data) {
  handleActionStop(socket, io, data);
}

module.exports = {
  handleActionStart,
  handleActionStop,
  handleTypingStart,
  handleTypingStop
};
