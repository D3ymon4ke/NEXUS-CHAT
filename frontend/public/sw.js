const CACHE_NAME = 'nexus-chat-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
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

// Suporte para Web Push Event
self.addEventListener('push', (event) => {
  if (!event.data) return;
  try {
    const data = event.data.json();
    const title = data.title || 'Nexus Chat';
    const options = {
      body: data.body || 'Nova mensagem recebida',
      icon: data.icon || '/belmont-logo.jpg',
      badge: data.badge || '/belmont-logo.jpg',
      tag: data.tag || 'nexus-push-message',
      data: data.data || {},
      vibrate: [100, 50, 100]
    };
    event.waitUntil(self.registration.showNotification(title, options));
  } catch (err) {
    const text = event.data.text();
    event.waitUntil(
      self.registration.showNotification('Nexus Chat', {
        body: text,
        icon: '/belmont-logo.jpg'
      })
    );
  }
});

