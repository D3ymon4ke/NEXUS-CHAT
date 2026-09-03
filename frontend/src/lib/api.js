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

      // 2. /conversations (Enriquecido com direct_user e last_message)
      if (cleanEndpoint === '/conversations') {
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

        // 1. Obter IDs das conversas das quais o usuário participa
        const { data: myParticipations } = await supabase
          .from('conversation_participants')
          .select('conversation_id, role, unread_count, is_muted')
          .eq('user_id', currentUser.id);

        const convIds = (myParticipations || []).map(p => p.conversation_id);
        if (!convIds.includes(BELMONT_ID)) {
          convIds.push(BELMONT_ID);
        }

        // 2. Buscar todas as conversas e todos os participantes com seus perfis
        const { data: rawConvs } = await supabase
          .from('conversations')
          .select(`
            *,
            conversation_participants (
              user_id,
              role,
              profiles (
                id,
                username,
                display_name,
                avatar_url,
                is_online,
                last_seen,
                status_message
              )
            )
          `)
          .in('id', convIds);

        // 3. Enriquecer com direct_user e last_message
        const enriched = await Promise.all(
          (rawConvs || []).map(async (conv) => {
            const isBelmont = conv.id === BELMONT_ID || conv.is_permanent;

            let directUser = null;
            if (conv.type === 'direct') {
              const otherPart = conv.conversation_participants?.find(p => p.user_id !== currentUser.id);
              directUser = otherPart?.profiles || null;
            }

            // Buscar última mensagem
            const { data: lastMsg } = await supabase
              .from('messages')
              .select(`
                id, content, type, sender_id, created_at, is_edited, is_deleted,
                sender:profiles(id, display_name, username, avatar_url)
              `)
              .eq('conversation_id', conv.id)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle();

            const myPart = myParticipations?.find(p => p.conversation_id === conv.id);

            return {
              ...conv,
              name: isBelmont ? 'BELMONT CONFERENCE' : conv.name,
              avatar_url: isBelmont ? '/belmont-logo.jpg' : (conv.type === 'direct' ? directUser?.avatar_url : conv.avatar_url),
              direct_user: directUser,
              last_message: lastMsg || null,
              unread_count: myPart?.unread_count || 0
            };
          })
        );

        // Ordenar com Belmont sempre no topo e depois pela mensagem mais recente
        enriched.sort((a, b) => {
          if (a.id === BELMONT_ID) return -1;
          if (b.id === BELMONT_ID) return 1;
          const timeA = a.last_message ? new Date(a.last_message.created_at).getTime() : 0;
          const timeB = b.last_message ? new Date(b.last_message.created_at).getTime() : 0;
          return timeB - timeA;
        });

        const hasBelmont = enriched.some(c => c.id === BELMONT_ID);
        const finalList = hasBelmont ? enriched : [belmontRoom, ...enriched];

        return {
          success: true,
          conversations: finalList
        };
      }

      // 3. /conversations/:id/messages
      if (cleanEndpoint.includes('/messages')) {
        const parts = cleanEndpoint.split('/');
        const convId = parts[2];

        const { data: rawMessages } = await supabase
          .from('messages')
          .select('*, sender:profiles(*), attachments:message_attachments(*), reactions:message_reactions(*)')
          .eq('conversation_id', convId)
          .order('created_at', { ascending: true })
          .limit(200);

        const messages = rawMessages || [];
        const msgMap = new Map();
        messages.forEach((m) => msgMap.set(m.id, m));

        const resolved = messages.map((m) => {
          let replyTo = m.reply_to;
          if (!replyTo && m.reply_to_id && msgMap.has(m.reply_to_id)) {
            const target = msgMap.get(m.reply_to_id);
            replyTo = {
              id: target.id,
              content: target.content,
              sender: target.sender
            };
          }
          return { ...m, reply_to: replyTo || null };
        });

        return { success: true, messages: resolved };
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
          supabase.from('nexus_transactions').select('*').eq('user_id', currentUser.id).order('created_at', { ascending: false }).limit(30)
        ]);

        const totalEarned = (transactions || []).filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0);

        return {
          success: true,
          wallet: {
            balance: profile?.nexus_coins ?? 100,
            dailyStreak: profile?.daily_streak || 0,
            lastDailyClaim: profile?.last_daily_claim || null,
            totalEarned,
            transactions: transactions || []
          }
        };
      }

      // 5.1 /wallet/transfer (Transferência de Nexus Coins entre Usuários)
      if (cleanEndpoint === '/wallet/transfer' && options.method === 'POST') {
        const body = typeof options.body === 'string' ? JSON.parse(options.body) : (options.body || {});
        const targetUsername = (body.targetUsername || '').trim().replace(/^@/, '');
        const amount = parseInt(body.amount, 10);

        if (!targetUsername) {
          return { success: false, error: 'Informe o @username do destinatário.' };
        }

        if (isNaN(amount) || amount <= 0) {
          return { success: false, error: 'Informe uma quantidade válida de moedas (mínimo 1).' };
        }

        // Tentar via Postgres RPC 'transfer_nexus_coins' se disponível
        try {
          const { data: rpcRes, error: rpcErr } = await supabase.rpc('transfer_nexus_coins', {
            p_recipient_username: targetUsername,
            p_amount: amount
          });
          if (!rpcErr && rpcRes) {
            return rpcRes;
          }
        } catch (rpcEx) {
          // Segue para fallback direto em JavaScript
        }

        // 1. Obter saldo atual do remetente
        const { data: senderProfile, error: senderErr } = await supabase
          .from('profiles')
          .select('id, username, display_name, nexus_coins')
          .eq('id', currentUser.id)
          .single();

        if (senderErr || !senderProfile) {
          return { success: false, error: 'Erro ao verificar saldo do remetente.' };
        }

        const senderCoins = senderProfile.nexus_coins ?? 0;
        if (senderCoins < amount) {
          return {
            success: false,
            error: `Saldo insuficiente. Você tem ${senderCoins} coins e tentou enviar ${amount}.`
          };
        }

        // 2. Buscar perfil do destinatário (por username, display_name ou ID)
        const { data: recipientProfile, error: recErr } = await supabase
          .from('profiles')
          .select('id, username, display_name, nexus_coins')
          .or(`username.ilike.${targetUsername},display_name.ilike.${targetUsername}`)
          .maybeSingle();

        if (recErr || !recipientProfile) {
          return {
            success: false,
            error: `Usuário @${targetUsername} não foi encontrado no Nexus Chat.`
          };
        }

        if (recipientProfile.id === currentUser.id) {
          return {
            success: false,
            error: 'Você não pode transferir moedas para sua própria conta.'
          };
        }

        const newSenderCoins = senderCoins - amount;
        const newRecipientCoins = (recipientProfile.nexus_coins ?? 0) + amount;

        // 3. Atualizar saldo do remetente
        const { error: updSenderErr } = await supabase
          .from('profiles')
          .update({ nexus_coins: newSenderCoins })
          .eq('id', currentUser.id);

        if (updSenderErr) {
          return { success: false, error: 'Erro ao debitar moedas do remetente.' };
        }

        // 4. Atualizar saldo do destinatário
        const { error: updRecErr } = await supabase
          .from('profiles')
          .update({ nexus_coins: newRecipientCoins })
          .eq('id', recipientProfile.id);

        if (updRecErr) {
          // Reverter débito se falhar
          await supabase.from('profiles').update({ nexus_coins: senderCoins }).eq('id', currentUser.id);
          return { success: false, error: 'Erro ao creditar moedas para o destinatário.' };
        }

        // 5. Registrar transações no histórico
        try {
          await supabase.from('nexus_transactions').insert([
            {
              user_id: currentUser.id,
              amount: -amount,
              type: 'transfer_sent',
              description: `Transferência enviada para @${recipientProfile.username || targetUsername}`
            },
            {
              user_id: recipientProfile.id,
              amount: amount,
              type: 'transfer_received',
              description: `Transferência recebida de @${senderProfile.username || 'membro'}`
            }
          ]);
        } catch (txErr) {
          console.warn('Aviso: Erro ao registrar transação no histórico:', txErr);
        }

        return {
          success: true,
          message: `✨ ${amount} Nexus Coins transferidos com sucesso para @${recipientProfile.username || targetUsername}!`,
          newBalance: newSenderCoins
        };
      }

      // 6. /users/search
      if (cleanEndpoint.startsWith('/users/search')) {
        const urlObj = new URL(`http://localhost${cleanEndpoint}`);
        const q = urlObj.searchParams.get('q') || '';
        const { data: users } = await supabase
          .from('profiles')
          .select('id, username, display_name, avatar_url, bio, is_online, role')
          .or(`username.ilike.%${q}%,display_name.ilike.%${q}%`)
          .limit(20);

        return { success: true, users: users || [] };
      }

      // 7. /users/profile (Atualização direta do Perfil via Supabase)
      if (cleanEndpoint === '/users/profile' && options.method === 'PUT') {
        const body = typeof options.body === 'string' ? JSON.parse(options.body) : (options.body || {});
        const { data: updatedProfile, error: updErr } = await supabase
          .from('profiles')
          .update(body)
          .eq('id', currentUser.id)
          .select()
          .single();

        if (updErr) {
          console.error('Erro ao atualizar perfil no Supabase:', updErr);
          throw updErr;
        }

        return { success: true, profile: updatedProfile };
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
