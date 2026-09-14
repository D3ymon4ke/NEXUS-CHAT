import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { sounds } from '../../lib/sound';
import { MinesGame } from './MinesGame';
import { WheelGame } from './WheelGame';
import { DoubleGame } from './DoubleGame';
import {
  X,
  Sparkles,
  Volume2,
  VolumeX,
  ShieldCheck,
  Coins,
  Flame,
  Info,
  Bomb,
  Disc3,
  CircleDot
} from 'lucide-react';

export function NexusCasinoModal({ isOpen, onClose }) {
  const { user, updateProfile } = useAuth();
  const [activeTab, setActiveTab] = useState('mines'); // 'mines' | 'wheel' | 'double' | 'rules'
  const [betAmount, setBetAmount] = useState(10);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Sincronizar estado do som com a biblioteca sound.js
  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    sounds.enabled = next;
  };

  const currentCoins = user?.nexus_coins || 0;

  // Atualizador de saldo em tempo real
  const handleBalanceUpdate = (newBalance) => {
    if (updateProfile && typeof newBalance === 'number') {
      updateProfile({ nexus_coins: newBalance });
    }
  };

  // Funções rápidas de ajuste de aposta
  const setQuickBet = (amount) => {
    setBetAmount(Math.min(Math.max(5, amount), Math.min(500, currentCoins)));
    sounds.playPop?.();
  };

  const handleDoubleBet = () => {
    setBetAmount((prev) => Math.min(Math.max(5, prev * 2), Math.min(500, currentCoins)));
    sounds.playPop?.();
  };

  const handleHalfBet = () => {
    setBetAmount((prev) => Math.max(5, Math.floor(prev / 2)));
    sounds.playPop?.();
  };

  const handleMaxBet = () => {
    setBetAmount(Math.min(500, Math.max(5, currentCoins)));
    sounds.playPop?.();
  };

  if (!isOpen || !user) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center safe-modal-overlay bg-black/85 backdrop-blur-xl animate-fadeIn select-none overflow-hidden box-border">
      <div className="w-full max-w-xl rounded-2xl sm:rounded-3xl p-3 sm:p-5 shadow-2xl border border-amber-500/40 bg-gradient-to-b from-slate-900/95 via-background-darker/95 to-slate-950/95 flex flex-col h-full max-h-[100%] overflow-hidden relative backdrop-blur-2xl min-w-0 box-border">
        {/* Glows Decorativos de Fundo */}
        <div className="absolute -top-24 -right-24 w-60 h-60 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-60 h-60 bg-purple-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* 1. TOPBAR DO CASSINO (MOBILE COMPACTO) */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 flex-shrink-0 min-w-0">
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-amber-400 via-yellow-500 to-amber-600 flex items-center justify-center text-black shadow-lg shadow-amber-500/30 flex-shrink-0">
              <span className="text-xl">🎰</span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h2 className="text-sm sm:text-base font-black text-white tracking-wide truncate">
                  CASSINO NEXUS
                </h2>
                <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold uppercase flex-shrink-0">
                  Fair Play
                </span>
              </div>
              <p className="text-[10px] sm:text-xs text-slate-400 truncate">Minigames solo balanceados</p>
            </div>
          </div>

          {/* Saldo de Coins & Ações da Topbar */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-black/60 border border-amber-500/50 shadow backdrop-blur-sm">
              <img src="/nexus-coin.jpg" alt="Moeda" className="w-3.5 h-3.5 rounded-full flex-shrink-0" />
              <span className="text-xs font-black text-amber-300">{currentCoins.toLocaleString()}</span>
            </div>

            <button
              onClick={toggleSound}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title={soundEnabled ? 'Desativar Sons' : 'Ativar Sons'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-amber-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Fechar Cassino"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 2. NAVEGAÇÃO DE ABAS / JOGOS */}
        <div className="flex items-center gap-1.5 py-2.5 overflow-x-auto no-scrollbar border-b border-slate-800/80 flex-shrink-0">
          <button
            onClick={() => {
              setActiveTab('mines');
              sounds.playPop?.();
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all ${
              activeTab === 'mines'
                ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-black shadow-md shadow-amber-500/20 scale-102'
                : 'bg-slate-900/80 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <Bomb className="w-3.5 h-3.5" />
            <span>Mines</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('wheel');
              sounds.playPop?.();
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all ${
              activeTab === 'wheel'
                ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-black shadow-md shadow-amber-500/20 scale-102'
                : 'bg-slate-900/80 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <Disc3 className="w-3.5 h-3.5" />
            <span>Roleta</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('double');
              sounds.playPop?.();
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all ${
              activeTab === 'double'
                ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-black shadow-md shadow-amber-500/20 scale-102'
                : 'bg-slate-900/80 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <CircleDot className="w-3.5 h-3.5" />
            <span>Double</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('rules');
              sounds.playPop?.();
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all ${
              activeTab === 'rules'
                ? 'bg-slate-800 text-amber-300 border border-amber-500/40'
                : 'bg-slate-900/80 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <Info className="w-3.5 h-3.5" />
            <span>Regras</span>
          </button>
        </div>

        {/* 3. CORPO DO JOGO SELECIONADO (SCROLLABLE) */}
        <div className="flex-1 overflow-y-auto py-2.5 sm:py-3 px-1 min-h-0">
          {activeTab === 'mines' && (
            <MinesGame
              betAmount={betAmount}
              userBalance={currentCoins}
              onBalanceUpdate={handleBalanceUpdate}
            />
          )}

          {activeTab === 'wheel' && (
            <WheelGame
              betAmount={betAmount}
              userBalance={currentCoins}
              onBalanceUpdate={handleBalanceUpdate}
            />
          )}

          {activeTab === 'double' && (
            <DoubleGame
              betAmount={betAmount}
              userBalance={currentCoins}
              onBalanceUpdate={handleBalanceUpdate}
            />
          )}

          {activeTab === 'rules' && (
            <div className="space-y-3 p-2 text-slate-300 text-xs leading-relaxed animate-fadeIn">
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-2.5">
                <ShieldCheck className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-bold text-amber-300">Economia Protegida & Fair Play</h3>
                  <p className="text-[11px] text-slate-300 mt-1">
                    Todos os jogos foram desenvolvidos com margem matemática equilibrada (~3% a 4%),
                    proporcionando entretenimento com risco controlado para não quebrar a economia do chat.
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
                <h4 className="font-bold text-white text-xs uppercase tracking-wide">💎 Mines (Campo Minado)</h4>
                <p className="text-[11px] text-slate-400">
                  Defina o número de minas (1 a 10). A cada diamante revelado, o prêmio multiplica.
                  Você pode clicar em <strong>Sacar</strong> a qualquer momento para resgatar seus lucros.
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
                <h4 className="font-bold text-white text-xs uppercase tracking-wide">🎡 Roleta da Fortuna</h4>
                <p className="text-[11px] text-slate-400">
                  Gire a roda e concorra a multiplicadores de 0.5x, 1.2x, 1.5x, 2x, 3x, 5x e ao lendário Jackpot de 10x!
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
                <h4 className="font-bold text-white text-xs uppercase tracking-wide">🎯 Double (Roleta de Cores)</h4>
                <p className="text-[11px] text-slate-400">
                  Escolha Vermelho (2x), Preto (2x) ou arrisque no Dourado Nexus (14x). A fita sorteia um número de 0 a 14.
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between text-[11px]">
                <span className="text-slate-400">Limites de Aposta por Rodada:</span>
                <span className="font-bold text-amber-400">Min: 5 🪙 | Máx: 500 🪙</span>
              </div>
            </div>
          )}
        </div>

        {/* 4. BARRA DE CONTROLE DE APOSTAS ERGONÔMICA (MOBILE-FIRST) */}
        {activeTab !== 'rules' && (
          <div className="pt-2.5 border-t border-slate-800 flex-shrink-0 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                <Coins className="w-3.5 h-3.5 text-amber-400" />
                Valor da Aposta:
              </span>

              {/* Input Numérico Manual */}
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-950 border border-slate-700/80 focus-within:border-amber-400">
                <input
                  type="number"
                  min="5"
                  max="500"
                  value={betAmount}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    if (!isNaN(val)) {
                      setBetAmount(Math.min(500, Math.max(0, val)));
                    } else {
                      setBetAmount(0);
                    }
                  }}
                  className="w-16 bg-transparent text-right font-black text-amber-300 text-xs focus:outline-none"
                />
                <span className="text-[10px] font-extrabold text-slate-500">🪙</span>
              </div>
            </div>

            {/* Presets Táteis Rápidos */}
            <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
              {[10, 25, 50, 100].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setQuickBet(amt)}
                  className={`py-1 rounded-lg text-[10px] font-bold transition-all active:scale-95 ${
                    betAmount === amt
                      ? 'bg-amber-500 text-black font-black shadow'
                      : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700'
                  }`}
                >
                  +{amt}
                </button>
              ))}

              <button
                type="button"
                onClick={handleHalfBet}
                className="py-1 rounded-lg text-[10px] font-bold bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 active:scale-95"
                title="Metade da Aposta"
              >
                ½
              </button>

              <button
                type="button"
                onClick={handleDoubleBet}
                className="py-1 rounded-lg text-[10px] font-bold bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 active:scale-95"
                title="Dobrar Aposta"
              >
                2X
              </button>

              <button
                type="button"
                onClick={handleMaxBet}
                className="py-1 rounded-lg text-[10px] font-black bg-gradient-to-r from-amber-500 to-yellow-500 text-black shadow active:scale-95"
                title="Aposta Máxima"
              >
                MÁX
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
