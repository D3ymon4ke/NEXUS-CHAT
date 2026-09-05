import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

// Registro e auto-atualização contínua do Service Worker para PWA (Mobile e Desktop)
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js', { updateViaCache: 'none' })
      .then((registration) => {
        // 1. Verificar atualizações a cada 10 minutos
        setInterval(() => {
          registration.update().catch(() => {});
        }, 10 * 60 * 1000);

        // 2. Verificar atualização sempre que o app voltar ao primeiro plano (celular desbloqueado ou aba focada)
        const checkForUpdate = () => {
          if (document.visibilityState === 'visible') {
            registration.update().catch(() => {});
          }
        };

        document.addEventListener('visibilitychange', checkForUpdate);
        window.addEventListener('focus', checkForUpdate);

        // 3. Quando uma nova versão for encontrada, instrui a ativação imediata
        registration.addEventListener('updatefound', () => {
          const installingWorker = registration.installing;
          if (installingWorker) {
            installingWorker.addEventListener('statechange', () => {
              if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // Nova versão pronta: ativa imediatamente
                installingWorker.postMessage({ type: 'SKIP_WAITING' });
              }
            });
          }
        });
      })
      .catch((err) => {
        console.log('SW registration skipped:', err);
      });

    // 4. Quando o novo Service Worker assumir o controle, recarrega suavemente
    let isRefreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!isRefreshing) {
        isRefreshing = true;
        window.location.reload();
      }
    });
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
