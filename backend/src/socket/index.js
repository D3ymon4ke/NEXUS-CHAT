const { authenticateSocket } = require('../middlewares/auth');
const {
  userConnected,
  userDisconnected,
  getOnlineUserIds,
  isUserOnline
} = require('./presence');
const {
  handleTypingStart,
  handleTypingStop,
  handleActionStart,
  handleActionStop
} = require('./typing');
const {
  handleSendMessage,
  handleEditMessage,
  handleDeleteMessage,
  handlePinMessage,
  handleReactMessage,
  handleMarkAsRead,
  handleMessageDelivered,
  handleClearConversation,
  handleDeleteConversation,
  handleGetConversationCache,
  handleSyncConversationCache
} = require('./messages');
const {
  handleBurnGhostMessage
} = require('./ephemeral');

function setupSocketIO(io) {
  // Middleware de autenticação para conexões WebSocket
  io.use(authenticateSocket);

  io.on('connection', async (socket) => {
    const user = socket.user;
    const userId = user?.id;

    if (!userId) {
      socket.disconnect();
      return;
    }

    console.log(`🔌 Conexão WebSocket estabelecida: ${socket.id} (User: ${userId})`);

    // Entra na sala pessoal do usuário para notificações diretas
    socket.join(`user:${userId}`);

    // Registra usuário como online
    await userConnected(userId, socket.id, io);

    // Envia lista atual de usuários online para o cliente recém-conectado
    socket.emit('online_users_list', getOnlineUserIds());

    // --- SALAS DE CONVERSA ---
    socket.on('join_conversation', (conversationId) => {
      if (conversationId) {
        socket.join(`conversation:${conversationId}`);
        console.log(`🚪 Usuário ${userId} entrou na sala da conversa: ${conversationId}`);
      }
    });

    socket.on('leave_conversation', (conversationId) => {
      if (conversationId) {
        socket.leave(`conversation:${conversationId}`);
        console.log(`🚪 Usuário ${userId} saiu da sala da conversa: ${conversationId}`);
      }
    });

    // --- AÇÕES RICAS EM TEMPO REAL (DIGITANDO, ENVIANDO FOTO, ARQUIVO) ---
    socket.on('action_start', (data) => {
      handleActionStart(socket, io, { ...data, user });
    });

    socket.on('action_stop', (data) => {
      handleActionStop(socket, io, { ...data, user });
    });

    // Compatibilidade com eventos legados de digitação
    socket.on('typing_start', (data) => {
      handleActionStart(socket, io, { ...data, user, action: 'typing' });
    });

    socket.on('typing_stop', (data) => {
      handleActionStop(socket, io, { ...data, user });
    });

    // --- CACHE EM MEMÓRIA RAM NA VPS (< 2ms) ---
    socket.on('get_conversation_messages_cache', (data, callback) => {
      handleGetConversationCache(socket, io, data, callback);
    });

    socket.on('sync_conversation_cache', (data) => {
      handleSyncConversationCache(socket, io, data);
    });

    // --- MENSAGENS ---
    socket.on('send_message', (data) => {
      handleSendMessage(socket, io, { ...data, senderId: userId });
    });

    socket.on('edit_message', (data) => {
      handleEditMessage(socket, io, { ...data, senderId: userId });
    });

    socket.on('delete_message', (data) => {
      handleDeleteMessage(socket, io, { ...data, senderId: userId });
    });

    socket.on('clear_conversation', (data) => {
      handleClearConversation(socket, io, { ...data, userId });
    });

    socket.on('delete_conversation', (data) => {
      handleDeleteConversation(socket, io, { ...data, userId });
    });

    socket.on('pin_message', (data) => {
      handlePinMessage(socket, io, { ...data, userId });
    });

    socket.on('react_message', (data) => {
      handleReactMessage(socket, io, { ...data, userId });
    });

    socket.on('mark_as_read', (data) => {
      handleMarkAsRead(socket, io, { ...data, userId });
    });

    socket.on('mark_as_delivered', (data) => {
      handleMessageDelivered(socket, io, { ...data, deliveredToUserId: userId });
    });

    // --- MENSAGENS EFÊMERAS (AUTODESTRUIÇÃO / VISUALIZAÇÃO ÚNICA) ---
    socket.on('burn_ghost_message', (data) => {
      handleBurnGhostMessage(socket, io, data);
    });

    // --- PRESENÇA ---
    socket.on('get_online_users', () => {
      socket.emit('online_users_list', getOnlineUserIds());
    });

    // --- DESCONEXÃO ---
    socket.on('disconnect', async () => {
      console.log(`🔌 Desconexão WebSocket: ${socket.id} (User: ${userId})`);
      await userDisconnected(socket.id, io);
    });
  });
}

module.exports = {
  setupSocketIO
};
