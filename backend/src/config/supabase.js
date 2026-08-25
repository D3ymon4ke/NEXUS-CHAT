const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Polyfill de WebSocket para compatibilidade com Node.js 18/20
try {
  if (typeof globalThis.WebSocket === 'undefined') {
    globalThis.WebSocket = require('ws');
  }
} catch (e) {
  // Ignora se ws não estiver disponível
}

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const isConfigured = supabaseUrl && 
  supabaseServiceKey && 
  !supabaseUrl.includes('your-supabase-project') && 
  !supabaseServiceKey.includes('your-supabase');

let supabase = null;

if (isConfigured) {
  supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    realtime: {
      params: {
        eventsPerSecond: 10
      }
    }
  });
  console.log('✅ Supabase Client conectado com sucesso.');
} else {
  console.warn('⚠️ Supabase URL ou Service Key não configurados. Usando modo de fallback em memória / simulado para desenvolvimento.');
}

module.exports = {
  supabase,
  isConfigured
};
