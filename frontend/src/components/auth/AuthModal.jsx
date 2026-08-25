import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { LogIn, UserPlus, KeyRound, Sparkles, MessageSquare, Shield, CheckCircle } from 'lucide-react';
import confetti from 'canvas-confetti';

export function AuthModal({ isOpen, onClose }) {
  const { login, register, demoUsers, switchDemoUser, isConfigured } = useAuth();
  const [tab, setTab] = useState('login'); // 'login' | 'register' | 'forgot' | 'demo'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    try {
      if (tab === 'login') {
        await login(email, password);
        confetti({ particleCount: 50, spread: 60, origin: { y: 0.8 } });
        onClose();
      } else if (tab === 'register') {
        if (!displayName.trim()) throw new Error('Por favor, informe seu nome.');
        await register(email, password, displayName, username);
        confetti({ particleCount: 70, spread: 80, origin: { y: 0.8 } });
        onClose();
      }
    } catch (err) {
      setError(err.message || 'Ocorreu um erro ao processar.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fadeIn">
      <div className="glass-modal w-full max-w-md rounded-2xl p-6 sm:p-8 shadow-2xl border border-slate-700/60 relative overflow-hidden">
        {/* Glow de fundo */}
        <div className="absolute -top-20 -right-20 w-48 h-48 bg-brand-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-48 h-48 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />

        {/* Header do Modal */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-brand-500/30 mb-3">
            <MessageSquare className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Nexus Chat</h2>
          <p className="text-sm text-slate-400 mt-1">Comunicação em tempo real de alta performance</p>
        </div>

        {/* Tabs de navegação */}
        <div className="flex bg-background-surface/80 p-1 rounded-xl mb-6 border border-slate-700/50">
          <button
            onClick={() => { setTab('login'); setError(''); }}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
              tab === 'login' ? 'bg-brand-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Entrar
          </button>
          <button
            onClick={() => { setTab('register'); setError(''); }}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
              tab === 'register' ? 'bg-brand-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Cadastrar
          </button>
          <button
            onClick={() => { setTab('demo'); setError(''); }}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1 ${
              tab === 'demo' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" /> Teste Rápido
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 rounded-xl bg-green-500/15 border border-green-500/30 text-green-300 text-xs flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Tab Teste Rápido */}
        {tab === 'demo' ? (
          <div className="space-y-3">
            <p className="text-xs text-slate-400 text-center mb-2">
              Selecione um usuário demonstrativo para simular conversas em tempo real instantaneamente:
            </p>
            {demoUsers.map((u) => (
              <button
                key={u.id}
                onClick={() => {
                  switchDemoUser(u.id);
                  onClose();
                }}
                className="w-full flex items-center gap-3 p-3 rounded-xl bg-background-surface hover:bg-background-hover border border-slate-700/50 hover:border-brand-500/50 transition-all text-left group"
              >
                <img
                  src={u.avatar_url}
                  alt={u.display_name}
                  className="w-10 h-10 rounded-full object-cover border border-slate-600"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm text-slate-200 group-hover:text-white truncate">
                      {u.display_name}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand-500/20 text-brand-300 border border-brand-500/30">
                      @{u.username}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 truncate">{u.bio}</p>
                </div>
              </button>
            ))}
          </div>
        ) : (
          /* Formulário de Login / Cadastro */
          <form onSubmit={handleSubmit} className="space-y-4">
            {tab === 'register' && (
              <>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Nome de Exibição</label>
                  <input
                    type="text"
                    required
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Ex: Carlos Silva"
                    className="w-full px-4 py-2.5 rounded-xl bg-background-surface border border-slate-700 text-slate-100 placeholder-slate-500 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Nome de Usuário (@handle)</label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Ex: carlossilva"
                    className="w-full px-4 py-2.5 rounded-xl bg-background-surface border border-slate-700 text-slate-100 placeholder-slate-500 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all"
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">E-mail</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu.email@exemplo.com"
                className="w-full px-4 py-2.5 rounded-xl bg-background-surface border border-slate-700 text-slate-100 placeholder-slate-500 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Senha</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 rounded-xl bg-background-surface border border-slate-700 text-slate-100 placeholder-slate-500 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white font-semibold text-sm shadow-lg shadow-brand-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : tab === 'login' ? (
                <>
                  <LogIn className="w-4 h-4" /> Entrar no Chat
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" /> Criar Conta
                </>
              )}
            </button>
          </form>
        )}

        <div className="mt-6 pt-4 border-t border-slate-800 text-center flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-brand-400" />
            <span>Supabase Auth & RLS</span>
          </div>
          <button
            onClick={onClose}
            className="hover:text-slate-200 transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
