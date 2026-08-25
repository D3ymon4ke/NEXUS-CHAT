const { supabase, isConfigured } = require('../config/supabase');
const { v4: uuidv4 } = require('uuid');

/**
 * Middleware para verificar se o usuário é Admin (damon ou role admin)
 */
function requireAdmin(req, res, next) {
  const user = req.user;
  const isDamon = user?.username?.toLowerCase() === 'damon' || user?.display_name?.toLowerCase() === 'damon';
  const hasAdminRole = user?.role === 'admin';

  if (!isDamon && !hasAdminRole) {
    return res.status(403).json({ success: false, error: 'Acesso negado. Apenas administradores podem acessar esta área.' });
  }

  next();
}

/**
 * Retorna estatísticas gerais do servidor para o painel admin
 */
async function getAdminStats(req, res) {
  try {
    if (isConfigured && supabase) {
      const [
        { count: totalUsers },
        { count: totalMessages },
        { count: totalConversations },
        { data: coinsData }
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('messages').select('*', { count: 'exact', head: true }),
        supabase.from('conversations').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('nexus_coins')
      ]);

      const totalCoinsInCirculation = (coinsData || []).reduce((sum, u) => sum + (u.nexus_coins || 0), 0);

      return res.json({
        success: true,
        stats: {
          totalUsers: totalUsers || 1,
          totalMessages: totalMessages || 0,
          totalConversations: totalConversations || 1,
          totalCoinsInCirculation,
          uptimeSeconds: Math.floor(process.uptime()),
          serverStatus: 'online'
        }
      });
    }

    return res.json({
      success: true,
      stats: {
        totalUsers: 12,
        totalMessages: 450,
        totalConversations: 8,
        totalCoinsInCirculation: 35400,
        uptimeSeconds: Math.floor(process.uptime()),
        serverStatus: 'online'
      }
    });
  } catch (error) {
    console.error('Erro em getAdminStats:', error);
    return res.status(500).json({ success: false, error: 'Erro ao buscar métricas do sistema.' });
  }
}

/**
 * Retorna lista de usuários com paginação e busca para o Admin
 */
async function getAdminUsers(req, res) {
  try {
    const { query = '', limit = 50 } = req.query;

    if (isConfigured && supabase) {
      let reqQuery = supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url, role, nexus_coins, daily_streak, is_banned, created_at, last_seen')
        .order('created_at', { ascending: false })
        .limit(Number(limit));

      if (query.trim()) {
        reqQuery = reqQuery.or(`username.ilike.%${query}%,display_name.ilike.%${query}%`);
      }

      const { data: users, error } = await reqQuery;
      if (error) return res.status(500).json({ success: false, error: error.message });

      return res.json({ success: true, users: users || [] });
    }

    return res.json({
      success: true,
      users: [
        {
          id: 'admin-damon',
          username: 'damon',
          display_name: 'Damon (Admin)',
          role: 'admin',
          nexus_coins: 50000,
          daily_streak: 10,
          is_banned: false,
          created_at: new Date().toISOString()
        }
      ]
    });
  } catch (error) {
    console.error('Erro em getAdminUsers:', error);
    return res.status(500).json({ success: false, error: 'Erro ao buscar usuários.' });
  }
}

/**
 * Adiciona ou remove Nexus Coins de um usuário
 */
async function giveCoinsToUser(req, res) {
  try {
    const { targetUserId, amount, reason = 'Ajuste administrativo' } = req.body;
    const coinsDelta = parseInt(amount, 10);

    if (!targetUserId || isNaN(coinsDelta)) {
      return res.status(400).json({ success: false, error: 'Parâmetros inválidos.' });
    }

    if (isConfigured && supabase) {
      const { data: user, error } = await supabase
        .from('profiles')
        .select('nexus_coins, username')
        .eq('id', targetUserId)
        .single();

      if (error || !user) return res.status(404).json({ success: false, error: 'Usuário não encontrado.' });

      const newBalance = Math.max(0, (user.nexus_coins || 0) + coinsDelta);

      await supabase
        .from('profiles')
        .update({ nexus_coins: newBalance })
        .eq('id', targetUserId);

      await supabase.from('nexus_transactions').insert({
        user_id: targetUserId,
        amount: coinsDelta,
        type: coinsDelta > 0 ? 'initial_bonus' : 'shop_purchase',
        description: `Admin [${req.user.username}]: ${reason}`
      });

      return res.json({
        success: true,
        message: `${coinsDelta > 0 ? 'Adicionadas' : 'Removidas'} ${Math.abs(coinsDelta)} moedas de @${user.username}. Novo saldo: ${newBalance}`,
        newBalance
      });
    }

    return res.json({ success: true, message: `Moedas ajustadas com sucesso!`, newBalance: 1000 });
  } catch (error) {
    console.error('Erro em giveCoinsToUser:', error);
    return res.status(500).json({ success: false, error: 'Erro ao ajustar moedas.' });
  }
}

/**
 * Bane ou desbane um usuário
 */
async function toggleBanUser(req, res) {
  try {
    const { targetUserId, isBanned } = req.body;

    if (!targetUserId) {
      return res.status(400).json({ success: false, error: 'ID do usuário obrigatório.' });
    }

    if (isConfigured && supabase) {
      await supabase
        .from('profiles')
        .update({ is_banned: !!isBanned })
        .eq('id', targetUserId);

      return res.json({
        success: true,
        message: `Usuário ${isBanned ? 'banido' : 'desbanido'} com sucesso.`
      });
    }

    return res.json({ success: true, message: `Status de banimento alterado.` });
  } catch (error) {
    console.error('Erro em toggleBanUser:', error);
    return res.status(500).json({ success: false, error: 'Erro ao alterar banimento.' });
  }
}

/**
 * Envia um anúncio global para a Belmont Conference
 */
async function broadcastAnnouncement(req, res) {
  try {
    const { title, message } = req.body;
    const BELMONT_ID = '00000000-0000-0000-0000-000000000001';

    if (!message) {
      return res.status(400).json({ success: false, error: 'Mensagem do anúncio é obrigatória.' });
    }

    const formattedContent = `📢 **ANÚNCIO OFICIAL DA ADMINISTRAÇÃO**\n\n### ${title || 'Comunicado Belmont'}\n${message}`;

    if (isConfigured && supabase) {
      const messageId = uuidv4();
      await supabase.from('messages').insert({
        id: messageId,
        conversation_id: BELMONT_ID,
        sender_id: req.user.id,
        content: formattedContent,
        type: 'text'
      });
    }

    return res.json({
      success: true,
      message: 'Anúncio transmitido com sucesso para a BELMONT CONFERENCE!'
    });
  } catch (error) {
    console.error('Erro em broadcastAnnouncement:', error);
    return res.status(500).json({ success: false, error: 'Erro ao enviar transmissão.' });
  }
}

module.exports = {
  requireAdmin,
  getAdminStats,
  getAdminUsers,
  giveCoinsToUser,
  toggleBanUser,
  broadcastAnnouncement
};
