import React, { useState, useRef, useEffect } from 'react';
import { apiRequest } from '../../lib/api';
import { sounds } from '../../lib/sound';
import confetti from 'canvas-confetti';
import { Sparkles, CircleDot } from 'lucide-react';

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

// Fita estendida com 120 slots (8 ciclos completos de 15 números)
const TOTAL_SLOTS = 120;
const EXTENDED_TILES = Array.from({ length: TOTAL_SLOTS }, (_, i) => ({
  ...TILES[i % 15],
  slotIndex: i
}));

// Dimensões exatas em pixels
const TILE_WIDTH = 56; // w-14 = 56px
const TILE_GAP = 8; // gap-2 = 8px
const STEP = TILE_WIDTH + TILE_GAP; // 64px por item

export function DoubleGame({ betAmount, userBalance, onBalanceUpdate }) {
  const [selectedChoice, setSelectedChoice] = useState('red'); // 'red' | 'black' | 'gold'
  const [isRolling, setIsRolling] = useState(false);
  const [currentSlotIndex, setCurrentSlotIndex] = useState(0); // Começa no slot 0 (Dourado 0)
  const [rollOffset, setRollOffset] = useState(0);
  const [transitionDuration, setTransitionDuration] = useState(0);
  const [resultMessage, setResultMessage] = useState(null);
  const [resultType, setResultType] = useState(null);
  const containerRef = useRef(null);

  // Calcula o offset exato em pixels para centralizar o slot sob a agulha amarela
  const computeOffsetForIndex = (index) => {
    const containerWidth = containerRef.current ? containerRef.current.clientWidth : 360;
    // O centro do slot 'index' a partir da borda esquerda do trilho (sem padding):
    const slotCenter = index * STEP + TILE_WIDTH / 2;
    // Para alinhar o centro do slot com o centro do container:
    return containerWidth / 2 - slotCenter;
  };

  // Inicializa o alinhamento no slot 0
  useEffect(() => {
    const alignInitial = () => {
      setTransitionDuration(0);
      setRollOffset(computeOffsetForIndex(currentSlotIndex));
    };

    alignInitial();
    window.addEventListener('resize', alignInitial);
    return () => window.removeEventListener('resize', alignInitial);
  }, [currentSlotIndex]);

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
        const winningNumber = res.winningNumber;
        const currentNorm = currentSlotIndex % 15;

        // Rolar sempre para a FRENTE: 4 voltas completas (60 slots) + distância até o número sorteado
        const forwardDistance = ((winningNumber - currentNorm + 15) % 15) + 4 * 15;
        const targetSlot = currentSlotIndex + forwardDistance;

        // Adiciona um micro-jitter sutil (dentro de +-8px do centro do slot de 56px) para naturalidade
        const jitter = Math.floor((Math.random() - 0.5) * 12);
        const finalOffset = computeOffsetForIndex(targetSlot) + jitter;

        // Ativa a transição suave de rolagem
        setTransitionDuration(4200);
        setRollOffset(finalOffset);

        // Som de tique durante a rolagem
        const interval = setInterval(() => {
          sounds.playWheelTick?.();
        }, 130);

        setTimeout(() => {
          clearInterval(interval);
          setIsRolling(false);

          // Atualiza slot atual
          setCurrentSlotIndex(targetSlot);

          if (res.isWinner) {
            sounds.playBigWin?.();
            confetti({ particleCount: 75, spread: 70, origin: { y: 0.6 } });
            setResultMessage(`VOCÊ GANHOU! Saiu número ${res.winningNumber} (${res.winningColor.toUpperCase()}) • +${res.payout} moedas!`);
            setResultType('win');
          } else {
            sounds.playExplosion?.();
            setResultMessage(`Não foi desta vez! Saiu número ${res.winningNumber} (${res.winningColor.toUpperCase()}).`);
            setResultType('lose');
          }

          if (onBalanceUpdate && res.currentBalance !== undefined) {
            onBalanceUpdate(res.currentBalance);
          }

          // Normaliza o índice de forma invisível para não estourar os 120 slots
          setTimeout(() => {
            const normalized = targetSlot % 15;
            setTransitionDuration(0);
            setCurrentSlotIndex(normalized);
            setRollOffset(computeOffsetForIndex(normalized));
          }, 600);
        }, 4200);
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
        {/* Marcador Central Indicador (Agulha Amarela Luminosa) */}
        <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-1.5 bg-amber-400 z-30 shadow-[0_0_14px_rgba(251,191,36,1)] rounded-full pointer-events-none" />

        {/* Viewport da Fita */}
        <div
          ref={containerRef}
          className="w-full h-20 rounded-2xl bg-slate-950/90 border border-slate-800 shadow-inner overflow-hidden relative flex items-center"
        >
          {/* Trilho Deslizante sem padding lateral para alinhamento matemático exato */}
          <div
            className="flex items-center gap-2"
            style={{
              transform: `translateX(${rollOffset}px)`,
              transition:
                transitionDuration > 0
                  ? `transform ${transitionDuration}ms cubic-bezier(0.12, 0.88, 0.25, 1)`
                  : 'none'
            }}
          >
            {EXTENDED_TILES.map((tile) => {
              let bg = 'bg-slate-800 border-slate-700 text-white';
              if (tile.color === 'red') {
                bg = 'bg-gradient-to-b from-rose-600 to-red-800 border-rose-500 text-white shadow-rose-600/30';
              } else if (tile.color === 'black') {
                bg = 'bg-gradient-to-b from-slate-800 to-slate-950 border-slate-700 text-slate-200';
              } else if (tile.color === 'gold') {
                bg = 'bg-gradient-to-b from-amber-400 to-yellow-600 border-amber-300 text-black shadow-amber-500/50';
              }

              return (
                <div
                  key={tile.slotIndex}
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
        {/* Vermelho (2x) */}
        <button
          type="button"
          disabled={isRolling}
          onClick={() => {
            setSelectedChoice('red');
            sounds.playPop?.();
          }}
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
          onClick={() => {
            setSelectedChoice('gold');
            sounds.playPop?.();
          }}
          className={`p-3 rounded-2xl border flex flex-col items-center justify-center gap-1 transition-all active:scale-95 ${
            selectedChoice === 'gold'
              ? 'bg-gradient-to-r from-amber-400 to-yellow-500 border-amber-200 shadow-lg shadow-amber-500/50 text-black ring-2 ring-amber-300 scale-102 font-black'
              : 'bg-amber-950/40 border-amber-900/60 text-amber-300 hover:bg-amber-900/40'
          }`}
        >
          <span className="text-xs font-extrabold uppercase tracking-wider">Dourado 👑</span>
          <span className="text-sm font-black px-2 py-0.5 rounded-lg bg-black/40 text-amber-300">14x</span>
        </button>

        {/* Preto (2x) */}
        <button
          type="button"
          disabled={isRolling}
          onClick={() => {
            setSelectedChoice('black');
            sounds.playPop?.();
          }}
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
