const { sendPushToUsers } = require('../services/pushService');

/**
 * Controller para disparo de Web Push via endpoint REST da VPS
 */
async function sendPush(req, res) {
  try {
    const {
      recipientIds = [],
      title = 'Nexus Chat',
      body = 'Nova mensagem',
      icon = '/belmont-logo.jpg',
      data = {},
      senderId = null,
      conversationId = null
    } = req.body || {};

    if (!Array.isArray(recipientIds) || recipientIds.length === 0) {
      return res.status(400).json({ success: false, error: 'recipientIds é obrigatório.' });
    }

    const targetUserIds = recipientIds.filter(id => id && id !== senderId);

    if (targetUserIds.length === 0) {
      return res.json({ success: true, sent: 0, message: 'Nenhum destinatário válido.' });
    }

    const payload = {
      title: title || 'Nexus Chat',
      body: body || 'Nova mensagem',
      icon: icon || '/belmont-logo.jpg',
      badge: '/belmont-logo.jpg',
      tag: `conv-${conversationId || Date.now()}`,
      data: {
        conversationId,
        url: '/',
        ...data
      }
    };

    const result = await sendPushToUsers(targetUserIds, payload);

    return res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Erro em sendPush controller:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

module.exports = {
  sendPush
};
