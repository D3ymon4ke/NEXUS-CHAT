import { sounds } from './sound';
import { supabase, isSupabaseConfigured } from './supabaseClient';

const STORAGE_KEY = 'nexus_notifications_enabled';
const VAPID_PUBLIC_KEY = 'BO9BXkFwU2wcyrq2y447fKdKXX8uvWrxQuf9iGwnFUK0YGA6ifnRWnHVrVeCCsvkiZIwSik-9_4qFw59aR3hJyQ';

// Utilitário para converter a chave pública VAPID base64url para Uint8Array
const urlBase64ToUint8Array = (base64String) => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

// Formatar prévia limpa para o corpo da notificação (sem JSON cru)
export const formatNotificationPreview = (content, type, attachments = []) => {
  if (type === 'nexus_burst') return '⚡ Enviou um Nexus Burst!';
  if (type === 'ghost') return '👻 Enviou uma Mensagem Fantasma';
  if (type === 'coffee_invite') return '☕ Convidou você para um café!';
  if (type === 'poll') return '📊 Criou uma nova enquete';
  if (type === 'image' || (attachments && attachments.some((a) => a.file_type === 'image'))) return '📷 Enviou uma foto';
  if (type === 'audio' || (attachments && attachments.some((a) => a.file_type === 'audio'))) return '🎵 Enviou um áudio';
  if (attachments && attachments.length > 0) return `📎 Enviou ${attachments.length} anexo(s)`;

  const raw = (content || '').trim();
  if (raw.startsWith('{') && raw.endsWith('}')) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed.nexus_burst) return '⚡ Enviou um Nexus Burst!';
      if (parsed.ghost_message) return '👻 Enviou uma Mensagem Fantasma';
      if (parsed.coffee_invite) return '☕ Convidou você para um café!';
      if (parsed.poll) return `📊 Enquete: ${parsed.poll.question || 'Nova votação'}`;
      if (parsed.text || parsed.content) return parsed.text || parsed.content;
    } catch (e) {}
  }

  // Remove markdown básico
  return raw
    .replace(/```[\s\S]*?```/g, '💻 Código')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/_([^_]+)_/g, '$1') || 'Nova mensagem recebida';
};

export const notificationService = {
  // Chave pública VAPID para Web Push
  VAPID_PUBLIC_KEY,

  // Verifica se o navegador suporta notificações
  isSupported: () => typeof window !== 'undefined' && 'Notification' in window,

  // Obtém o estado atual da permissão ('default' | 'granted' | 'denied')
  getPermission: () => {
    if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
    return Notification.permission;
  },

  // Verifica se o usuário permitiu notificações nas configurações do app
  isEnabled: () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved !== null) return JSON.parse(saved);
    } catch (e) {}
    return true; // Padrão ativado se houver permissão concedida
  },

  // Ativa ou desativa nas configurações locais
  setEnabled: (enabled) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(Boolean(enabled)));
    } catch (e) {}
  },

  // Solicita permissão ao usuário e registra Web Push Subscription
  requestPermission: async (userId = null) => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return { success: false, status: 'unsupported' };
    }

    try {
      const permission = await Notification.requestPermission();
      const isGranted = permission === 'granted';
      if (isGranted) {
        notificationService.setEnabled(true);
        if (userId) {
          await notificationService.subscribeToPush(userId);
        }
      }
      return { success: isGranted, status: permission };
    } catch (err) {
      console.warn('Erro ao solicitar permissão de notificações:', err);
      return { success: false, status: 'error', error: err.message };
    }
  },

  // Inscrever o dispositivo no Web Push Manager e salvar no Supabase
  subscribeToPush: async (userId) => {
    if (!userId || typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      return null;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      if (!registration || !registration.pushManager) return null;

      let subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey
        });
      }

      if (subscription && isSupabaseConfigured && supabase) {
        const rawKey = subscription.getKey ? subscription.getKey('p256dh') : null;
        const rawAuth = subscription.getKey ? subscription.getKey('auth') : null;

        const p256dh = rawKey ? btoa(String.fromCharCode.apply(null, new Uint8Array(rawKey))) : '';
        const auth = rawAuth ? btoa(String.fromCharCode.apply(null, new Uint8Array(rawAuth))) : '';

        // Salvar ou atualizar no banco Supabase
        await supabase
          .from('push_subscriptions')
          .upsert({
            user_id: userId,
            endpoint: subscription.endpoint,
            p256dh,
            auth,
            user_agent: navigator.userAgent,
            updated_at: new Date().toISOString()
          }, { onConflict: 'endpoint' });
      }

      return subscription;
    } catch (err) {
      console.warn('Aviso ao registrar Web Push Subscription:', err);
      return null;
    }
  },

  // Dispara uma notificação nativa local
  sendNotification: async ({
    title = 'Nexus Chat',
    body = 'Nova mensagem',
    icon = '/belmont-logo.jpg',
    badge = '/belmont-logo.jpg',
    tag = 'nexus-chat-message',
    conversationId = null,
    onClick = null
  }) => {
    if (!notificationService.isSupported()) return;
    if (Notification.permission !== 'granted') return;
    if (!notificationService.isEnabled()) return;

    try {
      // 1. Tentar via Service Worker (Melhor suporte em PWA e mobile)
      if ('serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.ready;
          if (registration && registration.showNotification) {
            await registration.showNotification(title, {
              body,
              icon: icon || '/belmont-logo.jpg',
              badge: badge || '/belmont-logo.jpg',
              tag: tag || `conv-${conversationId || Date.now()}`,
              renotify: true,
              data: {
                conversationId,
                url: '/'
              },
              vibrate: [100, 50, 100]
            });
            return;
          }
        } catch (swErr) {
          console.warn('Fallback para Notification API padrão:', swErr);
        }
      }

      // 2. Fallback para Notification API nativa direta
      const notif = new Notification(title, {
        body,
        icon: icon || '/belmont-logo.jpg',
        badge: badge || '/belmont-logo.jpg',
        tag: tag || `conv-${conversationId || Date.now()}`
      });

      notif.onclick = () => {
        window.focus();
        if (typeof onClick === 'function') {
          onClick();
        }
        notif.close();
      };
    } catch (err) {
      console.warn('Aviso ao exibir notificação:', err);
    }
  },

  // Disparar Web Push pelo Servidor Vercel (/api/send-push) para destinatários
  sendServerPush: async ({ recipientIds = [], title, body, icon, data = {}, senderId = null, conversationId = null }) => {
    if (!Array.isArray(recipientIds) || recipientIds.length === 0) return;
    try {
      fetch('/api/send-push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientIds,
          title,
          body,
          icon: icon || '/belmont-logo.jpg',
          data,
          senderId,
          conversationId
        })
      }).catch((err) => {
        console.warn('Aviso ao disparar Web Push no servidor:', err);
      });
    } catch (e) {}
  },

  // Testar notificação
  testNotification: async () => {
    const perm = await notificationService.requestPermission();
    if (perm.success) {
      sounds.playReceive?.();
      await notificationService.sendNotification({
        title: '✨ Nexus Chat Notificações',
        body: 'As notificações em segundo plano e Web Push estão ativadas e funcionando com sucesso!',
        tag: 'test-notification'
      });
      return true;
    }
    return false;
  }
};

