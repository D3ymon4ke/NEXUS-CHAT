import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { apiRequest } from '../../lib/api';
import { sounds } from '../../lib/sound';
import confetti from 'canvas-confetti';
import {
  ShieldAlert,
  Users,
  Coins,
  Radio,
  Search,
  CheckCircle,
  AlertTriangle,
  UserX,
  UserCheck,
  PlusCircle,
  X,
  Activity,
  Send,
  MessageSquare,
  Sparkles
} from 'lucide-react';

export function AdminModal({ isOpen, onClose }) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('stats'); // 'stats' | 'users' | 'broadcast'
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState({ text: '', type: '' });

  // Broadcast state
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');

  // Coins Modal Substate
  const [selectedUserForCoins, setSelectedUserForCoins] = useState(null);
  const [customCoinsAmount, setCustomCoinsAmount] = useState('100');

  useEffect(() => {
    if (!isOpen) return;
    loadAdminData();
  }, [isOpen]);

  const loadAdminData = async () => {
    try {
      setLoading(true);
      const [statsRes, usersRes] = await Promise.all([
        apiRequest('/admin/stats'),
        apiRequest('/admin/users')
      ]);

      if (statsRes.success) setStats(statsRes.stats);
      if (usersRes.success) setUsers(usersRes.users || []);
    } catch (err) {
      console.error('Erro ao carregar dados admin:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGiveCoins = async (targetUserId, amount) => {
    try {
      setActionLoading(true);
      const res = await apiRequest('/admin/give-coins', {
        method: 'POST',
        body: JSON.stringify({ targetUserId, amount })
      });

      if (res.success) {
        sounds.playPop();
        confetti({ particleCount: 50, spread: 50, origin: { y: 0.6 } });
        setFeedback({ text: res.message, type: 'success' });
        setSelectedUserForCoins(null);
        loadAdminData();
      } else {
        setFeedback({ text: res.error || 'Falha ao conceder moedas.', type: 'error' });
      }
    } catch (err) {
      setFeedback({ text: 'Erro na requisição.', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleBan = async (targetUserId, currentBanStatus) => {
    try {
      setActionLoading(true);
      const res = await apiRequest('/admin/ban-user', {
        method: 'POST',
        body: JSON.stringify({ targetUserId, isBanned: !currentBanStatus })
      });

      if (res.success) {
        setFeedback({ text: res.message, type: 'success' });
        loadAdminData();
      }
    } catch (err) {
      setFeedback({ text: 'Erro ao alterar banimento.', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleSendBroadcast = async (e) => {
    e.preventDefault();
    if (!broadcastMessage.trim()) return;

    try {
      setActionLoading(true);
      const res = await apiRequest('/admin/broadcast', {
        method: 'POST',
        body: JSON.stringify({
          title: broadcastTitle.trim() || 'Comunicado Oficial',
          message: broadcastMessage.trim()
        })
      });

      if (res.success) {
        sounds.playSent();
        setFeedback({ text: res.message, type: 'success' });
        setBroadcastTitle('');
        setBroadcastMessage('');
      } else {
        setFeedback({ text: res.error || 'Erro ao transmitir.', type: 'error' });
      }
    } catch (err) {
      setFeedback({ text: 'Erro ao enviar transmissão.', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  if (!isOpen) return null;

  const filteredUsers = users.filter((u) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (u.username || '').toLowerCase().includes(q) ||
      (u.display_name || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn select-none">
      <div className="glass-modal w-full max-w-4xl rounded-3xl p-6 shadow-2xl border border-red-500/30 flex flex-col max-h-[90vh] overflow-hidden relative">
        {/* Glow de Fundo Vermelho/Dourado de Admin */}
        <div className="absolute -top-24 -right-24 w-60 h-60 bg-red-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-60 h-60 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Topbar do Modal Admin */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-600 to-amber-600 flex items-center justify-center text-white shadow-lg shadow-red-500/20 border border-red-400/50">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-extrabold text-white tracking-wide">PAINEL ADMINISTRATIVO</h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/40 font-bold uppercase">
                  Acesso Damon
                </span>
              </div>
              <p className="text-xs text-slate-400">Controle supremo de usuários, economia e transmissões</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-background-surface transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback Alert */}
        {feedback.text && (
          <div
            className={`my-3 p-3 rounded-xl text-xs font-semibold flex items-center gap-2 animate-fadeIn ${
              feedback.type === 'success'
                ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
                : 'bg-rose-500/15 border border-rose-500/30 text-rose-300'
            }`}
          >
            <span>{feedback.type === 'success' ? '✅' : '⚠️'}</span>
            <span>{feedback.text}</span>
          </div>
        )}

        {/* Abas do Painel */}
        <div className="flex bg-background-surface/80 p-1 rounded-2xl border border-slate-800 my-4">
          {[
            { id: 'stats', label: 'Métricas do Servidor', icon: Activity },
            { id: 'users', label: 'Gerenciador de Usuários', icon: Users },
            { id: 'broadcast', label: 'Transmissão Belmont', icon: Radio }
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
                    ? 'bg-gradient-to-r from-red-600 to-amber-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Conteúdo das Abas */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-4">
          {/* ABA 1: MÉTRICAS */}
          {activeTab === 'stats' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-4 rounded-2xl bg-background-surface/80 border border-slate-800 flex flex-col justify-between">
                  <div className="flex items-center justify-between text-slate-400 mb-2">
                    <span className="text-xs font-bold">Total Usuários</span>
                    <Users className="w-4 h-4 text-brand-400" />
                  </div>
                  <span className="text-2xl font-extrabold text-white">{stats?.totalUsers || 0}</span>
                </div>

                <div className="p-4 rounded-2xl bg-background-surface/80 border border-slate-800 flex flex-col justify-between">
                  <div className="flex items-center justify-between text-slate-400 mb-2">
                    <span className="text-xs font-bold">Total Mensagens</span>
                    <MessageSquare className="w-4 h-4 text-cyan-400" />
                  </div>
                  <span className="text-2xl font-extrabold text-white">{stats?.totalMessages || 0}</span>
                </div>

                <div className="p-4 rounded-2xl bg-background-surface/80 border border-slate-800 flex flex-col justify-between">
                  <div className="flex items-center justify-between text-slate-400 mb-2">
                    <span className="text-xs font-bold">Moedas em Circulação</span>
                    <Coins className="w-4 h-4 text-amber-400" />
                  </div>
                  <span className="text-2xl font-extrabold text-amber-300">
                    {stats?.totalCoinsInCirculation?.toLocaleString() || 0} 🪙
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-background-surface/80 border border-slate-800 flex flex-col justify-between">
                  <div className="flex items-center justify-between text-slate-400 mb-2">
                    <span className="text-xs font-bold">Status da VPS</span>
                    <Activity className="w-4 h-4 text-emerald-400" />
                  </div>
                  <span className="text-sm font-extrabold text-emerald-400 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                    ONLINE (187.127.40.228)
                  </span>
                </div>
              </div>

              {/* Informações da Sala Principal */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-950/30 to-slate-900 border border-amber-500/30 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img src="/belmont-logo.jpg" alt="Belmont" className="w-12 h-12 rounded-xl object-cover border border-amber-500/60" />
                  <div>
                    <h4 className="text-sm font-extrabold text-amber-300">BELMONT CONFERENCE (SALA SUPREMA)</h4>
                    <p className="text-xs text-slate-400">ID Fixo: 00000000-0000-0000-0000-000000000001 (Permanente & Inviolável)</p>
                  </div>
                </div>
                <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-bold">
                  Protegida 🔒
                </span>
              </div>
            </div>
          )}

          {/* ABA 2: GERENCIADOR DE USUÁRIOS */}
          {activeTab === 'users' && (
            <div className="space-y-3">
              {/* Barra de Busca de Usuário */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar usuário por @username ou nome..."
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-background-surface border border-slate-700 text-xs text-white placeholder-slate-500 focus:border-red-500"
                />
              </div>

              {/* Tabela de Usuários */}
              <div className="border border-slate-800 rounded-2xl overflow-hidden">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-background-surface/90 text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="p-3">Usuário</th>
                      <th className="p-3">Cargo</th>
                      <th className="p-3">Nexus Coins</th>
                      <th className="p-3">Sequência</th>
                      <th className="p-3 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 bg-background-card/50">
                    {filteredUsers.map((u) => {
                      const isUserDamon = u.username?.toLowerCase() === 'damon' || u.role === 'admin';
                      return (
                        <tr key={u.id} className="hover:bg-white/5 transition-colors">
                          <td className="p-3 flex items-center gap-2.5">
                            <img
                              src={u.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${u.id}`}
                              alt=""
                              className="w-8 h-8 rounded-full object-cover border border-slate-700"
                            />
                            <div>
                              <div className="font-bold text-white flex items-center gap-1">
                                {u.display_name}
                                {isUserDamon && <span className="text-[10px] text-red-400 font-extrabold">[ADMIN]</span>}
                              </div>
                              <div className="text-[11px] text-slate-400">@{u.username}</div>
                            </div>
                          </td>
                          <td className="p-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                isUserDamon
                                  ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                                  : 'bg-slate-800 text-slate-300'
                              }`}
                            >
                              {u.role || 'user'}
                            </span>
                          </td>
                          <td className="p-3 font-extrabold text-amber-300">
                            {u.nexus_coins || 0} 🪙
                          </td>
                          <td className="p-3 text-slate-400 font-semibold">
                            {u.daily_streak || 0} dias 🔥
                          </td>
                          <td className="p-3 text-right space-x-1.5">
                            {/* Botão Conceder Moedas */}
                            <button
                              onClick={() => setSelectedUserForCoins(u)}
                              className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30 transition-colors font-bold text-[11px]"
                              title="Dar Nexus Coins"
                            >
                              + Moedas
                            </button>

                            {/* Botão Banir/Desbanir */}
                            {!isUserDamon && (
                              <button
                                onClick={() => handleToggleBan(u.id, u.is_banned)}
                                className={`px-2.5 py-1 rounded-lg border font-bold text-[11px] transition-colors ${
                                  u.is_banned
                                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/30'
                                    : 'bg-rose-500/20 text-rose-300 border-rose-500/30 hover:bg-rose-500/30'
                                }`}
                              >
                                {u.is_banned ? 'Desbanir' : 'Banir'}
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ABA 3: TRANSMISSÃO BELMONT */}
          {activeTab === 'broadcast' && (
            <form onSubmit={handleSendBroadcast} className="space-y-4 p-4 rounded-2xl bg-background-surface/80 border border-slate-800">
              <div className="flex items-center gap-2 text-amber-300 font-bold text-sm">
                <Radio className="w-4 h-4 text-red-400 animate-pulse" />
                Transmitir Anúncio Global para Todos os Usuários
              </div>
              <p className="text-xs text-slate-400">
                Esta mensagem será enviada instantaneamente na sala **BELMONT CONFERENCE** com destaque especial de administrador.
              </p>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Título do Anúncio</label>
                <input
                  type="text"
                  value={broadcastTitle}
                  onChange={(e) => setBroadcastTitle(e.target.value)}
                  placeholder="Ex: Atualização do Servidor / Evento de Moedas em Dobro"
                  className="w-full px-3.5 py-2 rounded-xl bg-background-dark border border-slate-700 text-xs text-white placeholder-slate-500 focus:border-red-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Mensagem do Comunicado (Suporta Markdown)</label>
                <textarea
                  rows={4}
                  value={broadcastMessage}
                  onChange={(e) => setBroadcastMessage(e.target.value)}
                  placeholder="Escreva a mensagem oficial aqui..."
                  className="w-full px-3.5 py-2 rounded-xl bg-background-dark border border-slate-700 text-xs text-white placeholder-slate-500 focus:border-red-500 resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={actionLoading || !broadcastMessage.trim()}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-extrabold text-xs shadow-lg transition-all flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                {actionLoading ? 'Transmitindo...' : 'Transmitir Anúncio Oficial'}
              </button>
            </form>
          )}
        </div>

        {/* Modal de Conceder Moedas */}
        {selectedUserForCoins && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
            <div className="glass-modal w-full max-w-sm rounded-2xl p-5 border border-amber-500/40 shadow-2xl">
              <h3 className="text-sm font-bold text-white mb-1">
                Conceder Nexus Coins para @{selectedUserForCoins.username}
              </h3>
              <p className="text-xs text-slate-400 mb-3">Saldo atual: {selectedUserForCoins.nexus_coins || 0} 🪙</p>

              <div className="grid grid-cols-3 gap-2 mb-3">
                {['100', '500', '1000'].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setCustomCoinsAmount(amt)}
                    className={`py-1.5 rounded-xl font-bold text-xs border ${
                      customCoinsAmount === amt
                        ? 'bg-amber-500 text-black border-amber-400'
                        : 'bg-background-surface text-slate-300 border-slate-700'
                    }`}
                  >
                    +{amt}
                  </button>
                ))}
              </div>

              <input
                type="number"
                value={customCoinsAmount}
                onChange={(e) => setCustomCoinsAmount(e.target.value)}
                placeholder="Quantidade personalizada"
                className="w-full px-3 py-2 rounded-xl bg-background-dark border border-slate-700 text-xs text-white mb-4"
              />

              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedUserForCoins(null)}
                  className="flex-1 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => handleGiveCoins(selectedUserForCoins.id, customCoinsAmount)}
                  disabled={actionLoading}
                  className="flex-1 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-black font-extrabold text-xs shadow"
                >
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
