const webpush = require('web-push');
const { createClient } = require('@supabase/supabase-js');

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || 'BO9BXkFwU2wcyrq2y447fKdKXX8uvWrxQuf9iGwnFUK0YGA6ifnRWnHVrVeCCsvkiZIwSik-9_4qFw59aR3hJyQ';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || 'qW4ou685eg6uDWy92ChVVGEjIvFRR-Llp5gMlwJslK4';
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:support@nexuschat.app';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://hlmqvbfdxiusxirtdmjn.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhsbXF2YmZkeGl1c3hpcnRkbWpuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc2Nzg5NzIsImV4cCI6MjEwMzI1NDk3Mn0.pHRJvKDgtH-lCqD4wLdvFKhyuKo33SKBEHaQ0Sn5hIY';

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

module.exports = async (req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { recipientIds = [], title = 'Nexus Chat', body = 'Nova mensagem', icon = '/belmont-logo.jpg', data = {}, senderId = null, conversationId = null } = req.body || {};

    if (!Array.isArray(recipientIds) || recipientIds.length === 0) {
      return res.status(400).json({ error: 'recipientIds array is required' });
    }

    // Filtrar para não enviar notificação para o próprio remetente
    const targetUserIds = recipientIds.filter((id) => id && id !== senderId);

    if (targetUserIds.length === 0) {
      return res.status(200).json({ success: true, sent: 0, message: 'No recipients to notify' });
    }

    // Buscar inscrições de push ativas dos destinatários no Supabase
    const { data: subscriptions, error: dbError } = await supabase
      .from('push_subscriptions')
      .select('*')
      .in('user_id', targetUserIds);

    if (dbError) {
      console.error('Error fetching push subscriptions:', dbError);
      return res.status(500).json({ error: 'Database error fetching subscriptions', details: dbError.message });
    }

    if (!subscriptions || subscriptions.length === 0) {
      return res.status(200).json({ success: true, sent: 0, message: 'No active push subscriptions found' });
    }

    const safeIcon = icon ? (icon.startsWith('http') ? icon : 'https://nexus-chat-green.vercel.app' + (icon.startsWith('/') ? icon : '/' + icon)) : 'https://nexus-chat-green.vercel.app/belmont-logo.jpg';
    const safeBadge = 'https://nexus-chat-green.vercel.app/belmont-logo.jpg';

    const payload = JSON.stringify({
      title: title || 'Nexus Chat',
      body: body || 'Nova mensagem',
      icon: safeIcon,
      badge: safeBadge,
      tag: `conv-${conversationId || Date.now()}`,
      data: {
        conversationId,
        url: '/',
        ...data
      }
    });

    let successCount = 0;
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

          await webpush.sendNotification(pushSubscription, payload, {
            TTL: 86400, // 24 horas de retenção
            urgency: 'high',
            headers: {
              Urgency: 'high'
            }
          });
          successCount++;
        } catch (pushErr) {
          if (pushErr.statusCode === 404 || pushErr.statusCode === 410) {
            // Inscrição expirada ou revogada pelo navegador
            expiredEndpoints.push(sub.endpoint);
          } else {
            console.warn('Push error for endpoint:', sub.endpoint, pushErr.message);
          }
        }
      })
    );

    // Limpar endpoints expirados do banco
    if (expiredEndpoints.length > 0) {
      await supabase.from('push_subscriptions').delete().in('endpoint', expiredEndpoints);
    }

    return res.status(200).json({
      success: true,
      sent: successCount,
      totalSubscribers: subscriptions.length,
      cleanedExpired: expiredEndpoints.length
    });
  } catch (err) {
    console.error('Unexpected error in send-push handler:', err);
    return res.status(500).json({ error: 'Internal server error', message: err.message });
  }
};
