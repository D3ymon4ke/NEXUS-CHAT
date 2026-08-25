const { supabase, isConfigured } = require('../config/supabase');

/**
 * Retorna os detalhes da carteira do usuário e histórico de transações
 */
async function getWalletDetails(req, res) {
  try {
    const userId = req.user.id;

    if (isConfigured && supabase) {
      const [
        { data: profile },
        { data: transactions }
      ] = await Promise.all([
        supabase
          .from('profiles')
          .select('nexus_coins, daily_streak, last_daily_claim, role')
          .eq('id', userId)
          .single(),
        supabase
          .from('nexus_transactions')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(30)
      ]);

      const earnedTransactions = (transactions || []).filter(t => t.amount > 0);
      const totalEarned = earnedTransactions.reduce((sum, t) => sum + t.amount, 0);

      return res.json({
        success: true,
        wallet: {
          balance: profile?.nexus_coins || 100,
          dailyStreak: profile?.daily_streak || 0,
          lastDailyClaim: profile?.last_daily_claim || null,
          totalEarned,
          transactions: transactions || []
        }
      });
    }

    return res.json({
      success: true,
      wallet: {
        balance: 350,
        dailyStreak: 3,
        lastDailyClaim: null,
        totalEarned: 850,
        transactions: [
          { id: '1', amount: 100, type: 'initial_bonus', description: 'Bônus de boas-vindas', created_at: new Date().toISOString() },
          { id: '2', amount: 50, type: 'daily_claim', description: 'Recompensa Diária - Dia 1', created_at: new Date().toISOString() },
          { id: '3', amount: 5, type: 'message_reward', description: 'Mensagem enviada (+5 🪙)', created_at: new Date().toISOString() }
        ]
      }
    });
  } catch (error) {
    console.error('Erro em getWalletDetails:', error);
    return res.status(500).json({ success: false, error: 'Erro ao obter dados da carteira.' });
  }
}

/**
 * Transfere Nexus Coins entre usuários (P2P)
 */
async function transferCoins(req, res) {
  try {
    const senderId = req.user.id;
    const { targetUsername, amount } = req.body;
    const transferAmount = parseInt(amount, 10);

    if (!targetUsername || isNaN(transferAmount) || transferAmount <= 0) {
      return res.status(400).json({ success: false, error: 'Quantidade de moedas e destinatário inválidos.' });
    }

    if (isConfigured && supabase) {
      // 1. Verificar saldo do remetente
      const { data: sender, error: senderErr } = await supabase
        .from('profiles')
        .select('nexus_coins, username')
        .eq('id', senderId)
        .single();

      if (senderErr || !sender) return res.status(500).json({ success: false, error: 'Remetente inválido.' });

      if ((sender.nexus_coins || 0) < transferAmount) {
        return res.status(400).json({
          success: false,
          error: `Saldo insuficiente. Você tem ${sender.nexus_coins || 0} moedas e tentou transferir ${transferAmount}.`
        });
      }

      // 2. Buscar destinatário
      const cleanUsername = targetUsername.replace(/^@/, '').trim().toLowerCase();
      const { data: receiver, error: receiverErr } = await supabase
        .from('profiles')
        .select('id, username, nexus_coins')
        .ilike('username', cleanUsername)
        .single();

      if (receiverErr || !receiver) {
        return res.status(404).json({ success: false, error: `Usuário @${targetUsername} não foi encontrado.` });
      }

      if (receiver.id === senderId) {
        return res.status(400).json({ success: false, error: 'Você não pode transferir moedas para você mesmo.' });
      }

      // 3. Atualizar saldos
      const newSenderBalance = sender.nexus_coins - transferAmount;
      const newReceiverBalance = (receiver.nexus_coins || 0) + transferAmount;

      await Promise.all([
        supabase.from('profiles').update({ nexus_coins: newSenderBalance }).eq('id', senderId),
        supabase.from('profiles').update({ nexus_coins: newReceiverBalance }).eq('id', receiver.id),
        supabase.from('nexus_transactions').insert([
          {
            user_id: senderId,
            amount: -transferAmount,
            type: 'shop_purchase',
            description: `Transferência enviada para @${receiver.username}`
          },
          {
            user_id: receiver.id,
            amount: transferAmount,
            type: 'initial_bonus',
            description: `Transferência recebida de @${sender.username}`
          }
        ])
      ]);

      return res.json({
        success: true,
        message: `Transferência de ${transferAmount} Nexus Coins para @${receiver.username} realizada com sucesso!`,
        newBalance: newSenderBalance
      });
    }

    return res.json({
      success: true,
      message: `Transferência realizada com sucesso!`,
      newBalance: 250
    });
  } catch (error) {
    console.error('Erro em transferCoins:', error);
    return res.status(500).json({ success: false, error: 'Erro ao processar transferência.' });
  }
}

module.exports = {
  getWalletDetails,
  transferCoins
};
