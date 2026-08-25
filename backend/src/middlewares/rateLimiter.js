const rateLimit = require('express-rate-limit');

// Limitador geral de requisições à API
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 300, // Limite de 300 requisições por IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Muitas requisições originadas deste IP. Tente novamente mais tarde.'
  }
});

// Limitador estrito para rotas de autenticação
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 20, // Máximo 20 tentativas
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Muitas tentativas de autenticação. Por favor, aguarde alguns minutos.'
  }
});

// Limitador para envio de mensagens via API REST
const messagePostLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 60, // Máximo 60 mensagens/minuto
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Envio rápido demais. Diminua a frequência das mensagens.'
  }
});

module.exports = {
  apiLimiter,
  authLimiter,
  messagePostLimiter
};
