import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { apiRequest } from '../../lib/api';
import { sounds } from '../../lib/sound';
import confetti from 'canvas-confetti';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  Send,
  History,
  Flame,
  Sparkles,
  X,
  CreditCard,
  TrendingUp,
  Coins,
  ShieldCheck
} from 'lucide-react';

export function NexusWalletModal({ isOpen, onClose }) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('history'); // 'history' | 'transfer'
  const [wallet, setWallet] = useState(null);
  const [loading, setLoading] = useState(false);
  const [transferring, setTransferring] = useState(false);

  // Transfer form
  const [targetUsername, setTargetUsername] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [feedback, setFeedback] = useState({ text: '', type: '' });

  useEffect(() => {
    if (!isOpen) return;
    loadWallet();
  }, [isOpen]);

  const loadWallet = async () => {
    try {
      setLoading(true);
      const res = await apiRequest('/wallet');
      if (res.success) {
        setWallet(res.wallet);
      }
    } catch (err) {
      console.error('Erro ao carregar carteira:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTransfer = async (e) => {
    e.preventDefault();
    const amount = parseInt(transferAmount, 10);
    if (!targetUsername.trim() || isNaN(amount) || amount <= 0) {
      setFeedback({ text: 'Informe um destinatário e uma quantidade válida.', type: 'error' });
      return;
    }

    try {
      setTransferring(true);
      setFeedback({ text: '', type: '' });
      const res = await apiRequest('/wallet/transfer', {
        method: 'POST',
        body: JSON.stringify({
          targetUsername: targetUsername.trim(),
          amount
        })
      });

      if (res.success) {
        sounds.playSent();
        confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
        setFeedback({ text: res.message, type: 'success' });
        setTargetUsername('');
        setTransferAmount('');
        loadWallet();
      } else {
        setFeedback({ text: res.error || 'Erro ao realizar transferência.', type: 'error' });
      }
    } catch (err) {
      setFeedback({ text: 'Erro de conexão.', type: 'error' });
    } finally {
      setTransferring(false);
    }
  };

  if (!isOpen || !user) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/85 backdrop-blur-xl animate-fadeIn select-none overflow-hidden box-border">
      <div className="glass-modal w-full max-w-xl rounded-2xl sm:rounded-3xl p-3.5 sm:p-6 shadow-2xl border border-amber-500/30 flex flex-col h-full max-h-[96vh] sm:max-h-[90vh] overflow-hidden relative min-w-0 box-border">
        {/* Glow de Fundo */}
        <div className="absolute -top-24 -right-24 w-60 h-60 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-60 h-60 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Topbar do Modal da Carteira */}
        <div className="flex items-center justify-between pb-3 sm:pb-4 border-b border-slate-800 flex-shrink-0 min-w-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1 mr-2">
            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-gradient-to-br from-amber-500 to-yellow-600 flex items-center justify-center text-black shadow-lg shadow-amber-500/20 flex-shrink-0">
              <Wallet className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <h2 className="text-sm sm:text-lg font-extrabold text-white tracking-wide truncate">CARTEIRA NEXUS</h2>
                <span className="text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold uppercase flex-shrink-0">
                  Digital Asset
                </span>
              </div>
              <p className="text-[10px] sm:text-xs text-slate-400 truncate">Extrato de ganhos e transferências</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-background-surface transition-colors flex-shrink-0"
            title="Fechar carteira"
            aria-label="Fechar carteira"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* Cartão Holográfico Digital Nexus Card */}
        <div className="my-2.5 sm:my-4 p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-slate-900 via-amber-950/40 to-slate-950 border border-amber-400/40 shadow-2xl relative overflow-hidden flex-shrink-0 min-w-0">
          <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
            <Coins className="w-32 h-32 text-amber-400" />
          </div>

          <div className="flex justify-between items-start mb-3 sm:mb-4 gap-2 min-w-0">
            <div className="min-w-0 flex-1">
              <span className="text-[9px] sm:text-[10px] uppercase font-extrabold text-amber-400/90 tracking-wider block">Saldo Disponível</span>
              <div className="flex items-center gap-1.5 sm:gap-2 mt-0.5 min-w-0">
                <img src="/nexus-coin.jpg" alt="Moeda" className="w-5 h-5 sm:w-7 sm:h-7 rounded-full shadow-md flex-shrink-0" />
                <span className="text-xl sm:text-3xl font-extrabold text-white tracking-tight truncate">
                  {(wallet?.balance || user?.nexus_coins || 0).toLocaleString()}
                </span>
                <span className="text-[10px] sm:text-xs font-bold text-amber-300 flex-shrink-0">COINS</span>
              </div>
            </div>

            <div className="flex items-center gap-1 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] sm:text-xs font-bold flex-shrink-0">
              <Flame className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              <span>{wallet?.dailyStreak || 0}d Streak</span>
            </div>
          </div>

          <div className="flex justify-between items-center pt-2.5 sm:pt-3 border-t border-white/10 text-[11px] sm:text-xs text-slate-400 gap-2">
            <div className="min-w-0 truncate">
              <span className="block text-[9px] sm:text-[10px] text-slate-500 font-semibold">Titular</span>
              <span className="font-bold text-slate-200 truncate block">@{user?.username || 'usuario'}</span>
            </div>
            <div className="text-right min-w-0 truncate">
              <span className="block text-[9px] sm:text-[10px] text-slate-500 font-semibold">Total Ganho</span>
              <span className="font-bold text-emerald-400 truncate block">+{wallet?.totalEarned || 0}</span>
            </div>
          </div>
        </div>

        {feedback.text && (
          <div
            className={`mb-3 p-3 rounded-xl text-xs font-semibold flex items-center gap-2 animate-fadeIn ${
              feedback.type === 'success'
                ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
                : 'bg-rose-500/15 border border-rose-500/30 text-rose-300'
            }`}
          >
            <span>{feedback.type === 'success' ? '✨' : '⚠️'}</span>
            <span>{feedback.text}</span>
          </div>
        )}

        {/* Abas: Extrato / Transferir */}
        <div className="flex bg-background-surface/80 p-1 rounded-2xl border border-slate-800 mb-3">
          {[
            { id: 'history', label: 'Histórico de Transações', icon: History },
            { id: 'transfer', label: 'Transferir para Amigo', icon: Send }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setFeedback({ text: '', type: '' });
                }}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                  isActive
                    ? 'bg-gradient-to-r from-amber-600 to-yellow-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Conteúdo da Carteira */}
        <div className="flex-1 overflow-y-auto pr-1 min-h-[220px]">
          {activeTab === 'history' && (
            <div className="space-y-2">
              {loading ? (
                <div className="flex justify-center py-8 text-xs text-slate-400">Carregando extrato...</div>
              ) : (wallet?.transactions || []).length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-500">Nenhuma transação registrada ainda.</div>
              ) : (
                wallet.transactions.map((tx) => {
                  const isPositive = tx.amount > 0;
                  return (
                    <div
                      key={tx.id}
                      className="p-3 rounded-2xl bg-background-surface/60 border border-slate-800 flex items-center justify-between hover:border-slate-700 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                            isPositive
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                              : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                          }`}
                        >
                          {isPositive ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-200">{tx.description}</div>
                          <div className="text-[10px] text-slate-500">
                            {format(new Date(tx.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          </div>
                        </div>
                      </div>

                      <div
                        className={`text-xs font-extrabold flex items-center gap-1 ${
                          isPositive ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        <span>{isPositive ? `+${tx.amount}` : tx.amount}</span>
                        <span className="text-[10px] text-slate-400">🪙</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {activeTab === 'transfer' && (
            <form onSubmit={handleTransfer} className="space-y-3.5 p-4 rounded-2xl bg-background-surface/80 border border-slate-800">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Destinatário (@username)</label>
                <input
                  type="text"
                  value={targetUsername}
                  onChange={(e) => setTargetUsername(e.target.value)}
                  placeholder="Ex: @amigo ou username"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-background-dark border border-slate-700 text-xs text-white placeholder-slate-500 focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Quantidade de Moedas</label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    max={wallet?.balance || 100}
                    value={transferAmount}
                    onChange={(e) => setTransferAmount(e.target.value)}
                    placeholder="Ex: 50"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-background-dark border border-slate-700 text-xs text-white placeholder-slate-500 focus:border-amber-500"
                  />
                  <button
                    type="button"
                    onClick={() => setTransferAmount(String(wallet?.balance || 0))}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-extrabold px-2 py-0.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40"
                  >
                    MÁXIMO
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={transferring || !targetUsername || !transferAmount}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 text-black font-extrabold text-xs shadow-lg transition-all flex items-center justify-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                {transferring ? 'Transferindo...' : 'Enviar Moedas Instantaneamente'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
