import React, { useState } from 'react';
import { apiRequest } from '../../lib/api';
import { sounds } from '../../lib/sound';
import confetti from 'canvas-confetti';
import { Sparkles, Disc3, Trophy, Flame } from 'lucide-react';

const SLICES = [
  { id: 0, label: '0x', multiplier: 0.0, color: '#334155', text: 'Perdeu' },
  { id: 1, label: '1.2x', multiplier: 1.2, color: '#0284c7', text: 'Leve' },
  { id: 2, label: '0.5x', multiplier: 0.5, color: '#475569', text: 'Metade' },
  { id: 3, label: '1.5x', multiplier: 1.5, color: '#059669', text: 'Ganho' },
  { id: 4, label: '2.0x', multiplier: 2.0, color: '#7c3aed', text: 'Dobro' },
  { id: 5, label: '3.0x', multiplier: 3.0, color: '#d97706', text: 'Triplo' },
  { id: 6, label: '5.0x', multiplier: 5.0, color: '#db2777', text: 'Super' },
  { id: 7, label: '10.0x', multiplier: 10.0, color: '#eab308', text: 'JACKPOT' }
];

export function WheelGame({ betAmount, userBalance, onBalanceUpdate }) {
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotationDegrees, setRotationDegrees] = useState(0);
  const [resultMessage, setResultMessage] = useState(null);
  const [resultType, setResultType] = useState(null); // 'win' | 'lose'

  const handleSpin = async () => {
    if (isSpinning) return;
    if (userBalance < betAmount) {
      setResultMessage(`Saldo insuficiente! Você precisa de ${betAmount} moedas.`);
      setResultType('lose');
      return;
    }

    try {
      setIsSpinning(true);
      setResultMessage(null);
      setResultType(null);

      const res = await apiRequest('/casino/wheel/spin', {
        method: 'POST',
        body: JSON.stringify({ bet: betAmount })
      });

      if (res.success) {
        // Cada fatia ocupa 360 / 8 = 45 graus
        const sliceAngle = 45;
        const targetIndex = res.sliceIndex;

        // O ponteiro fica no topo (270 graus ou 0 graus com offset).
        // Calculamos graus extras para centralizar a fatia exatamente no ponteiro superior:
        const sliceCenterAngle = targetIndex * sliceAngle + sliceAngle / 2;
        // Queremos que essa fatia pare no topo (270 graus ou ajustado para ponteiro)
        const targetStopAngle = (360 - sliceCenterAngle + 270) % 360;

        // Adicionar 5 a 8 voltas completas para o efeito visual de desaceleração
        const fullSpins = 360 * 6;
        const currentNormalized = rotationDegrees % 360;
        const delta = (targetStopAngle - currentNormalized + 360) % 360;
        const finalRotation = rotationDegrees + fullSpins + delta;

        setRotationDegrees(finalRotation);

        // Disparar som de tique durante a rotação
        const tickInterval = setInterval(() => {
          sounds.playWheelTick?.();
        }, 180);

        setTimeout(() => {
          clearInterval(tickInterval);
          setIsSpinning(false);

          if (res.profit > 0) {
            sounds.playBigWin?.();
            confetti({ particleCount: 70, spread: 65, origin: { y: 0.6 } });
            setResultMessage(`Parabéns! Você ganhou +${res.payout} moedas (${res.multiplier}x)!`);
            setResultType('win');
          } else if (res.payout > 0) {
            sounds.playCoin?.();
            setResultMessage(`Você recuperou ${res.payout} moedas (${res.multiplier}x).`);
            setResultType('win');
          } else {
            sounds.playExplosion?.();
            setResultMessage('Que pena! A roleta parou no 0x.');
            setResultType('lose');
          }

          if (onBalanceUpdate && res.currentBalance !== undefined) {
            onBalanceUpdate(res.currentBalance);
          }
        }, 4200);
      } else {
        setIsSpinning(false);
        setResultMessage(res.error || 'Erro ao girar a roleta.');
        setResultType('lose');
      }
    } catch (err) {
      setIsSpinning(false);
      setResultMessage(err.message || 'Erro de comunicação.');
      setResultType('lose');
    }
  };

  return (
    <div className="flex flex-col items-center w-full max-w-md mx-auto space-y-4 select-none">
      {/* Container da Roleta Giratória com Ponteiro */}
      <div className="relative w-64 h-64 sm:w-72 sm:h-72 flex items-center justify-center">
        {/* Ponteiro Superior Indicador */}
        <div className="absolute -top-3 z-30 flex flex-col items-center">
          <div className="w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[18px] border-t-amber-400 drop-shadow-[0_4px_8px_rgba(251,191,36,0.9)]" />
          <div className="w-2 h-2 rounded-full bg-amber-300 shadow-[0_0_8px_rgba(251,191,36,1)] -mt-1" />
        </div>

        {/* Borda Externa Dourada com LEDs */}
        <div className="absolute inset-0 rounded-full border-4 border-amber-500/80 shadow-[0_0_25px_rgba(245,158,11,0.4)] pointer-events-none z-20" />

        {/* Disco Giratório da Roleta */}
        <div
          className="w-full h-full rounded-full overflow-hidden relative shadow-2xl transition-transform duration-[4200ms] ease-[cubic-bezier(0.15,0.9,0.25,1)]"
          style={{ transform: `rotate(${rotationDegrees}deg)` }}
        >
          <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
            {SLICES.map((slice, i) => {
              const angle = 45;
              const startAngle = i * angle;
              const endAngle = (i + 1) * angle;
              const x1 = 50 + 50 * Math.cos((Math.PI * startAngle) / 180);
              const y1 = 50 + 50 * Math.sin((Math.PI * startAngle) / 180);
              const x2 = 50 + 50 * Math.cos((Math.PI * endAngle) / 180);
              const y2 = 50 + 50 * Math.sin((Math.PI * endAngle) / 180);

              const path = `M 50 50 L ${x1} ${y1} A 50 50 0 0 1 ${x2} ${y2} Z`;

              // Posição do texto no meio da fatia
              const textAngle = startAngle + angle / 2;
              const tx = 50 + 33 * Math.cos((Math.PI * textAngle) / 180);
              const ty = 50 + 33 * Math.sin((Math.PI * textAngle) / 180);

              return (
                <g key={slice.id}>
                  <path d={path} fill={slice.color} stroke="#0f172a" strokeWidth="0.75" />
                  <text
                    x={tx}
                    y={ty}
                    fill="#ffffff"
                    fontSize="5"
                    fontWeight="bold"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    transform={`rotate(${textAngle + 90}, ${tx}, ${ty})`}
                  >
                    {slice.label}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Centro da Roleta com Moeda Nexus */}
        <div className="absolute z-20 w-14 h-14 rounded-full bg-slate-950 border-2 border-amber-400 shadow-xl flex items-center justify-center pointer-events-none">
          <img src="/nexus-coin.jpg" alt="Moeda" className="w-10 h-10 rounded-full shadow" />
        </div>
      </div>

      {/* Tabela de Multiplicadores da Roleta */}
      <div className="grid grid-cols-4 gap-1.5 w-full">
        {SLICES.map((s) => (
          <div
            key={s.id}
            className="p-1.5 rounded-xl border border-slate-800/80 bg-slate-900/60 flex flex-col items-center justify-center text-center"
          >
            <span className="text-[10px] text-slate-400 font-semibold">{s.text}</span>
            <span
              className="text-xs font-black"
              style={{ color: s.multiplier > 2 ? '#fbbf24' : s.multiplier > 0 ? '#38bdf8' : '#94a3b8' }}
            >
              {s.label}
            </span>
          </div>
        ))}
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

      {/* Botão de Girar Roleta */}
      <button
        type="button"
        disabled={isSpinning}
        onClick={handleSpin}
        className={`w-full py-3.5 rounded-2xl font-black text-sm tracking-wide shadow-lg transition-all flex items-center justify-center gap-2 active:scale-95 ${
          isSpinning
            ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
            : 'bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 hover:from-amber-400 text-black shadow-amber-500/25'
        }`}
      >
        {isSpinning ? (
          <div className="flex items-center gap-2">
            <Disc3 className="w-4 h-4 animate-spin text-amber-400" />
            <span>GIRANDO ROLETA...</span>
          </div>
        ) : (
          <>
            <Sparkles className="w-4 h-4" />
            <span>GIRAR ROLETA ({betAmount} 🪙)</span>
          </>
        )}
      </button>
    </div>
  );
}
