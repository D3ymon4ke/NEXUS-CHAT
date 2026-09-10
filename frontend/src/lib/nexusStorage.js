// nexusStorage.js - Gerenciador de Armazenamento Local de Alta Performance via IndexedDB
// Permite inicialização instantânea em 0ms (Zero Loading), Full-Text Search de Mensagens/Mídias e Fila Offline (Outbox).

const DB_NAME = 'nexus_chat_db';
const DB_VERSION = 2;

let dbPromise = null;

function normalizeText(str) {
  if (!str || typeof str !== 'string') return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

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
        let msgStore;
        if (!db.objectStoreNames.contains('messages')) {
          msgStore = db.createObjectStore('messages', { keyPath: 'id' });
          msgStore.createIndex('conversation_id', 'conversation_id', { unique: false });
          msgStore.createIndex('created_at', 'created_at', { unique: false });
        } else {
          msgStore = event.target.transaction.objectStore('messages');
        }

        if (msgStore && !msgStore.indexNames.contains('type')) {
          try {
            msgStore.createIndex('type', 'type', { unique: false });
          } catch (e) {}
        }

        // Tabela de Conversas
        if (!db.objectStoreNames.contains('conversations')) {
          db.createObjectStore('conversations', { keyPath: 'id' });
        }

        // Tabela de Perfis
        if (!db.objectStoreNames.contains('profiles')) {
          db.createObjectStore('profiles', { keyPath: 'id' });
        }

        // Tabela Outbox para Mensagens Offline Pendentes
        if (!db.objectStoreNames.contains('outbox')) {
          const outboxStore = db.createObjectStore('outbox', { keyPath: 'tempId' });
          outboxStore.createIndex('created_at', 'created_at', { unique: false });
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
  // Salvar mensagem individual em tempo real
  async saveMessage(message) {
    if (!message || (!message.id && !message.tempId)) return;
    const db = await openDB();
    if (!db) return;

    return new Promise((resolve) => {
      try {
        const tx = db.transaction('messages', 'readwrite');
        const store = tx.objectStore('messages');
        store.put({
          ...message,
          id: message.id || message.tempId
        });
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(false);
      } catch (e) {
        resolve(false);
      }
    });
  },

  // Salvar lote de mensagens de uma conversa
  async saveMessages(conversationId, messages) {
    if (!conversationId || !Array.isArray(messages) || messages.length === 0) return;
    const db = await openDB();
    if (!db) return;

    return new Promise((resolve) => {
      try {
        const tx = db.transaction('messages', 'readwrite');
        const store = tx.objectStore('messages');

        // Manter as últimas 250 mensagens por conversa no IndexedDB para busca aprofundada
        const slice = messages.slice(-250);
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
  async getMessages(conversationId, limit = 200) {
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

  // Motor de Full-Text Search de Mensagens e Mídias no IndexedDB
  async searchMessages(query, { conversationId = null, type = 'all', limit = 60 } = {}) {
    const db = await openDB();
    if (!db) return [];

    const normQuery = normalizeText(query);
    const hasQuery = normQuery.length > 0;

    return new Promise((resolve) => {
      try {
        const tx = db.transaction('messages', 'readonly');
        const store = tx.objectStore('messages');

        let request;
        if (conversationId) {
          const index = store.index('conversation_id');
          request = index.getAll(conversationId);
        } else {
          request = store.getAll();
        }

        request.onsuccess = () => {
          const allMsgs = request.result || [];
          const matches = [];

          for (let i = allMsgs.length - 1; i >= 0; i--) {
            if (matches.length >= limit) break;
            const msg = allMsgs[i];
            if (!msg || msg.is_deleted) continue;

            const isImage = msg.type === 'image' || (msg.attachments && msg.attachments.some(a => a.file_type === 'image' || (a.file_url && a.file_url.match(/\.(jpeg|jpg|png|webp|gif)/i))));
            const isFile = msg.attachments && msg.attachments.length > 0 && !isImage;

            // Filtro por tipo
            if (type === 'image' && !isImage) continue;
            if (type === 'file' && !isFile) continue;
            if (type === 'text' && (isImage || isFile)) continue;

            // Se for busca apenas por tipo (ex: galeria de fotos) e sem query de texto
            if (!hasQuery) {
              if (type === 'image' || type === 'file') {
                matches.push({
                  ...msg,
                  snippet: msg.content || (isImage ? 'Foto' : 'Arquivo')
                });
              }
              continue;
            }

            // Pesquisa de texto com normalização
            const contentNorm = normalizeText(msg.content);
            let matched = contentNorm.includes(normQuery);

            // Verificar nomes de anexos
            if (!matched && msg.attachments && msg.attachments.length > 0) {
              matched = msg.attachments.some(att => {
                const nameNorm = normalizeText(att.file_name || att.name);
                return nameNorm.includes(normQuery);
              });
            }

            if (matched) {
              // Gerar snippet de contexto destacável
              let snippet = msg.content || '';
              if (snippet.length > 120) {
                const idx = contentNorm.indexOf(normQuery);
                const start = Math.max(0, idx - 40);
                const end = Math.min(snippet.length, idx + normQuery.length + 60);
                snippet = (start > 0 ? '...' : '') + snippet.slice(start, end) + (end < snippet.length ? '...' : '');
              }

              matches.push({
                ...msg,
                snippet: snippet || (isImage ? '📷 Foto enviada' : '📎 Anexo'),
                isImageMatch: isImage,
                isFileMatch: isFile
              });
            }
          }

          resolve(matches);
        };

        request.onerror = () => resolve([]);
      } catch (e) {
        resolve([]);
      }
    });
  },

  // Recuperar todas as mídias/fotos salvas no IndexedDB
  async getMediaMessages(conversationId = null, limit = 80) {
    return this.searchMessages('', { conversationId, type: 'image', limit });
  },

  // Fila Offline (Outbox): Salvar mensagem pendente
  async saveOutboxMessage(msg) {
    if (!msg || !msg.tempId) return false;
    const db = await openDB();
    if (!db) return false;

    return new Promise((resolve) => {
      try {
        const tx = db.transaction('outbox', 'readwrite');
        const store = tx.objectStore('outbox');
        store.put({
          ...msg,
          queued_at: new Date().toISOString()
        });
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(false);
      } catch (e) {
        resolve(false);
      }
    });
  },

  // Fila Offline (Outbox): Recuperar mensagens pendentes
  async getOutboxMessages() {
    const db = await openDB();
    if (!db) return [];

    return new Promise((resolve) => {
      try {
        const tx = db.transaction('outbox', 'readonly');
        const store = tx.objectStore('outbox');
        const request = store.getAll();

        request.onsuccess = () => {
          const results = request.result || [];
          results.sort((a, b) => new Date(a.created_at || a.queued_at) - new Date(b.created_at || b.queued_at));
          resolve(results);
        };

        request.onerror = () => resolve([]);
      } catch (e) {
        resolve([]);
      }
    });
  },

  // Fila Offline (Outbox): Remover mensagem transmitida com sucesso
  async removeOutboxMessage(tempId) {
    if (!tempId) return;
    const db = await openDB();
    if (!db) return;

    return new Promise((resolve) => {
      try {
        const tx = db.transaction('outbox', 'readwrite');
        const store = tx.objectStore('outbox');
        store.delete(tempId);
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(false);
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
        store.clear();
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
          const list = request.result || [];
          const map = new Map();
          for (const c of list) {
            if (c && c.id && !map.has(c.id)) {
              map.set(c.id, c);
            }
          }
          resolve(Array.from(map.values()));
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
