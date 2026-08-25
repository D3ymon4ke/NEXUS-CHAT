const { supabase, isConfigured } = require('../config/supabase');

/**
 * Busca histórico de mensagens de uma conversa com paginação
 */
async function getConversationMessages(req, res) {
  try {
    const { conversationId } = req.params;
    const { limit = 50, before } = req.query;

    if (!conversationId) {
      return res.status(400).json({ success: false, error: 'ID da conversa é obrigatório.' });
    }

    if (isConfigured && supabase) {
      let query = supabase
        .from('messages')
        .select(`
          *,
          sender:profiles(id, display_name, username, avatar_url),
          attachments:message_attachments(*),
          reactions:message_reactions(id, emoji, user_id),
          reply_to:messages!reply_to_id(
            id, content, type, sender_id,
            sender:profiles(id, display_name, username)
          )
        `)
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false })
        .limit(parseInt(limit, 10));

      if (before) {
        query = query.lt('created_at', before);
      }

      const { data: messages, error } = await query;

      if (error) {
        return res.status(500).json({ success: false, error: error.message });
      }

      // Inverte a ordem para retornar cronológico (mais antigo primeiro)
      return res.json({
        success: true,
        messages: (messages || []).reverse()
      });
    }

    // Mock messages para demonstração local
    let mockMessages = [];
    if (conversationId === '00000000-0000-0000-0000-000000000001') {
      mockMessages = [
        {
          id: 'msg-belmont-1',
          conversation_id: conversationId,
          sender_id: 'system',
          content: '👑 **Bem-vindo à BELMONT CONFERENCE**\nEste é o canal oficial e permanente para todos os membros do sistema.',
          type: 'text',
          is_edited: false,
          is_pinned: true,
          is_deleted: false,
          created_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
          sender: {
            id: 'system',
            display_name: 'Belmont System',
            username: 'belmont',
            avatar_url: '/belmont-logo.jpg'
          },
          attachments: [],
          reactions: [{ emoji: '👑', user_id: 'demo-user-1' }, { emoji: '🔥', user_id: 'demo-user-2' }]
        },
        {
          id: 'msg-belmont-2',
          conversation_id: conversationId,
          sender_id: 'demo-user-ana',
          content: 'Excelente! Todos os membros já têm acesso direto a esta sala!',
          type: 'text',
          is_edited: false,
          is_pinned: false,
          is_deleted: false,
          created_at: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
          sender: {
            id: 'demo-user-ana',
            display_name: 'Ana Silva',
            username: 'ana_dev',
            avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150'
          },
          attachments: [],
          reactions: [{ emoji: '🚀', user_id: 'demo-user-1' }]
        }
      ];
    } else {
      mockMessages = [
        {
          id: 'msg-demo-1',
          conversation_id: conversationId,
          sender_id: 'demo-user-ana',
          content: 'Olá! Bem-vindo ao sistema de chat em tempo real!',
          type: 'text',
          is_edited: false,
          is_pinned: true,
          is_deleted: false,
          created_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
          sender: {
            id: 'demo-user-ana',
            display_name: 'Ana Silva',
            username: 'ana_dev',
            avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150'
          },
          attachments: [],
          reactions: [{ emoji: '👋', user_id: 'demo-user-1' }]
        },
        {
          id: 'msg-demo-2',
          conversation_id: conversationId,
          sender_id: 'demo-user-ana',
          content: 'Este projeto conecta Next.js (Vercel) + Node.js WebSockets (VPS) + Supabase (Postgres).',
          type: 'text',
          is_edited: false,
          is_pinned: false,
          is_deleted: false,
          created_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
          sender: {
            id: 'demo-user-ana',
            display_name: 'Ana Silva',
            username: 'ana_dev',
            avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150'
          },
          attachments: [],
          reactions: [{ emoji: '🔥', user_id: 'demo-user-1' }]
        }
      ];
    }

    return res.json({
      success: true,
      messages: mockMessages
    });
  } catch (error) {
    console.error('Erro em getConversationMessages:', error);
    return res.status(500).json({ success: false, error: 'Erro ao buscar mensagens.' });
  }
}

/**
 * Busca mensagens por termo dentro de uma conversa
 */
async function searchMessages(req, res) {
  try {
    const { conversationId } = req.params;
    const { q } = req.query;

    if (!conversationId || !q) {
      return res.status(400).json({ success: false, error: 'Parâmetros de busca inválidos.' });
    }

    if (isConfigured && supabase) {
      const { data: messages, error } = await supabase
        .from('messages')
        .select(`
          id, content, created_at, sender_id,
          sender:profiles(id, display_name, username, avatar_url)
        `)
        .eq('conversation_id', conversationId)
        .ilike('content', `%${q}%`)
        .order('created_at', { ascending: false })
        .limit(30);

      if (error) {
        return res.status(500).json({ success: false, error: error.message });
      }

      return res.json({ success: true, results: messages || [] });
    }

    return res.json({ success: true, results: [] });
  } catch (error) {
    console.error('Erro em searchMessages:', error);
    return res.status(500).json({ success: false, error: 'Erro ao pesquisar mensagens.' });
  }
}

/**
 * Retorna mensagens fixadas da conversa
 */
async function getPinnedMessages(req, res) {
  try {
    const { conversationId } = req.params;

    if (isConfigured && supabase) {
      const { data: pinned, error } = await supabase
        .from('messages')
        .select(`
          id, content, type, created_at, sender_id,
          sender:profiles(id, display_name, username, avatar_url)
        `)
        .eq('conversation_id', conversationId)
        .eq('is_pinned', true)
        .order('created_at', { ascending: false });

      if (error) {
        return res.status(500).json({ success: false, error: error.message });
      }

      return res.json({ success: true, pinned: pinned || [] });
    }

    return res.json({ success: true, pinned: [] });
  } catch (error) {
    console.error('Erro em getPinnedMessages:', error);
    return res.status(500).json({ success: false, error: 'Erro ao buscar mensagens fixadas.' });
  }
}

module.exports = {
  getConversationMessages,
  searchMessages,
  getPinnedMessages
};
