const { supabase, isConfigured } = require('../config/supabase');
const { v4: uuidv4 } = require('uuid');

const BELMONT_CONFERENCE_ID = '00000000-0000-0000-0000-000000000001';
const BELMONT_CONFERENCE_LOGO = '/belmont-logo.jpg';

const BELMONT_ROOM_DEFAULT = {
  id: BELMONT_CONFERENCE_ID,
  type: 'group',
  name: 'BELMONT CONFERENCE',
  description: 'Sala principal oficial de conferência e avisos gerais. Canal permanente para todos os membros.',
  avatar_url: BELMONT_CONFERENCE_LOGO,
  is_permanent: true,
  unread_count: 0,
  last_message: {
    id: 'msg-belmont-welcome',
    content: 'Bem-vindo à BELMONT CONFERENCE. Canal oficial permanente para todos os membros.',
    type: 'text',
    sender_id: 'system',
    created_at: new Date().toISOString()
  }
};

/**
 * Lista todas as conversas do usuário autenticado (Garantindo BELMONT CONFERENCE no topo)
 */
async function getUserConversations(req, res) {
  try {
    const userId = req.user.id;

    if (isConfigured && supabase) {
      // 1. Garantir que o usuário participa da BELMONT CONFERENCE
      await supabase.from('conversation_participants').upsert({
        conversation_id: BELMONT_CONFERENCE_ID,
        user_id: userId,
        role: 'member'
      });

      // 2. Obter IDs das conversas das quais o usuário participa
      const { data: participations, error: partError } = await supabase
        .from('conversation_participants')
        .select('conversation_id, role, unread_count, is_muted')
        .eq('user_id', userId);

      if (partError) {
        return res.status(500).json({ success: false, error: partError.message });
      }

      const conversationIds = (participations || []).map(p => p.conversation_id);
      if (!conversationIds.includes(BELMONT_CONFERENCE_ID)) {
        conversationIds.push(BELMONT_CONFERENCE_ID);
      }

      // 3. Buscar detalhes das conversas
      const { data: conversations, error: convError } = await supabase
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
              last_seen
            )
          )
        `)
        .in('id', conversationIds);

      if (convError) {
        return res.status(500).json({ success: false, error: convError.message });
      }

      // 4. Buscar a última mensagem de cada conversa
      const enrichedConversations = await Promise.all(
        conversations.map(async (conv) => {
          const { data: lastMsg } = await supabase
            .from('messages')
            .select(`
              id, content, type, sender_id, created_at, is_edited, is_deleted,
              sender:profiles(id, display_name, username, avatar_url)
            `)
            .eq('conversation_id', conv.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          const myParticipation = participations?.find(p => p.conversation_id === conv.id);

          let directUser = null;
          if (conv.type === 'direct') {
            const otherParticipant = conv.conversation_participants?.find(p => p.user_id !== userId);
            directUser = otherParticipant?.profiles || null;
          }

          const isBelmont = conv.id === BELMONT_CONFERENCE_ID;

          return {
            ...conv,
            name: isBelmont ? 'BELMONT CONFERENCE' : conv.name,
            avatar_url: isBelmont ? BELMONT_CONFERENCE_LOGO : conv.avatar_url,
            is_permanent: isBelmont || conv.is_permanent,
            unread_count: myParticipation?.unread_count || 0,
            is_muted: myParticipation?.is_muted || false,
            last_message: lastMsg || (isBelmont ? BELMONT_ROOM_DEFAULT.last_message : null),
            direct_user: directUser
          };
        })
      );

      // Ordenar colocando BELMONT CONFERENCE sempre em destaque no topo, seguido pelas mais recentes
      enrichedConversations.sort((a, b) => {
        if (a.id === BELMONT_CONFERENCE_ID) return -1;
        if (b.id === BELMONT_CONFERENCE_ID) return 1;
        return new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at);
      });

      return res.json({ success: true, conversations: enrichedConversations });
    }

    // Mock fallback para desenvolvimento local
    return res.json({
      success: true,
      conversations: [
        BELMONT_ROOM_DEFAULT,
        {
          id: 'demo-conv-1',
          type: 'direct',
          name: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          unread_count: 2,
          direct_user: {
            id: 'demo-user-ana',
            username: 'ana_dev',
            display_name: 'Ana Silva',
            avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
            is_online: true,
            last_seen: new Date().toISOString()
          },
          last_message: {
            id: 'msg-1',
            content: 'Olá! O sistema de chat em tempo real ficou excelente! 🚀',
            type: 'text',
            sender_id: 'demo-user-ana',
            created_at: new Date(Date.now() - 5 * 60 * 1000).toISOString()
          }
        },
        {
          id: 'demo-conv-2',
          type: 'group',
          name: '🚀 Time de Engenharia',
          description: 'Discussões de arquitetura e novidades',
          avatar_url: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=150',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          unread_count: 0,
          conversation_participants: [],
          last_message: {
            id: 'msg-2',
            content: 'Deploy do WebSocket e Supabase concluído na VPS!',
            type: 'text',
            sender_id: 'demo-user-marcos',
            created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString()
          }
        }
      ]
    });
  } catch (error) {
    console.error('Erro em getUserConversations:', error);
    return res.status(500).json({ success: false, error: 'Erro ao buscar conversas.' });
  }
}

/**
 * Cria ou retorna uma conversa direta com outro usuário
 */
async function getOrCreateDirectConversation(req, res) {
  try {
    const currentUserId = req.user.id;
    const { targetUserId } = req.body;

    if (!targetUserId) {
      return res.status(400).json({ success: false, error: 'ID do destinatário é obrigatório.' });
    }

    if (currentUserId === targetUserId) {
      return res.status(400).json({ success: false, error: 'Não é possível iniciar conversa consigo mesmo.' });
    }

    if (isConfigured && supabase) {
      const { data: myConvs } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', currentUserId);

      const myConvIds = (myConvs || []).map(c => c.conversation_id);

      if (myConvIds.length > 0) {
        const { data: existingTarget } = await supabase
          .from('conversation_participants')
          .select('conversation_id, conversations(type)')
          .eq('user_id', targetUserId)
          .in('conversation_id', myConvIds);

        const existingDirect = (existingTarget || []).find(
          c => c.conversations && c.conversations.type === 'direct'
        );

        if (existingDirect) {
          return res.json({
            success: true,
            conversationId: existingDirect.conversation_id,
            isNew: false
          });
        }
      }

      const newConvId = uuidv4();

      const { data: newConv, error: createError } = await supabase
        .from('conversations')
        .insert({
          id: newConvId,
          type: 'direct',
          created_by: currentUserId
        })
        .select()
        .single();

      if (createError) {
        return res.status(500).json({ success: false, error: createError.message });
      }

      await supabase.from('conversation_participants').insert([
        { conversation_id: newConvId, user_id: currentUserId, role: 'member' },
        { conversation_id: newConvId, user_id: targetUserId, role: 'member' }
      ]);

      return res.json({
        success: true,
        conversationId: newConvId,
        isNew: true
      });
    }

    return res.json({
      success: true,
      conversationId: `conv-direct-${Date.now()}`,
      isNew: true
    });
  } catch (error) {
    console.error('Erro em getOrCreateDirectConversation:', error);
    return res.status(500).json({ success: false, error: 'Erro ao criar conversa direta.' });
  }
}

/**
 * Cria um novo grupo de conversa
 */
async function createGroupConversation(req, res) {
  try {
    const currentUserId = req.user.id;
    const { name, description, avatarUrl, memberIds = [] } = req.body;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'Nome do grupo é obrigatório.' });
    }

    const newGroupId = uuidv4();

    if (isConfigured && supabase) {
      const { data: newGroup, error: groupErr } = await supabase
        .from('conversations')
        .insert({
          id: newGroupId,
          type: 'group',
          name: name.trim(),
          description: description || null,
          avatar_url: avatarUrl || `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(name)}`,
          created_by: currentUserId
        })
        .select()
        .single();

      if (groupErr) {
        return res.status(500).json({ success: false, error: groupErr.message });
      }

      const allMembers = [
        { conversation_id: newGroupId, user_id: currentUserId, role: 'admin' },
        ...memberIds
          .filter(id => id !== currentUserId)
          .map(id => ({ conversation_id: newGroupId, user_id: id, role: 'member' }))
      ];

      await supabase.from('conversation_participants').insert(allMembers);

      await supabase.from('messages').insert({
        id: uuidv4(),
        conversation_id: newGroupId,
        sender_id: currentUserId,
        content: `Grupo "${name}" criado.`,
        type: 'system'
      });

      return res.json({
        success: true,
        conversation: newGroup
      });
    }

    return res.json({
      success: true,
      conversation: {
        id: newGroupId,
        type: 'group',
        name,
        description,
        avatar_url: avatarUrl || `https://api.dicebear.com/7.x/identicon/svg?seed=${name}`,
        created_by: currentUserId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Erro em createGroupConversation:', error);
    return res.status(500).json({ success: false, error: 'Erro ao criar grupo.' });
  }
}

module.exports = {
  getUserConversations,
  getOrCreateDirectConversation,
  createGroupConversation,
  BELMONT_CONFERENCE_ID,
  BELMONT_CONFERENCE_LOGO
};
