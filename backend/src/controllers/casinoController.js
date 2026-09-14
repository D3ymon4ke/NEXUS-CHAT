const { supabase, isConfigured } = require('../config/supabase');
const crypto = require('crypto');

// Configurações de Regulação Econômica do Cassino
const MIN_BET = 5;
const MAX_BET = 500;
const MAX_PROFIT_PER_ROUND = 5000;

// Armazenamento em memória para sessões ativas do Mines (com timeout de 30 minutos)
const activeMinesSessions = new Map();

// Limpar sessões antigas a cada 10 minutos
setInterval(() => {
  const now = Date.now();
  for (const [userId, session] of activeMinesSessions.entries()) {
    if (now - session.createdAt > 30 * 60 * 1000) {
      activeMinesSessions.delete(userId);
    }
  }
}, 10 * 60 * 1000);

/**
 * Função utilitária para buscar o saldo atual do usuário
 */
async function getUserBalance(userId) {
  if (isConfigured && supabase) {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('nexus_coins')
      .eq('id', userId)
      .single();

    if (error || !profile) return 0;
    return profile.nexus_coins || 0;
  }
  return 1000; // Mock fallback
}

/**
 * Atualiza o saldo do usuário e registra no extrato de transações
 */
async function updateUserBalance(userId, newBalance, diffAmount, type, description) {
  if (isConfigured && supabase) {
    await supabase
      .from('profiles')
      .update({ nexus_coins: newBalance })
      .eq('id', userId);

    if (diffAmount !== 0) {
      await supabase.from('nexus_transactions').insert({
        user_id: userId,
        amount: diffAmount,
        type: type || 'casino_play',
        description: description || 'Cassino Nexus'
      });
    }
  }
}

/**
 * Cálculo matemático de multiplicadores para o Mines
 * Margem da casa: ~3% (fator de retorno 0.97)
 */
function calculateMinesMultiplier(minesCount, diamondsRevealed) {
  if (diamondsRevealed <= 0) return 1.0;
  const totalTiles = 25;
  const safeTiles = totalTiles - minesCount;

  if (diamondsRevealed > safeTiles) return 1.0;

  // Probabilidade acumulada: P(D_1) * P(D_2 | D_1) * ...
  let prob = 1.0;
  for (let i = 0; i < diamondsRevealed; i++) {
    prob *= (safeTiles - i) / (totalTiles - i);
  }

  // Multiplicador justo com 3% de margem da casa (0.97)
  const mult = 0.97 * (1 / prob);
  return Math.max(1.01, parseFloat(mult.toFixed(2)));
}

// ==========================================
// 1. MINES (CAMPO MINADO)
// ==========================================

/**
 * Inicia uma nova rodada de Mines
 * POST /api/casino/mines/start
 * Body: { bet: number, minesCount: number }
 */
async function startMines(req, res) {
  try {
    const userId = req.user.id;
    let { bet, minesCount } = req.body;

    bet = parseInt(bet, 10);
    minesCount = parseInt(minesCount, 10);

    if (isNaN(bet) || bet < MIN_BET || bet > MAX_BET) {
      return res.status(400).json({
        success: false,
        error: `A aposta deve ser entre ${MIN_BET} e ${MAX_BET} moedas.`
      });
    }

    if (isNaN(minesCount) || minesCount < 1 || minesCount > 20) {
      return res.status(400).json({
        success: false,
        error: 'A quantidade de minas deve ser entre 1 e 20.'
      });
    }

    const currentBalance = await getUserBalance(userId);
    if (currentBalance < bet) {
      return res.status(400).json({
        success: false,
        error: `Saldo insuficiente! Você tem ${currentBalance} moedas.`
      });
    }

    // Se já havia uma rodada ativa não finalizada, cancela sem reembolso (aposta anterior já debitada)
    if (activeMinesSessions.has(userId)) {
      activeMinesSessions.delete(userId);
    }

    // 1. Debitar a aposta
    const newBalance = currentBalance - bet;
    await updateUserBalance(
      userId,
      newBalance,
      -bet,
      'casino_bet',
      `Aposta no Mines (${minesCount} minas)`
    );

    // 2. Gerar posições das minas aleatoriamente no servidor (0 a 24)
    const allIndices = Array.from({ length: 25 }, (_, i) => i);
    // Shuffle criptograficamente seguro
    for (let i = allIndices.length - 1; i > 0; i--) {
      const j = crypto.randomInt(0, i + 1);
      [allIndices[i], allIndices[j]] = [allIndices[j], allIndices[i]];
    }
    const minePositions = new Set(allIndices.slice(0, minesCount));

    // 3. Salvar sessão segura no servidor
    activeMinesSessions.set(userId, {
      bet,
      minesCount,
      minePositions,
      revealedDiamonds: new Set(),
      multiplier: 1.0,
      createdAt: Date.now()
    });

    return res.json({
      success: true,
      currentBalance: newBalance,
      bet,
      minesCount,
      nextMultiplier: calculateMinesMultiplier(minesCount, 1),
      revealedDiamonds: [],
      isGameOver: false
    });
  } catch (error) {
    console.error('Erro em startMines:', error);
    return res.status(500).json({ success: false, error: 'Erro ao iniciar Mines.' });
  }
}

/**
 * Revela uma célula do Mines
 * POST /api/casino/mines/reveal
 * Body: { tileIndex: number }
 */
async function revealMinesTile(req, res) {
  try {
    const userId = req.user.id;
    const { tileIndex } = req.body;

    const index = parseInt(tileIndex, 10);
    if (isNaN(index) || index < 0 || index > 24) {
      return res.status(400).json({ success: false, error: 'Índice de célula inválido.' });
    }

    const session = activeMinesSessions.get(userId);
    if (!session) {
      return res.status(400).json({ success: false, error: 'Nenhuma rodada ativa do Mines encontrada.' });
    }

    if (session.revealedDiamonds.has(index)) {
      return res.status(400).json({ success: false, error: 'Célula já revelada.' });
    }

    // A célula é uma mina? BOOM! 💣
    if (session.minePositions.has(index)) {
      const allMines = Array.from(session.minePositions);
      activeMinesSessions.delete(userId);

      return res.json({
        success: true,
        isBomb: true,
        isGameOver: true,
        allMines,
        payout: 0,
        message: 'Você atingiu uma mina! Fim de rodada.'
      });
    }

    // Diamante revelado! 💎
    session.revealedDiamonds.add(index);
    const diamondCount = session.revealedDiamonds.size;
    const multiplier = calculateMinesMultiplier(session.minesCount, diamondCount);
    session.multiplier = multiplier;

    const potentialPayout = Math.min(
      Math.floor(session.bet * multiplier),
      session.bet + MAX_PROFIT_PER_ROUND
    );

    const safeTilesTotal = 25 - session.minesCount;
    const isCleared = diamondCount >= safeTilesTotal;

    // Se revelou todos os diamantes disponíveis, venceu o jogo automaticamente!
    if (isCleared) {
      activeMinesSessions.delete(userId);
      const currentBalance = await getUserBalance(userId);
      const newBalance = currentBalance + potentialPayout;

      await updateUserBalance(
        userId,
        newBalance,
        potentialPayout,
        'casino_win',
        `Vitória Total no Mines (${multiplier}x)!`
      );

      return res.json({
        success: true,
        isBomb: false,
        isGameOver: true,
        tileIndex: index,
        diamondCount,
        multiplier,
        payout: potentialPayout,
        currentBalance: newBalance,
        allMines: Array.from(session.minePositions),
        message: `Incrível! Você limpou o campo e faturou ${potentialPayout} moedas (${multiplier}x)!`
      });
    }

    const nextMultiplier = calculateMinesMultiplier(session.minesCount, diamondCount + 1);

    return res.json({
      success: true,
      isBomb: false,
      isGameOver: false,
      tileIndex: index,
      diamondCount,
      multiplier,
      potentialPayout,
      nextMultiplier,
      revealedDiamonds: Array.from(session.revealedDiamonds)
    });
  } catch (error) {
    console.error('Erro em revealMinesTile:', error);
    return res.status(500).json({ success: false, error: 'Erro ao revelar célula.' });
  }
}

/**
 * Faz o saque (Cash Out) do Mines
 * POST /api/casino/mines/cashout
 */
async function cashoutMines(req, res) {
  try {
    const userId = req.user.id;
    const session = activeMinesSessions.get(userId);

    if (!session) {
      return res.status(400).json({ success: false, error: 'Nenhuma rodada ativa para sacar.' });
    }

    if (session.revealedDiamonds.size === 0) {
      return res.status(400).json({ success: false, error: 'Revele ao menos um diamante antes de sacar!' });
    }

    const payout = Math.min(
      Math.floor(session.bet * session.multiplier),
      session.bet + MAX_PROFIT_PER_ROUND
    );

    activeMinesSessions.delete(userId);

    const currentBalance = await getUserBalance(userId);
    const newBalance = currentBalance + payout;

    await updateUserBalance(
      userId,
      newBalance,
      payout,
      'casino_win',
      `Saque no Mines - Multiplicador ${session.multiplier}x (+${payout} moedas)`
    );

    return res.json({
      success: true,
      payout,
      multiplier: session.multiplier,
      currentBalance: newBalance,
      allMines: Array.from(session.minePositions),
      message: `Saque com sucesso! +${payout} moedas creditadas!`
    });
  } catch (error) {
    console.error('Erro em cashoutMines:', error);
    return res.status(500).json({ success: false, error: 'Erro ao processar saque.' });
  }
}

// ==========================================
// 2. ROLETA DA FORTUNA (LUCKY WHEEL)
// ==========================================

const WHEEL_SLICES = [
  { id: 0, label: '0x (Tente Novamente)', multiplier: 0.0, weight: 26, color: '#475569' },
  { id: 1, label: '1.2x (Leve)', multiplier: 1.2, weight: 28, color: '#38bdf8' },
  { id: 2, label: '0.5x (Metade)', multiplier: 0.5, weight: 18, color: '#64748b' },
  { id: 3, label: '1.5x (Ganho)', multiplier: 1.5, weight: 14, color: '#34d399' },
  { id: 4, label: '2.0x (Dobro)', multiplier: 2.0, weight: 8, color: '#a855f7' },
  { id: 5, label: '3.0x (Triplo)', multiplier: 3.0, weight: 4, color: '#f59e0b' },
  { id: 6, label: '5.0x (Super)', multiplier: 5.0, weight: 1.6, color: '#ec4899' },
  { id: 7, label: '10.0x (JACKPOT 👑)', multiplier: 10.0, weight: 0.4, color: '#eab308' }
];

/**
 * Gira a Roleta da Fortuna
 * POST /api/casino/wheel/spin
 * Body: { bet: number }
 */
async function spinWheel(req, res) {
  try {
    const userId = req.user.id;
    let { bet } = req.body;
    bet = parseInt(bet, 10);

    if (isNaN(bet) || bet < MIN_BET || bet > MAX_BET) {
      return res.status(400).json({
        success: false,
        error: `A aposta deve ser entre ${MIN_BET} e ${MAX_BET} moedas.`
      });
    }

    const currentBalance = await getUserBalance(userId);
    if (currentBalance < bet) {
      return res.status(400).json({
        success: false,
        error: `Saldo insuficiente! Você tem ${currentBalance} moedas.`
      });
    }

    // 1. Sorteio ponderado no servidor
    const totalWeight = WHEEL_SLICES.reduce((sum, s) => sum + s.weight, 0);
    let rand = Math.random() * totalWeight;
    let selectedSlice = WHEEL_SLICES[0];

    for (const slice of WHEEL_SLICES) {
      if (rand < slice.weight) {
        selectedSlice = slice;
        break;
      }
      rand -= slice.weight;
    }

    // 2. Calcular prêmio e saldo
    const payout = Math.min(
      Math.floor(bet * selectedSlice.multiplier),
      bet + MAX_PROFIT_PER_ROUND
    );
    const diff = payout - bet;
    const newBalance = currentBalance + diff;

    // 3. Atualizar no banco
    if (diff < 0) {
      await updateUserBalance(
        userId,
        newBalance,
        diff,
        'casino_bet',
        `Giro na Roleta da Fortuna (${selectedSlice.multiplier}x)`
      );
    } else if (diff > 0) {
      await updateUserBalance(
        userId,
        newBalance,
        diff,
        'casino_win',
        `Vitória na Roleta da Fortuna - ${selectedSlice.label} (+${payout} moedas)`
      );
    }

    return res.json({
      success: true,
      sliceIndex: selectedSlice.id,
      slice: selectedSlice,
      multiplier: selectedSlice.multiplier,
      payout,
      profit: diff,
      currentBalance: newBalance,
      slices: WHEEL_SLICES
    });
  } catch (error) {
    console.error('Erro em spinWheel:', error);
    return res.status(500).json({ success: false, error: 'Erro ao girar a roleta.' });
  }
}

// ==========================================
// 3. DOUBLE (ROLETA DE CORES)
// ==========================================

// 15 números (0 = Dourado 14x, 1-7 = Vermelho 2x, 8-14 = Preto 2x)
const DOUBLE_TILES = [
  { number: 0, color: 'gold', multiplier: 14 },
  { number: 1, color: 'red', multiplier: 2 },
  { number: 2, color: 'black', multiplier: 2 },
  { number: 3, color: 'red', multiplier: 2 },
  { number: 4, color: 'black', multiplier: 2 },
  { number: 5, color: 'red', multiplier: 2 },
  { number: 6, color: 'black', multiplier: 2 },
  { number: 7, color: 'red', multiplier: 2 },
  { number: 8, color: 'black', multiplier: 2 },
  { number: 9, color: 'red', multiplier: 2 },
  { number: 10, color: 'black', multiplier: 2 },
  { number: 11, color: 'red', multiplier: 2 },
  { number: 12, color: 'black', multiplier: 2 },
  { number: 13, color: 'red', multiplier: 2 },
  { number: 14, color: 'black', multiplier: 2 }
];

/**
 * Joga na Roleta Double
 * POST /api/casino/double/play
 * Body: { bet: number, choice: 'red' | 'black' | 'gold' }
 */
async function playDouble(req, res) {
  try {
    const userId = req.user.id;
    let { bet, choice } = req.body;

    bet = parseInt(bet, 10);
    if (isNaN(bet) || bet < MIN_BET || bet > MAX_BET) {
      return res.status(400).json({
        success: false,
        error: `A aposta deve ser entre ${MIN_BET} e ${MAX_BET} moedas.`
      });
    }

    if (!['red', 'black', 'gold'].includes(choice)) {
      return res.status(400).json({
        success: false,
        error: 'Escolha inválida. Selecione Vermelho (2x), Preto (2x) ou Dourado (14x).'
      });
    }

    const currentBalance = await getUserBalance(userId);
    if (currentBalance < bet) {
      return res.status(400).json({
        success: false,
        error: `Saldo insuficiente! Você tem ${currentBalance} moedas.`
      });
    }

    // Sorteio seguro de 0 a 14
    const winningNumber = crypto.randomInt(0, 15);
    const winningTile = DOUBLE_TILES.find(t => t.number === winningNumber) || DOUBLE_TILES[0];
    const isWinner = winningTile.color === choice;

    let payout = 0;
    let diff = -bet;

    if (isWinner) {
      payout = Math.min(bet * winningTile.multiplier, bet + MAX_PROFIT_PER_ROUND);
      diff = payout - bet;
    }

    const newBalance = currentBalance + diff;

    if (isWinner) {
      await updateUserBalance(
        userId,
        newBalance,
        diff,
        'casino_win',
        `Vitória no Double! Cor ${winningTile.color.toUpperCase()} ${winningTile.multiplier}x (+${payout} moedas)`
      );
    } else {
      await updateUserBalance(
        userId,
        newBalance,
        diff,
        'casino_bet',
        `Aposta no Double (${choice.toUpperCase()})`
      );
    }

    return res.json({
      success: true,
      winningNumber,
      winningColor: winningTile.color,
      multiplier: winningTile.multiplier,
      isWinner,
      payout,
      profit: diff,
      currentBalance: newBalance
    });
  } catch (error) {
    console.error('Erro em playDouble:', error);
    return res.status(500).json({ success: false, error: 'Erro ao jogar Double.' });
  }
}

/**
 * Retorna configurações e estatísticas do cassino
 * GET /api/casino/config
 */
async function getCasinoConfig(req, res) {
  try {
    const userId = req.user?.id;
    const balance = userId ? await getUserBalance(userId) : 0;

    return res.json({
      success: true,
      minBet: MIN_BET,
      maxBet: MAX_BET,
      maxProfit: MAX_PROFIT_PER_ROUND,
      balance,
      wheelSlices: WHEEL_SLICES,
      activeMinesSession: userId && activeMinesSessions.has(userId) ? {
        bet: activeMinesSessions.get(userId).bet,
        minesCount: activeMinesSessions.get(userId).minesCount,
        revealedCount: activeMinesSessions.get(userId).revealedDiamonds.size,
        revealedDiamonds: Array.from(activeMinesSessions.get(userId).revealedDiamonds),
        multiplier: activeMinesSessions.get(userId).multiplier
      } : null
    });
  } catch (error) {
    console.error('Erro em getCasinoConfig:', error);
    return res.status(500).json({ success: false, error: 'Erro ao obter configurações do cassino.' });
  }
}

module.exports = {
  startMines,
  revealMinesTile,
  cashoutMines,
  spinWheel,
  playDouble,
  getCasinoConfig
};
