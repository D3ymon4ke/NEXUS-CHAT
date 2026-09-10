const webpush = require('web-push');
const { supabase, isConfigured } = require('../config/supabase');
const { isUserOnline } = require('../socket/presence');

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || 'BO9BXkFwU2wcyrq2y447fKdKXX8uvWrxQuf9iGwnFUK0YGA6ifnRWnHVrVeCCsvkiZIwSik-9_4qFw59aR3hJyQ';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || 'qW4ou685eg6uDWy92ChVVGEjIvFRR-Llp5gMlwJslK4';
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:support@nexuschat.app';

try {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
} catch (err) {
  console.warn('Erro ao configurar VAPID details no pushService:', err.message);
}

/**
 * Formata um preview limpo para a notificação push
 */
function formatPushBody(message) {
  if (!message) return 'Nova mensagem';

  if (message.type === 'ghost' || (message.content && message.content.includes('"ghost_message"'))) {
    return '👻 Enviou uma Mensagem Fantasma';
  }
  if (message.type === 'nexus_burst' || (message.content && message.content.includes('"nexus_burst"'))) {
    return '⚡ Enviou um Nexus Burst!';
  }
  if (message.type === 'coffee_invite' || (message.content && message.content.includes('"coffee_invite"'))) {
    return '☕ Convidou você para um café!';
  }
  if (message.type === 'image' || (message.attachments && message.attachments.some(a => a.file_type === 'image'))) {
    return '📷 Enviou uma foto';
  }
  if (message.attachments && message.attachments.length > 0) {
    return `📎 Enviou ${message.attachments.length} anexo(s)`;
  }

  const raw = (message.content || '').trim();
  if (raw.startsWith('{') && raw.endsWith('}')) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed.ghost_message) return '👻 Enviou uma Mensagem Fantasma';
      if (parsed.text || parsed.content) return parsed.text || parsed.content;
    } catch (e) {}
  }

  return raw.slice(0, 140) || 'Nova mensagem recebida';
}

/**
 * Envia uma notificação Web Push para uma lista de usuários
 */
async function sendPushToUsers(userIds, pushPayload) {
  if (!Array.isArray(userIds) || userIds.length === 0 || !isConfigured || !supabase) {
    return { sent: 0, failed: 0 };
  }

  try {
    // Busca inscrições ativas dos usuários no Supabase
    const { data: subscriptions, error: dbErr } = await supabase
      .from('push_subscriptions')
      .select('*')
      .in('user_id', userIds);

    if (dbErr || !subscriptions || subscriptions.length === 0) {
      return { sent: 0, failed: 0 };
    }

    const payloadString = typeof pushPayload === 'string' ? pushPayload : JSON.stringify(pushPayload);

    let sent = 0;
    let failed = 0;
    const expiredEndpoints = [];

    await Promise.allSettled(
      subscriptions.map(async (sub) => {
        try {
          const pushSubscription = {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth
            }
          };

          await webpush.sendNotification(pushSubscription, payloadString, {
            TTL: 86400, // 24h
            urgency: 'high'
          });

          sent++;
        } catch (pushErr) {
          failed++;
          // Endpoint expirou ou foi revogado
          if (pushErr.statusCode === 410 || pushErr.statusCode === 404) {
            expiredEndpoints.push(sub.endpoint);
          }
        }
      })
    );

    // Remove inscrições expiradas para manter o banco enxuto
    if (expiredEndpoints.length > 0) {
      await supabase
        .from('push_subscriptions')
        .delete()
        .in('endpoint', expiredEndpoints);
    }

    return { sent, failed };
  } catch (err) {
    console.error('Erro em sendPushToUsers:', err);
    return { sent: 0, failed: 0, error: err.message };
  }
}

/**
 * Dispara automaticamente notificação push para os participantes offline da conversa
 */
async function sendPushForNewMessage(conversationId, message, senderId) {
  if (!conversationId || !message || !isConfigured || !supabase) return;

  try {
    // Busca participantes da conversa
    const { data: participants, error: pErr } = await supabase
      .from('conversation_participants')
      .select('user_id')
      .eq('conversation_id', conversationId);

    if (pErr || !participants || participants.length === 0) return;

    // Filtra participantes que não são o remetente e que estão OFFLINE
    const offlineRecipients = participants
      .map(p => p.user_id)
      .filter(uid => uid && uid !== senderId && !isUserOnline(uid));

    if (offlineRecipients.length === 0) return;

    const senderName = message.sender?.display_name || message.sender?.username || 'Nexus Chat';
    const body = formatPushBody(message);
    const icon = message.sender?.avatar_url || '/belmont-logo.jpg';

    const payload = {
      title: senderName,
      body,
      icon,
      badge: '/belmont-logo.jpg',
      tag: `conv-${conversationId}`,
      data: {
        conversationId,
        url: '/'
      }
    };

    console.log(`📲 [Push] Disparando Web Push da VPS para ${offlineRecipients.length} usuário(s) offline...`);
    await sendPushToUsers(offlineRecipients, payload);

  } catch (err) {
    console.error('Erro em sendPushForNewMessage:', err);
  }
}

module.exports = {
  sendPushToUsers,
  sendPushForNewMessage,
  formatPushBody
};
