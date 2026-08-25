const { supabase, isConfigured } = require('../config/supabase');
const jwt = require('jsonwebtoken');

/**
 * Middleware para validar o token JWT do Supabase nas requisições HTTP
 */
async function authenticateUser(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Token de autenticação não fornecido ou formato inválido.'
      });
    }

    const token = authHeader.split(' ')[1];

    if (isConfigured && supabase) {
      // Validar token via Supabase Auth API
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (error || !user) {
        return res.status(401).json({
          success: false,
          error: 'Sessão inválida ou expirada.'
        });
      }
      req.user = user;
      return next();
    } else {
      // Modo local/fallback
      try {
        const decoded = jwt.decode(token);
        req.user = decoded || { id: 'mock-user-id', email: 'demo@chat.local' };
        return next();
      } catch (err) {
        req.user = { id: 'demo-user-id', email: 'demo@chat.local' };
        return next();
      }
    }
  } catch (error) {
    console.error('Erro no middleware de autenticação:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro interno ao validar autenticação.'
    });
  }
}

/**
 * Validação de token para conexão de WebSocket (Socket.IO)
 */
async function authenticateSocket(socket, next) {
  try {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace('Bearer ', '');
    
    if (!token) {
      // Se estiver em modo demo, permite conexão com dados mock
      if (!isConfigured) {
        const userId = socket.handshake.auth?.userId || 'demo-user-' + Math.random().toString(36).substring(2, 7);
        const username = socket.handshake.auth?.username || 'Usuário Demo';
        socket.user = { id: userId, email: `${userId}@chat.local`, user_metadata: { username, display_name: username } };
        return next();
      }
      return next(new Error('Token de autenticação obrigatório.'));
    }

    if (isConfigured && supabase) {
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (error || !user) {
        return next(new Error('Token de autenticação inválido ou expirado.'));
      }
      socket.user = user;
      return next();
    } else {
      const decoded = jwt.decode(token) || {};
      socket.user = {
        id: decoded.sub || socket.handshake.auth?.userId || 'demo-user',
        email: decoded.email || 'demo@chat.local',
        user_metadata: decoded.user_metadata || {
          username: socket.handshake.auth?.username || 'Usuário Demo',
          display_name: socket.handshake.auth?.displayName || 'Usuário Demo'
        }
      };
      return next();
    }
  } catch (err) {
    return next(new Error('Falha na autenticação do socket: ' + err.message));
  }
}

module.exports = {
  authenticateUser,
  authenticateSocket
};
