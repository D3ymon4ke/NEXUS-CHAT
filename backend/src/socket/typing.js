// Mapeamento: `${conversationId}:${userId}` -> NodeJS.Timeout
const typingTimeouts = new Map();

/**
 * Registra o início da digitação de um usuário em uma conversa
 */
function handleTypingStart(socket, io, data) {
  const { conversationId, user } = data;
  if (!conversationId || !user) return;

  const key = `${conversationId}:${user.id}`;

  // Se já houver um timer de timeout, limpa
  if (typingTimeouts.has(key)) {
    clearTimeout(typingTimeouts.get(key));
  }

  // Notifica os outros membros da sala da conversa
  socket.to(`conversation:${conversationId}`).emit('user_typing_start', {
    conversationId,
    user: {
      id: user.id,
      displayName: user.displayName || user.username || 'Alguém',
      avatarUrl: user.avatarUrl
    }
  });

  // Cria um timeout de segurança de 4 segundos para parar de digitar automaticamente
  const timeout = setTimeout(() => {
    handleTypingStop(socket, io, data);
  }, 4000);

  typingTimeouts.set(key, timeout);
}

/**
 * Registra o término da digitação
 */
function handleTypingStop(socket, io, data) {
  const { conversationId, user } = data;
  if (!conversationId || !user) return;

  const key = `${conversationId}:${user.id}`;
  if (typingTimeouts.has(key)) {
    clearTimeout(typingTimeouts.get(key));
    typingTimeouts.delete(key);
  }

  socket.to(`conversation:${conversationId}`).emit('user_typing_stop', {
    conversationId,
    userId: user.id
  });
}

module.exports = {
  handleTypingStart,
  handleTypingStop
};
