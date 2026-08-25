const { supabase, isConfigured } = require('../config/supabase');

// Mapeamento em memória: userId -> Set de socketIds
const onlineUsers = new Map();
// Mapeamento: socketId -> userId
const socketToUser = new Map();

/**
 * Registra um usuário como online
 */
async function userConnected(userId, socketId, io) {
  if (!userId) return;

  if (!onlineUsers.has(userId)) {
    onlineUsers.set(userId, new Set());
    
    // Se for a primeira conexão deste usuário, atualiza no Supabase e emite evento
    if (isConfigured && supabase) {
      try {
        await supabase
          .from('profiles')
          .update({ is_online: true, last_seen: new Date().toISOString() })
          .eq('id', userId);
      } catch (err) {
        console.error('Erro ao atualizar status online no Supabase:', err);
      }
    }

    // Emite para todos os clientes conectados que o usuário está online
    io.emit('user_status_change', {
      userId,
      isOnline: true,
      lastSeen: new Date().toISOString()
    });
  }

  onlineUsers.get(userId).add(socketId);
  socketToUser.set(socketId, userId);
  console.log(`👤 Usuário conectado: ${userId} (Sockets ativos: ${onlineUsers.get(userId).size})`);
}

/**
 * Trata desconexão do socket do usuário
 */
async function userDisconnected(socketId, io) {
  const userId = socketToUser.get(socketId);
  if (!userId) return;

  socketToUser.delete(socketId);

  if (onlineUsers.has(userId)) {
    const userSockets = onlineUsers.get(userId);
    userSockets.delete(socketId);

    // Se não restou nenhum socket ativo para esse usuário, ele está offline
    if (userSockets.size === 0) {
      onlineUsers.delete(userId);
      const lastSeen = new Date().toISOString();

      if (isConfigured && supabase) {
        try {
          await supabase
            .from('profiles')
            .update({ is_online: false, last_seen: lastSeen })
            .eq('id', userId);
        } catch (err) {
          console.error('Erro ao atualizar status offline no Supabase:', err);
        }
      }

      io.emit('user_status_change', {
        userId,
        isOnline: false,
        lastSeen
      });

      console.log(`💤 Usuário offline: ${userId}`);
    }
  }
}

/**
 * Retorna a lista de IDs de usuários atualmente online
 */
function getOnlineUserIds() {
  return Array.from(onlineUsers.keys());
}

/**
 * Verifica se um usuário específico está online
 */
function isUserOnline(userId) {
  return onlineUsers.has(userId);
}

module.exports = {
  userConnected,
  userDisconnected,
  getOnlineUserIds,
  isUserOnline
};
