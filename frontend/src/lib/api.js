import { supabase, isSupabaseConfigured } from './supabaseClient';

const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';

const API_BASE_URL = 
  import.meta.env.VITE_API_URL || 
  import.meta.env.NEXT_PUBLIC_API_URL || 
  (isHttps ? '/api' : 'http://187.127.40.228:5000/api');

const BELMONT_ID = '00000000-0000-0000-0000-000000000001';

/**
 * Utilitário para chamadas à API com token JWT automático e fallback direto no Supabase
 */
export async function apiRequest(endpoint, options = {}) {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${API_BASE_URL}${cleanEndpoint}`;

  let token = null;
  let currentUser = null;

  if (isSupabaseConfigured && supabase) {
    const sessionRes = await supabase.auth.getSession();
    const session = sessionRes.data.session;
    token = session?.access_token;
    currentUser = session?.user;
  } else {
    token = localStorage.getItem('demo_auth_token') || 'demo-jwt-token';
  }

  const headers = {
    ...(options.headers || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  // Tenta realizar requisição HTTP
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const response = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      return data;
    }
  } catch (httpError) {
    // Continua para o fallback inteligente via Supabase
  }

  // --- FALLBACK DIRETO VIA SUPABASE CLIENT (HTTPS Nativo) ---
  if (isSupabaseConfigured && supabase && currentUser) {
    try {
      // 1. /auth/me
      if (cleanEndpoint === '/auth/me') {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', currentUser.id)
          .single();

        return { success: true, user: profile };
      }

      // 2. /conversations
      if (cleanEndpoint === '/conversations') {
        // Garantir que Belmont Conference sempre retorne
        const belmontRoom = {
          id: BELMONT_ID,
          type: 'group',
          name: 'BELMONT CONFERENCE',
          description: 'Sala principal oficial, permanente e aberta para todos os membros.',
          avatar_url: '/belmont-logo.jpg',
          is_permanent: true,
          unread_count: 0,
          last_message: {
            content: 'Bem-vindo à Belmont Conference! 👑',
            created_at: new Date().toISOString()
          }
        };

        const { data: participants } = await supabase
          .from('conversation_participants')
          .select('conversation_id, conversations(*)')
          .eq('user_id', currentUser.id);

        const convs = (participants || [])
          .map(p => p.conversations)
          .filter(Boolean);

        const hasBelmont = convs.some(c => c.id === BELMONT_ID);
        const list = hasBelmont ? convs : [belmontRoom, ...convs];

        return {
          success: true,
          conversations: list.map(c => ({
            ...c,
            avatar_url: c.id === BELMONT_ID ? '/belmont-logo.jpg' : c.avatar_url
          }))
        };
      }

      // 3. /conversations/:id/messages
      if (cleanEndpoint.includes('/messages')) {
        const parts = cleanEndpoint.split('/');
        const convId = parts[2];

        const { data: messages } = await supabase
          .from('messages')
          .select('*, sender:profiles(*), attachments:message_attachments(*), reactions:message_reactions(*)')
          .eq('conversation_id', convId)
          .order('created_at', { ascending: true })
          .limit(100);

        return { success: true, messages: messages || [] };
      }

      // 4. /economy/shop
      if (cleanEndpoint === '/economy/shop') {
        const { data: profile } = await supabase
          .from('profiles')
          .select('nexus_coins, daily_streak, last_daily_claim, equipped_frame, equipped_bubble, equipped_badge, equipped_name_color, unlocked_items')
          .eq('id', currentUser.id)
          .single();

        return {
          success: true,
          userEconomy: {
            coins: profile?.nexus_coins || 100,
            dailyStreak: profile?.daily_streak || 0,
            lastDailyClaim: profile?.last_daily_claim || null,
            equippedFrame: profile?.equipped_frame || 'default',
            equippedBubble: profile?.equipped_bubble || 'default',
            equippedBadge: profile?.equipped_badge || 'none',
            equippedNameColor: profile?.equipped_name_color || 'default',
            unlockedItems: profile?.unlocked_items || ['frame_default', 'bubble_default']
          }
        };
      }

      // 5. /wallet
      if (cleanEndpoint === '/wallet') {
        const [
          { data: profile },
          { data: transactions }
        ] = await Promise.all([
          supabase.from('profiles').select('nexus_coins, daily_streak, last_daily_claim').eq('id', currentUser.id).single(),
          supabase.from('nexus_transactions').select('*').eq('user_id', currentUser.id).order('created_at', { ascending: false }).limit(20)
        ]);

        const totalEarned = (transactions || []).filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0);

        return {
          success: true,
          wallet: {
            balance: profile?.nexus_coins || 100,
            dailyStreak: profile?.daily_streak || 0,
            lastDailyClaim: profile?.last_daily_claim || null,
            totalEarned,
            transactions: transactions || []
          }
        };
      }
    } catch (supaErr) {
      console.error('Erro no fallback Supabase:', supaErr);
    }
  }

  return {
    success: false,
    error: 'Servidor temporariamente indisponível.',
  };
}
