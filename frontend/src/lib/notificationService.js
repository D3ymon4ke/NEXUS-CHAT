// Serviço Central de Notificações do Navegador / Push Notification Service
import { sounds } from './sound';

const STORAGE_KEY = 'nexus_notifications_enabled';

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

  // Solicita permissão ao usuário
  requestPermission: async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return { success: false, status: 'unsupported' };
    }

    try {
      const permission = await Notification.requestPermission();
      const isGranted = permission === 'granted';
      if (isGranted) {
        notificationService.setEnabled(true);
      }
      return { success: isGranted, status: permission };
    } catch (err) {
      console.warn('Erro ao solicitar permissão de notificações:', err);
      return { success: false, status: 'error', error: err.message };
    }
  },

  // Dispara uma notificação nativa
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

  // Testar notificação
  testNotification: async () => {
    const perm = await notificationService.requestPermission();
    if (perm.success) {
      sounds.playReceive?.();
      await notificationService.sendNotification({
        title: '✨ Nexus Chat Notificações',
        body: 'As notificações em segundo plano estão ativadas e funcionando com sucesso!',
        tag: 'test-notification'
      });
      return true;
    }
    return false;
  }
};
