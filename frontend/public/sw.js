const CACHE_NAME = 'nexus-chat-v3';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// Listener para forçar atualização instantânea a partir do app
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  // Pass-through fetch
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request);
    })
  );
});

// Manipulador de clique em notificações recebidas
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Se já houver uma aba aberta, foca nela
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          if (event.notification.data?.conversationId) {
            client.postMessage({
              type: 'OPEN_CONVERSATION',
              conversationId: event.notification.data.conversationId
            });
          }
          return client.focus();
        }
      }
      // Se não houver aba aberta, abre uma nova
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

// Suporte para Web Push Event em segundo plano e com app fechado
self.addEventListener('push', (event) => {
  let title = 'Nexus Chat';
  const defaultIcon = self.location.origin + '/belmont-logo.jpg';
  let options = {
    body: 'Nova mensagem recebida',
    icon: defaultIcon,
    badge: defaultIcon,
    tag: 'nexus-push-message',
    vibrate: [150, 75, 150],
    data: { url: '/' }
  };

  if (event.data) {
    try {
      const data = event.data.json();
      if (data.title) title = data.title;
      if (data.body) options.body = data.body;
      if (data.icon) {
        options.icon = data.icon.startsWith('http') ? data.icon : self.location.origin + (data.icon.startsWith('/') ? data.icon : '/' + data.icon);
      }
      if (data.badge) {
        options.badge = data.badge.startsWith('http') ? data.badge : self.location.origin + (data.badge.startsWith('/') ? data.badge : '/' + data.badge);
      }
      if (data.tag) options.tag = data.tag;
      if (data.data) options.data = data.data;
    } catch (jsonErr) {
      try {
        options.body = event.data.text();
      } catch (textErr) {}
    }
  }

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

