import React, { useState, useRef } from 'react';
import { apiRequest } from '../../lib/api';
import { sounds } from '../../lib/sound';
import confetti from 'canvas-confetti';
import { Sparkles, CircleDot, Flame, Award } from 'lucide-react';

const TILES = [
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

// Fita estendida (repetida 6 vezes) para animação contínua de rolagem
const EXTENDED_TILES = [...TILES, ...TILES, ...TILES, ...TILES, ...TILES, ...TILES];

export function DoubleGame({ betAmount, userBalance, onBalanceUpdate }) {
  const [selectedChoice, setSelectedChoice] = useState('red'); // 'red' | 'black' | 'gold'
  const [isRolling, setIsRolling] = useState(false);
  const [rollOffset, setRollOffset] = useState(0);
  const [resultMessage, setResultMessage] = useState(null);
  const [resultType, setResultType] = useState(null);
  const trackRef = useRef(null);

  const handlePlayDouble = async () => {
    if (isRolling) return;
    if (userBalance < betAmount) {
      setResultMessage(`Saldo insuficiente! Você precisa de ${betAmount} moedas.`);
      setResultType('lose');
      return;
    }

    try {
      setIsRolling(true);
      setResultMessage(null);
      setResultType(null);

      const res = await apiRequest('/casino/double/play', {
        method: 'POST',
        body: JSON.stringify({ bet: betAmount, choice: selectedChoice })
      });

      if (res.success) {
        // Largura de cada quadrado na fita = 56px + 8px gap = 64px
        const tileSize = 64;
        const targetTileNumber = res.winningNumber;

        // Encontrar índice na repetição 4 (para garantir rolagem longa e bonita)
        const targetIndex = 15 * 3 + targetTileNumber;
        // Centralizar o quadrado no centro da viewport de 320px (offset - 160 + halfTile)
        const centerOffset = targetIndex * tileSize + tileSize / 2 - 160;

        setRollOffset(-centerOffset);

        // Som de tique durante o rolamento
        const interval = setInterval(() => {
          sounds.playWheelTick?.();
        }, 140);

        setTimeout(() => {
          clearInterval(interval);
          setIsRolling(false);

          if (res.isWinner) {
            sounds.playBigWin?.();
            confetti({ particleCount: 75, spread: 70, origin: { y: 0.6 } });
            setResultMessage(`VOCÊ GANHOU! +${res.payout} moedas no ${res.winningColor.toUpperCase()} (${res.multiplier}x)!`);
            setResultType('win');
          } else {
            sounds.playExplosion?.();
            setResultMessage(`Não foi desta vez! Saiu número ${res.winningNumber} (${res.winningColor.toUpperCase()}).`);
            setResultType('lose');
          }

          if (onBalanceUpdate && res.currentBalance !== undefined) {
            onBalanceUpdate(res.currentBalance);
          }
        }, 4000);
      } else {
        setIsRolling(false);
        setResultMessage(res.error || 'Erro ao jogar Double.');
        setResultType('lose');
      }
    } catch (err) {
      setIsRolling(false);
      setResultMessage(err.message || 'Erro de comunicação.');
      setResultType('lose');
    }
  };

  return (
    <div className="flex flex-col items-center w-full max-w-md mx-auto space-y-4 select-none">
      {/* Fita Deslizante do Double com Marcador Central */}
      <div className="w-full relative py-2">
        {/* Marcador Central Indicador */}
        <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-1.5 bg-amber-400 z-20 shadow-[0_0_12px_rgba(251,191,36,1)] rounded-full pointer-events-none" />

        {/* Viewport da Fita */}
        <div className="w-full h-20 rounded-2xl bg-slate-950/90 border border-slate-800 shadow-inner overflow-hidden relative flex items-center">
          <div
            ref={trackRef}
            className="flex items-center gap-2 pl-4 transition-transform duration-[4000ms] ease-[cubic-bezier(0.12,0.88,0.25,1)]"
            style={{ transform: `translateX(${rollOffset}px)` }}
          >
            {EXTENDED_TILES.map((tile, i) => {
              let bg = 'bg-slate-800 border-slate-700 text-white';
              if (tile.color === 'red') bg = 'bg-gradient-to-b from-rose-600 to-red-800 border-rose-500 text-white shadow-rose-600/30';
              if (tile.color === 'black') bg = 'bg-gradient-to-b from-slate-800 to-slate-950 border-slate-700 text-slate-200';
              if (tile.color === 'gold') bg = 'bg-gradient-to-b from-amber-400 to-yellow-600 border-amber-300 text-black shadow-amber-500/50';

              return (
                <div
                  key={i}
                  className={`w-14 h-14 rounded-xl border flex items-center justify-center font-black text-base shadow flex-shrink-0 ${bg}`}
                >
                  {tile.color === 'gold' ? '👑' : tile.number}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Seletor de Cores de Aposta (Vermelho 2x | Dourado 14x | Preto 2x) */}
      <div className="grid grid-cols-3 gap-2 w-full">
        {/* Vermelho */}
        <button
          type="button"
          disabled={isRolling}
          onClick={() => setSelectedChoice('red')}
          className={`p-3 rounded-2xl border flex flex-col items-center justify-center gap-1 transition-all active:scale-95 ${
            selectedChoice === 'red'
              ? 'bg-rose-600 border-rose-400 shadow-lg shadow-rose-600/40 text-white ring-2 ring-rose-400/50 scale-102'
              : 'bg-rose-950/40 border-rose-900/60 text-rose-300 hover:bg-rose-900/40'
          }`}
        >
          <span className="text-xs font-bold uppercase tracking-wider">Vermelho</span>
          <span className="text-sm font-extrabold px-2 py-0.5 rounded-lg bg-black/40">2x</span>
        </button>

        {/* Dourado Nexus (14x) */}
        <button
          type="button"
          disabled={isRolling}
          onClick={() => setSelectedChoice('gold')}
          className={`p-3 rounded-2xl border flex flex-col items-center justify-center gap-1 transition-all active:scale-95 ${
            selectedChoice === 'gold'
              ? 'bg-gradient-to-r from-amber-400 to-yellow-500 border-amber-200 shadow-lg shadow-amber-500/50 text-black ring-2 ring-amber-300 scale-102 font-black'
              : 'bg-amber-950/40 border-amber-900/60 text-amber-300 hover:bg-amber-900/40'
          }`}
        >
          <span className="text-xs font-extrabold uppercase tracking-wider">Dourado 👑</span>
          <span className="text-sm font-black px-2 py-0.5 rounded-lg bg-black/40 text-amber-300">14x</span>
        </button>

        {/* Preto */}
        <button
          type="button"
          disabled={isRolling}
          onClick={() => setSelectedChoice('black')}
          className={`p-3 rounded-2xl border flex flex-col items-center justify-center gap-1 transition-all active:scale-95 ${
            selectedChoice === 'black'
              ? 'bg-slate-800 border-slate-500 shadow-lg shadow-slate-800/60 text-white ring-2 ring-slate-400 scale-102'
              : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-800/60'
          }`}
        >
          <span className="text-xs font-bold uppercase tracking-wider">Preto</span>
          <span className="text-sm font-extrabold px-2 py-0.5 rounded-lg bg-black/40">2x</span>
        </button>
      </div>

      {/* Mensagem de Resultado */}
      {resultMessage && (
        <div
          className={`w-full p-2.5 sm:p-3 rounded-xl text-xs font-bold text-center border animate-fadeIn ${
            resultType === 'win'
              ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/15 border-rose-500/30 text-rose-300'
          }`}
        >
          {resultMessage}
        </div>
      )}

      {/* Botão de Jogar Double */}
      <button
        type="button"
        disabled={isRolling}
        onClick={handlePlayDouble}
        className={`w-full py-3.5 rounded-2xl font-black text-sm tracking-wide shadow-lg transition-all flex items-center justify-center gap-2 active:scale-95 ${
          isRolling
            ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
            : 'bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 hover:from-amber-400 text-black shadow-amber-500/25'
        }`}
      >
        {isRolling ? (
          <div className="flex items-center gap-2">
            <CircleDot className="w-4 h-4 animate-spin text-amber-400" />
            <span>ROLANDO DOUBLE...</span>
          </div>
        ) : (
          <>
            <Sparkles className="w-4 h-4" />
            <span>
              APOSTAR {betAmount} 🪙 NO {selectedChoice.toUpperCase()}
            </span>
          </>
        )}
      </button>
    </div>
  );
}
