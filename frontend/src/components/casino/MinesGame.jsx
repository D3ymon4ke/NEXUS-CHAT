import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../lib/api';
import { sounds } from '../../lib/sound';
import confetti from 'canvas-confetti';
import { Sparkles, Bomb, Diamond, AlertCircle, ArrowUpRight, Trophy } from 'lucide-react';

export function MinesGame({ betAmount, userBalance, onBalanceUpdate }) {
  const [minesCount, setMinesCount] = useState(3);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [revealingIndex, setRevealingIndex] = useState(null);

  // Estado do tabuleiro: array de 25 células
  // cada célula: { revealed: boolean, isMine: boolean, isDiamond: boolean }
  const [board, setBoard] = useState(
    Array.from({ length: 25 }, () => ({ revealed: false, isMine: false, isDiamond: false }))
  );
  const [revealedCount, setRevealedCount] = useState(0);
  const [currentMultiplier, setCurrentMultiplier] = useState(1.0);
  const [nextMultiplier, setNextMultiplier] = useState(1.0);
  const [potentialPayout, setPotentialPayout] = useState(0);
  const [gameOverMessage, setGameOverMessage] = useState(null);
  const [gameOverType, setGameOverType] = useState(null); // 'win' | 'lose' | 'cashout'

  const resetBoard = () => {
    setBoard(Array.from({ length: 25 }, () => ({ revealed: false, isMine: false, isDiamond: false })));
    setRevealedCount(0);
    setCurrentMultiplier(1.0);
    setNextMultiplier(1.0);
    setPotentialPayout(0);
    setGameOverMessage(null);
    setGameOverType(null);
  };

  // Iniciar nova rodada de Mines
  const handleStartGame = async () => {
    if (loading || isPlaying) return;
    if (userBalance < betAmount) {
      setGameOverMessage(`Saldo insuficiente! Você precisa de ${betAmount} moedas.`);
      setGameOverType('lose');
      return;
    }

    try {
      setLoading(true);
      resetBoard();

      const res = await apiRequest('/casino/mines/start', {
        method: 'POST',
        body: JSON.stringify({ bet: betAmount, minesCount })
      });

      if (res.success) {
        setIsPlaying(true);
        sounds.playCoin?.();
        setNextMultiplier(res.nextMultiplier || 1.15);
        setPotentialPayout(betAmount);
        if (onBalanceUpdate && res.currentBalance !== undefined) {
          onBalanceUpdate(res.currentBalance);
        }
      } else {
        setGameOverMessage(res.error || 'Erro ao iniciar Mines.');
        setGameOverType('lose');
      }
    } catch (err) {
      setGameOverMessage(err.message || 'Erro de conexão com o servidor.');
      setGameOverType('lose');
    } finally {
      setLoading(false);
    }
  };

  // Clicar em uma célula do tabuleiro
  const handleTileClick = async (index) => {
    if (!isPlaying || loading || board[index].revealed) return;

    try {
      setRevealingIndex(index);
      const res = await apiRequest('/casino/mines/reveal', {
        method: 'POST',
        body: JSON.stringify({ tileIndex: index })
      });

      if (res.success) {
        if (res.isBomb) {
          // BATEU NA MINA! 💣
          sounds.playExplosion?.();
          setIsPlaying(false);
          setGameOverType('lose');
          setGameOverMessage('BOOM! Você pisou em uma mina.');

          // Revelar todas as minas no tabuleiro
          setBoard((prev) =>
            prev.map((tile, i) => {
              if (res.allMines?.includes(i)) {
                return { ...tile, revealed: true, isMine: true };
              }
              return tile;
            })
          );
        } else {
          // DIAMANTE ENCONTRADO! 💎
          sounds.playDiamond?.();
          const newCount = res.diamondCount;
          setRevealedCount(newCount);
          setCurrentMultiplier(res.multiplier);
          setNextMultiplier(res.nextMultiplier || res.multiplier * 1.2);
          setPotentialPayout(res.potentialPayout);

          setBoard((prev) =>
            prev.map((tile, i) => (i === index ? { ...tile, revealed: true, isDiamond: true } : tile))
          );

          // Se limpou todas as gemas
          if (res.isGameOver) {
            setIsPlaying(false);
            setGameOverType('win');
            setGameOverMessage(res.message || 'Parabéns! Você limpou o campo!');
            sounds.playBigWin?.();
            confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
            if (onBalanceUpdate && res.currentBalance !== undefined) {
              onBalanceUpdate(res.currentBalance);
            }
          }
        }
      } else {
        setGameOverMessage(res.error || 'Erro ao revelar célula.');
      }
    } catch (err) {
      setGameOverMessage(err.message || 'Erro de comunicação.');
    } finally {
      setRevealingIndex(null);
    }
  };

  // Fazer Cash Out (Sacar Lucro)
  const handleCashout = async () => {
    if (!isPlaying || loading || revealedCount === 0) return;

    try {
      setLoading(true);
      const res = await apiRequest('/casino/mines/cashout', {
        method: 'POST'
      });

      if (res.success) {
        setIsPlaying(false);
        setGameOverType('cashout');
        setGameOverMessage(`Você sacou +${res.payout} moedas (${res.multiplier}x)!`);
        sounds.playBigWin?.();
        confetti({ particleCount: 60, spread: 60, origin: { y: 0.6 } });

        if (onBalanceUpdate && res.currentBalance !== undefined) {
          onBalanceUpdate(res.currentBalance);
        }

        // Revela as minas que restavam
        if (res.allMines) {
          setBoard((prev) =>
            prev.map((tile, i) => (res.allMines.includes(i) ? { ...tile, revealed: true, isMine: true } : tile))
          );
        }
      } else {
        setGameOverMessage(res.error || 'Erro ao sacar.');
      }
    } catch (err) {
      setGameOverMessage(err.message || 'Erro de comunicação ao sacar.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center w-full max-w-md mx-auto space-y-3 sm:space-y-4">
      {/* Seletor de Minas & Painel Superior */}
      <div className="w-full flex items-center justify-between p-2.5 sm:p-3 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-lg backdrop-blur-md">
        <div className="flex items-center gap-2">
          <Bomb className="w-4 h-4 text-rose-400 flex-shrink-0" />
          <span className="text-xs font-bold text-slate-300">Minas:</span>
          {isPlaying ? (
            <span className="px-2 py-0.5 rounded-lg bg-rose-500/20 text-rose-300 text-xs font-extrabold">
              {minesCount}
            </span>
          ) : (
            <div className="flex items-center gap-1">
              {[1, 3, 5, 10].map((count) => (
                <button
                  key={count}
                  onClick={() => setMinesCount(count)}
                  className={`px-2 py-0.5 rounded-lg text-xs font-bold transition-all ${
                    minesCount === count
                      ? 'bg-rose-500 text-white shadow-md shadow-rose-500/30'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {count}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Multiplicador Atual */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-500/15 border border-amber-500/30">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-xs font-extrabold text-amber-300">
            {currentMultiplier > 1 ? `${currentMultiplier}x` : `Prox: ${nextMultiplier}x`}
          </span>
        </div>
      </div>

      {/* Grade 5x5 do Campo Minado (Otimizada para Mobile Touch) */}
      <div className="w-full aspect-square max-w-[340px] sm:max-w-[360px] p-2 sm:p-3 rounded-2xl sm:rounded-3xl bg-slate-950/90 border border-slate-800 shadow-2xl grid grid-cols-5 gap-1.5 sm:gap-2 relative select-none">
        {board.map((tile, i) => {
          const isRevealing = revealingIndex === i;

          let tileStyle =
            'bg-gradient-to-b from-slate-800 to-slate-900 border-slate-700/80 hover:border-amber-500/50 text-slate-500 shadow';
          if (tile.revealed) {
            if (tile.isBomb) {
              tileStyle =
                'bg-gradient-to-br from-rose-600 to-red-900 border-rose-500 text-white shadow-lg shadow-rose-600/40 animate-shake';
            } else if (tile.isDiamond) {
              tileStyle =
                'bg-gradient-to-br from-emerald-500 to-teal-700 border-emerald-400 text-white shadow-lg shadow-emerald-500/40 animate-scaleUp';
            } else if (tile.isMine) {
              // Revelada após derrota/cashout
              tileStyle = 'bg-rose-950/60 border-rose-800/60 text-rose-400 opacity-60';
            }
          }

          return (
            <button
              key={i}
              type="button"
              disabled={!isPlaying || tile.revealed || loading}
              onClick={() => handleTileClick(i)}
              className={`rounded-xl sm:rounded-2xl border flex items-center justify-center transition-all duration-200 active:scale-95 text-lg sm:text-2xl ${tileStyle} ${
                isPlaying && !tile.revealed ? 'cursor-pointer hover:scale-105 active:bg-slate-700' : ''
              }`}
            >
              {isRevealing ? (
                <div className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
              ) : tile.revealed ? (
                tile.isBomb || tile.isMine ? (
                  <span className="drop-shadow">💣</span>
                ) : (
                  <span className="drop-shadow">💎</span>
                )
              ) : (
                <span className="w-2 h-2 rounded-full bg-slate-700/60" />
              )}
            </button>
          );
        })}
      </div>

      {/* Mensagem de Fim de Jogo */}
      {gameOverMessage && (
        <div
          className={`w-full p-2.5 sm:p-3 rounded-xl text-xs font-bold text-center border animate-fadeIn ${
            gameOverType === 'lose'
              ? 'bg-rose-500/15 border-rose-500/30 text-rose-300'
              : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
          }`}
        >
          {gameOverMessage}
        </div>
      )}

      {/* Botões de Ação Principal */}
      <div className="w-full flex items-center gap-2">
        {!isPlaying ? (
          <button
            type="button"
            disabled={loading}
            onClick={handleStartGame}
            className="w-full py-3 sm:py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 hover:from-amber-400 text-black font-black text-sm tracking-wide shadow-lg shadow-amber-500/25 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>JOGAR ({betAmount} 🪙)</span>
              </>
            )}
          </button>
        ) : (
          <button
            type="button"
            disabled={loading || revealedCount === 0}
            onClick={handleCashout}
            className={`w-full py-3 sm:py-3.5 rounded-2xl font-black text-sm tracking-wide shadow-lg transition-all flex items-center justify-center gap-2 active:scale-95 ${
              revealedCount > 0
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 text-black shadow-emerald-500/30 animate-pulse'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
            }`}
          >
            <ArrowUpRight className="w-4 h-4" />
            <span>
              SACAR {potentialPayout > 0 ? `${potentialPayout} 🪙 (${currentMultiplier}x)` : 'LUCRO'}
            </span>
          </button>
        )}
      </div>
    </div>
  );
}
