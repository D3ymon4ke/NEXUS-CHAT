// nexusStorage.js - Gerenciador de Armazenamento Local de Alta Performance via IndexedDB
// Permite inicialização instantânea em 0ms (Zero Loading / Zero Spinners) para conversas e histórico de mensagens.

const DB_NAME = 'nexus_chat_db';
const DB_VERSION = 1;

let dbPromise = null;

function openDB() {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return Promise.resolve(null);
  }

  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve) => {
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Tabela de Mensagens
        if (!db.objectStoreNames.contains('messages')) {
          const msgStore = db.createObjectStore('messages', { keyPath: 'id' });
          msgStore.createIndex('conversation_id', 'conversation_id', { unique: false });
          msgStore.createIndex('created_at', 'created_at', { unique: false });
        }

        // Tabela de Conversas
        if (!db.objectStoreNames.contains('conversations')) {
          db.createObjectStore('conversations', { keyPath: 'id' });
        }

        // Tabela de Perfis
        if (!db.objectStoreNames.contains('profiles')) {
          db.createObjectStore('profiles', { keyPath: 'id' });
        }
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = (err) => {
        console.warn('Aviso ao inicializar IndexedDB:', err);
        resolve(null);
      };
    } catch (err) {
      console.warn('IndexedDB indisponível:', err);
      resolve(null);
    }
  });

  return dbPromise;
}

export const nexusStorage = {
  // Salvar lote de mensagens de uma conversa
  async saveMessages(conversationId, messages) {
    if (!conversationId || !Array.isArray(messages) || messages.length === 0) return;
    const db = await openDB();
    if (!db) return;

    return new Promise((resolve) => {
      try {
        const tx = db.transaction('messages', 'readwrite');
        const store = tx.objectStore('messages');

        // Limitar a no máximo as últimas 150 mensagens por conversa no IndexedDB
        const slice = messages.slice(-150);
        for (const msg of slice) {
          if (msg && (msg.id || msg.tempId)) {
            store.put({
              ...msg,
              id: msg.id || msg.tempId,
              conversation_id: conversationId
            });
          }
        }

        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(false);
      } catch (e) {
        resolve(false);
      }
    });
  },

  // Recuperar mensagens salvas de uma conversa em 0ms
  async getMessages(conversationId, limit = 150) {
    if (!conversationId) return [];
    const db = await openDB();
    if (!db) return [];

    return new Promise((resolve) => {
      try {
        const tx = db.transaction('messages', 'readonly');
        const store = tx.objectStore('messages');
        const index = store.index('conversation_id');
        const request = index.getAll(conversationId);

        request.onsuccess = () => {
          const results = request.result || [];
          // Ordenar por created_at crescente
          results.sort((a, b) => {
            const timeA = new Date(a.created_at).getTime() || 0;
            const timeB = new Date(b.created_at).getTime() || 0;
            return timeA - timeB;
          });
          resolve(results.slice(-limit));
        };

        request.onerror = () => resolve([]);
      } catch (e) {
        resolve([]);
      }
    });
  },

  // Limpar mensagens de uma conversa específica (ex: limpar histórico)
  async clearMessages(conversationId) {
    if (!conversationId) return;
    const db = await openDB();
    if (!db) return;

    return new Promise((resolve) => {
      try {
        const tx = db.transaction('messages', 'readwrite');
        const store = tx.objectStore('messages');
        const index = store.index('conversation_id');
        const request = index.openCursor(conversationId);

        request.onsuccess = (e) => {
          const cursor = e.target.result;
          if (cursor) {
            cursor.delete();
            cursor.continue();
          } else {
            resolve(true);
          }
        };

        request.onerror = () => resolve(false);
      } catch (e) {
        resolve(false);
      }
    });
  },

  // Salvar lista de conversas
  async saveConversations(conversations) {
    if (!Array.isArray(conversations) || conversations.length === 0) return;
    const db = await openDB();
    if (!db) return;

    return new Promise((resolve) => {
      try {
        const tx = db.transaction('conversations', 'readwrite');
        const store = tx.objectStore('conversations');
        for (const conv of conversations) {
          if (conv && conv.id) {
            store.put(conv);
          }
        }
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(false);
      } catch (e) {
        resolve(false);
      }
    });
  },

  // Recuperar lista de conversas em 0ms
  async getConversations() {
    const db = await openDB();
    if (!db) return [];

    return new Promise((resolve) => {
      try {
        const tx = db.transaction('conversations', 'readonly');
        const store = tx.objectStore('conversations');
        const request = store.getAll();

        request.onsuccess = () => {
          resolve(request.result || []);
        };

        request.onerror = () => resolve([]);
      } catch (e) {
        resolve([]);
      }
    });
  },

  // Salvar perfis de usuários no cache local permanente
  async saveProfiles(profiles) {
    if (!Array.isArray(profiles) || profiles.length === 0) return;
    const db = await openDB();
    if (!db) return;

    return new Promise((resolve) => {
      try {
        const tx = db.transaction('profiles', 'readwrite');
        const store = tx.objectStore('profiles');
        for (const p of profiles) {
          if (p && p.id) {
            store.put(p);
          }
        }
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(false);
      } catch (e) {
        resolve(false);
      }
    });
  },

  // Recuperar todos os perfis em cache
  async getAllProfiles() {
    const db = await openDB();
    if (!db) return [];

    return new Promise((resolve) => {
      try {
        const tx = db.transaction('profiles', 'readonly');
        const store = tx.objectStore('profiles');
        const request = store.getAll();

        request.onsuccess = () => {
          resolve(request.result || []);
        };

        request.onerror = () => resolve([]);
      } catch (e) {
        resolve([]);
      }
    });
  }
};
