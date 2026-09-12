import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase, isSupabaseConfigured } from '../../lib/supabaseClient';
import { getFrameAsset, getFrameStyle } from '../../lib/shopCatalog';
import {
  LogIn,
  UserPlus,
  KeyRound,
  Sparkles,
  MessageSquare,
  Shield,
  CheckCircle,
  Eye,
  EyeOff,
  HelpCircle,
  Mail,
  Lock,
  User,
  AtSign,
  AlertCircle,
  Users,
  ArrowRight,
  Trash2,
  X
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { sounds } from '../../lib/sound';
import { haptics } from '../../lib/haptics';

export function AuthModal({ isOpen, onClose, onOpenTutorial }) {
  const {
    login,
    register,
    demoUsers,
    switchDemoUser,
    isConfigured,
    savedAccounts = [],
    switchToAccount,
    removeSavedAccount
  } = useAuth();

  const [tab, setTab] = useState(() => {
    try {
      const raw = localStorage.getItem('nexus_saved_accounts');
      if (raw && JSON.parse(raw).length > 0) return 'saved';
    } catch (e) {}
    return 'login';
  }); // 'saved' | 'login' | 'register' | 'forgot' | 'demo'

  const [identifier, setIdentifier] = useState(''); // Email ou Username
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isBetaInvite, setIsBetaInvite] = useState(false);
  const [betaRegisteredSuccess, setBetaRegisteredSuccess] = useState(false);

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('beta') === 'true' || params.get('beta_invite') === 'true' || params.get('ref') === 'beta') {
        setIsBetaInvite(true);
        setTab('register');
      }
    }
  }, []);

  // Se não houver contas salvas e a aba for 'saved', redireciona para 'login'
  React.useEffect(() => {
    if (tab === 'saved' && savedAccounts.length === 0) {
      setTab('login');
    }
  }, [tab, savedAccounts.length]);

  if (!isOpen) return null;

  // Cálculo da Força da Senha
  const calculatePasswordStrength = (pass) => {
    if (!pass) return { score: 0, label: 'Vazia', color: 'bg-slate-700' };
    let score = 0;
    if (pass.length >= 6) score += 1;
    if (pass.length >= 10) score += 1;
    if (/[A-Z]/.test(pass)) score += 1;
    if (/[0-9]/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass)) score += 1;

    if (score <= 2) return { score: 1, label: 'Fraca', color: 'bg-rose-500', width: '33%' };
    if (score <= 4) return { score: 2, label: 'Boa', color: 'bg-amber-500', width: '66%' };
    return { score: 3, label: 'Excelente 🛡️', color: 'bg-emerald-500', width: '100%' };
  };

  const passwordStrength = calculatePasswordStrength(password);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    try {
      if (tab === 'login') {
        if (!identifier.trim()) throw new Error('Por favor, informe seu e-mail ou nome de usuário.');
        if (!password) throw new Error('Por favor, digite sua senha.');

        await login(identifier.trim(), password);
        sounds.playPop();
        haptics.success();
        confetti({ particleCount: 60, spread: 60, origin: { y: 0.8 } });
        onClose();
      } else if (tab === 'register') {
        if (!(displayName || '').trim()) throw new Error('Por favor, informe seu nome de exibição.');
        if ((password || '').length < 6) throw new Error('A senha deve ter pelo menos 6 caracteres.');
        if (password !== confirmPassword) throw new Error('As senhas digitadas não coincidem.');

        await register(identifier.trim(), password, displayName, username, isBetaInvite);
        sounds.playPop();
        haptics.success();
        confetti({ particleCount: 100, spread: 90, origin: { y: 0.7 } });

        if (isBetaInvite) {
          setBetaRegisteredSuccess(true);
        } else {
          onClose();
          if (onOpenTutorial) {
            setTimeout(() => {
              onOpenTutorial();
            }, 400);
          }
        }
      } else if (tab === 'forgot') {
        if (!(identifier || '').trim()) throw new Error('Por favor, informe seu e-mail cadastrado.');
        if (isSupabaseConfigured && supabase) {
          const { error: resetErr } = await supabase.auth.resetPasswordForEmail(identifier.trim(), {
            redirectTo: window.location.origin
          });
          if (resetErr) throw resetErr;
        }
        setSuccessMsg('Link de redefinição de senha enviado para o seu e-mail!');
      }
    } catch (err) {
      sounds.playPop();
      haptics.error();
      setError(err.message || 'Ocorreu um erro ao processar sua solicitação.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickSwitch = async (acc) => {
    try {
      setLoading(true);
      sounds.playPop();
      haptics.success();
      await switchToAccount(acc);
      onClose();
    } catch (err) {
      setError('Erro ao alternar conta.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/85 backdrop-blur-xl animate-fadeIn select-none">
      <div className="glass-modal w-full sm:max-w-md rounded-t-[2.5rem] sm:rounded-3xl p-5 sm:p-7 shadow-2xl border-t sm:border border-slate-700/80 relative overflow-hidden flex flex-col max-h-[92dvh] sm:max-h-[90vh] overflow-y-auto pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        {/* Barra superior de puxar (Mobile Handle) */}
        <div className="flex justify-center pt-1 pb-2 sm:hidden">
          <div className="w-12 h-1.5 rounded-full bg-slate-700/80" />
        </div>

        {/* Glow de Fundo */}
        <div className="absolute -top-20 -right-20 w-56 h-56 bg-brand-500/25 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-56 h-56 bg-purple-600/25 rounded-full blur-3xl pointer-events-none" />

        {/* Botão Fechar no Canto Superior Direito */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-800 transition z-20"
          title="Fechar"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header do Modal */}
        <div className="flex flex-col items-center text-center mb-4 relative z-10">
          <div className="relative mb-2.5">
            <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-tr from-brand-600 via-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-brand-500/30 border border-brand-400/30">
              {isBetaInvite ? (
                <span className="text-3xl">🧪</span>
              ) : (
                <MessageSquare className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
              )}
            </div>
            <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-slate-900 ring-2 ring-emerald-500/40" />
          </div>

          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">Nexus Chat</h2>
          <p className="text-xs text-slate-400 mt-0.5">Mensagens e conexões em tempo real</p>

          {/* Banner de Convite de Testador Beta */}
          {isBetaInvite && (
            <div className="mt-3 p-2.5 rounded-2xl bg-cyan-950/60 border border-cyan-500/40 text-left flex items-center gap-2.5 shadow-lg shadow-cyan-500/10 animate-pulse w-full">
              <span className="text-2xl flex-shrink-0">🧪</span>
              <div className="min-w-0">
                <span className="text-[10px] font-extrabold text-cyan-300 uppercase block tracking-wider">
                  Convite Oficial • Testador Beta
                </span>
                <span className="text-[11px] text-slate-300 block leading-tight">
                  Cadastre-se para enviar sua inscrição. O Admin Damon liberará seu acesso com a Moldura Beta exclusiva!
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Tela de Sucesso Especial: Inscrição Beta Enviada */}
        {betaRegisteredSuccess ? (
          <div className="space-y-4 text-center py-4 relative z-10 animate-fadeIn">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-cyan-500 to-teal-600 flex items-center justify-center text-4xl mx-auto shadow-2xl shadow-cyan-500/40 ring-4 ring-cyan-400/30 animate-bounce">
              🧪
            </div>
            <div className="space-y-1.5">
              <span className="text-[10px] font-extrabold text-cyan-400 uppercase tracking-widest bg-cyan-500/20 px-3 py-1 rounded-full border border-cyan-500/40">
                Inscrição Enviada com Sucesso!
              </span>
              <h3 className="text-xl font-black text-white mt-2">Candidatura em Análise 👑</h3>
              <p className="text-xs text-slate-300 leading-relaxed px-2">
                Sua conta foi criada e enviada para confirmação do <strong>Administrador Damon</strong>. Assim que for aprovada no Painel, você receberá a <strong>Moldura BETA TESTER</strong> e todas as permissões especiais!
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setBetaRegisteredSuccess(false);
                setTab('login');
              }}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 text-slate-950 font-black text-xs shadow-lg shadow-cyan-500/30 transition-all"
            >
              Fazer Login & Acessar Minha Conta
            </button>
          </div>
        ) : (
          <>
            {/* Tabs de Navegação Mobile-Friendly */}
            <div className="flex bg-background-surface/90 p-1 rounded-2xl mb-4 border border-slate-700/60 relative z-10 overflow-x-auto no-scrollbar gap-1">
              {savedAccounts.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    sounds.playPop();
                    haptics.selection();
                    setTab('saved');
                    setError('');
                    setSuccessMsg('');
                  }}
                  className={`flex-1 min-w-[85px] py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1 ${
                    tab === 'saved'
                      ? 'bg-gradient-to-r from-brand-600 to-indigo-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Salvas ({savedAccounts.length})</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  sounds.playPop();
                  haptics.selection();
                  setTab('login');
                  setError('');
                  setSuccessMsg('');
                }}
                className={`flex-1 min-w-[70px] py-2 text-xs font-bold rounded-xl transition-all ${
                  tab === 'login'
                    ? 'bg-gradient-to-r from-brand-600 to-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Entrar
              </button>

              <button
                type="button"
                onClick={() => {
                  sounds.playPop();
                  haptics.selection();
                  setTab('register');
                  setError('');
                  setSuccessMsg('');
                }}
                className={`flex-1 min-w-[80px] py-2 text-xs font-bold rounded-xl transition-all ${
                  tab === 'register'
                    ? 'bg-gradient-to-r from-brand-600 to-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {isBetaInvite ? '🧪 Inscrição' : 'Cadastrar'}
              </button>

              <button
                type="button"
                onClick={() => {
                  sounds.playPop();
                  haptics.selection();
                  setTab('demo');
                  setError('');
                  setSuccessMsg('');
                }}
                className={`flex-1 min-w-[75px] py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1 ${
                  tab === 'demo'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-indigo-400 hover:text-indigo-300'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" /> Demo
              </button>
            </div>

            {/* Mensagens de Erro e Sucesso */}
            {error && (
              <div className="mb-3.5 p-3 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2 animate-shake">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span className="leading-tight flex-1">{error}</span>
              </div>
            )}

            {successMsg && (
              <div className="mb-3.5 p-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle className="w-4 h-4 flex-shrink-0" />
                <span className="flex-1">{successMsg}</span>
              </div>
            )}

            {/* 1. ABA CONTAS SALVAS (SELETOR RÁPIDO DE 1 TOQUE ESTILO GOOGLE/INSTAGRAM) */}
            {tab === 'saved' && (
              <div className="space-y-3 relative z-10 animate-fadeIn">
                <p className="text-xs text-slate-400 text-center mb-1">
                  Selecione sua conta para entrar com 1 toque neste aparelho:
                </p>

                <div className="space-y-2 max-h-64 overflow-y-auto pr-0.5">
                  {savedAccounts.map((acc) => {
                    const frameAsset = getFrameAsset(acc.equipped_frame);
                    const frameStyle = getFrameStyle(acc.equipped_frame) || (!frameAsset ? 'border border-slate-700' : '');

                    return (
                      <div
                        key={acc.id}
                        onClick={() => handleQuickSwitch(acc)}
                        className="w-full p-3 rounded-2xl bg-background-surface hover:bg-slate-850 border border-slate-700/60 hover:border-brand-500/60 transition-all flex items-center justify-between gap-3 cursor-pointer group active:scale-[0.99] shadow-sm"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="relative flex-shrink-0">
                            <img
                              src={acc.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${acc.id}`}
                              alt=""
                              className={`w-11 h-11 rounded-full object-cover shadow ${frameStyle}`}
                            />
                            {frameAsset && (
                              <img
                                src={frameAsset}
                                alt="Moldura"
                                className="absolute -inset-[22%] w-[144%] h-[144%] max-w-none pointer-events-none object-contain z-10 select-none drop-shadow"
                              />
                            )}
                          </div>

                          <div className="min-w-0 flex-1 text-left">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-sm text-white group-hover:text-brand-300 transition-colors truncate">
                                {acc.display_name || acc.username}
                              </span>
                              {acc.role === 'admin' && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-red-500/20 text-red-400 font-extrabold border border-red-500/30">
                                  ADMIN
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-slate-400 block truncate">@{acc.username}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button
                            type="button"
                            onClick={() => handleQuickSwitch(acc)}
                            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 text-white font-extrabold text-xs shadow-md shadow-brand-500/20 active:scale-95 transition-all flex items-center gap-1"
                          >
                            <span>Entrar</span>
                            <span className="text-amber-300">⚡</span>
                          </button>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              haptics.heavy();
                              removeSavedAccount(acc.id);
                            }}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition"
                            title="Remover das contas salvas"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      sounds.playPop();
                      setTab('login');
                    }}
                    className="w-full py-3 rounded-2xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 text-slate-300 hover:text-white font-bold text-xs transition flex items-center justify-center gap-1.5 active:scale-98"
                  >
                    <span>Entrar com outra conta</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* 2. ABA TESTE DEMO */}
            {tab === 'demo' && (
              <div className="space-y-2.5 relative z-10 animate-fadeIn">
                <p className="text-xs text-slate-400 text-center mb-1">
                  Escolha uma conta demonstrativa para navegar e testar instantaneamente:
                </p>
                {demoUsers.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => {
                      sounds.playPop();
                      haptics.success();
                      switchDemoUser(u.id);
                      onClose();
                    }}
                    className="w-full flex items-center gap-3 p-3 rounded-2xl bg-background-surface hover:bg-background-hover border border-slate-700/60 hover:border-brand-500/50 transition-all text-left group active:scale-98"
                  >
                    <img
                      src={u.avatar_url}
                      alt={u.display_name}
                      className="w-10 h-10 rounded-full object-cover border border-slate-600 flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs sm:text-sm text-slate-200 group-hover:text-white truncate">
                          {u.display_name}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand-500/20 text-brand-300 border border-brand-500/30 font-semibold">
                          @{u.username}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 truncate mt-0.5">{u.bio}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* 3. RECUPERAÇÃO DE SENHA */}
            {tab === 'forgot' && (
              <form onSubmit={handleSubmit} className="space-y-4 relative z-10 animate-fadeIn">
                <p className="text-xs text-slate-400">
                  Digite o e-mail associado à sua conta e enviaremos as instruções para redefinir sua senha.
                </p>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Seu E-mail</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      inputMode="email"
                      autoCapitalize="none"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder="seu.email@exemplo.com"
                      className="w-full pl-10 pr-4 py-3 rounded-2xl bg-background-surface border border-slate-700 text-slate-100 placeholder-slate-500 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 text-white font-extrabold text-xs shadow-lg shadow-brand-500/25 transition-all flex items-center justify-center gap-2 active:scale-98"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    'Enviar Link de Recuperação'
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setTab('login');
                    setError('');
                    setSuccessMsg('');
                  }}
                  className="w-full text-center text-xs text-brand-400 hover:text-brand-300 font-semibold"
                >
                  ← Voltar para o Login
                </button>
              </form>
            )}

            {/* 4. FORMULÁRIO DE LOGIN / CADASTRO COM SUPORTE A EMAIL OU @USERNAME */}
            {(tab === 'login' || tab === 'register') && (
              <form onSubmit={handleSubmit} className="space-y-3 relative z-10 animate-fadeIn">
                {tab === 'register' && (
                  <>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Nome de Exibição</label>
                      <div className="relative">
                        <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          required
                          value={displayName}
                          onChange={(e) => setDisplayName(e.target.value)}
                          placeholder="Ex: Carlos Silva"
                          className="w-full pl-10 pr-4 py-3 rounded-2xl bg-background-surface border border-slate-700 text-slate-100 placeholder-slate-500 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Nome de Usuário (@handle)</label>
                      <div className="relative">
                        <AtSign className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          autoCapitalize="none"
                          autoCorrect="off"
                          value={username}
                          onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                          placeholder="Ex: carlossilva"
                          className="w-full pl-10 pr-4 py-3 rounded-2xl bg-background-surface border border-slate-700 text-slate-100 placeholder-slate-500 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all"
                        />
                      </div>
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    {tab === 'login' ? 'E-mail ou Nome de Usuário (@handle)' : 'E-mail'}
                  </label>
                  <div className="relative">
                    {tab === 'login' && !identifier.includes('@') ? (
                      <AtSign className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    ) : (
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    )}
                    <input
                      type={tab === 'register' ? 'email' : 'text'}
                      required
                      inputMode={tab === 'register' ? 'email' : 'text'}
                      autoCapitalize="none"
                      autoCorrect="off"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder={tab === 'login' ? 'seu.email@exemplo.com ou @usuario' : 'seu.email@exemplo.com'}
                      className="w-full pl-10 pr-4 py-3 rounded-2xl bg-background-surface border border-slate-700 text-slate-100 placeholder-slate-500 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-300">Senha</label>
                    {tab === 'login' && (
                      <button
                        type="button"
                        onClick={() => {
                          setTab('forgot');
                          setError('');
                        }}
                        className="text-[11px] text-brand-400 hover:text-brand-300 transition-colors"
                      >
                        Esqueceu a senha?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-11 py-3 rounded-2xl bg-background-surface border border-slate-700 text-slate-100 placeholder-slate-500 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        haptics.selection();
                        setShowPassword(!showPassword);
                      }}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 p-1"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Medidor de Força de Senha no Cadastro */}
                  {tab === 'register' && password.length > 0 && (
                    <div className="mt-2 space-y-1">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-slate-400">Força da Senha:</span>
                        <span className="font-bold text-slate-300">{passwordStrength.label}</span>
                      </div>
                      <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-full ${passwordStrength.color} transition-all duration-300 rounded-full`}
                          style={{ width: passwordStrength.width }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Confirmação de Senha no Cadastro */}
                {tab === 'register' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Confirmar Senha</label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Repita sua senha"
                        className="w-full pl-10 pr-11 py-3 rounded-2xl bg-background-surface border border-slate-700 text-slate-100 placeholder-slate-500 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          haptics.selection();
                          setShowConfirmPassword(!showConfirmPassword);
                        }}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 p-1"
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-2 py-3.5 rounded-2xl bg-gradient-to-r from-brand-600 via-indigo-600 to-purple-600 hover:from-brand-500 hover:to-indigo-500 text-white font-extrabold text-xs sm:text-sm shadow-lg shadow-brand-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-98 min-h-[48px]"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : tab === 'login' ? (
                    <>
                      <LogIn className="w-4 h-4" />
                      <span>Entrar no Nexus Chat</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      <span>Criar Minha Conta & Começar</span>
                    </>
                  )}
                </button>
              </form>
            )}
          </>
        )}

        {/* Footer do Modal */}
        <div className="mt-4 pt-3 border-t border-slate-800/80 text-center flex items-center justify-between text-[11px] text-slate-400 relative z-10">
          <div className="flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-brand-400" />
            <span>Supabase Auth Seguro</span>
          </div>

          <div className="flex items-center gap-3">
            {onOpenTutorial && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenTutorial();
                }}
                className="text-brand-400 hover:text-brand-300 font-semibold flex items-center gap-1"
              >
                <HelpCircle className="w-3.5 h-3.5" /> Tutorial
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="hover:text-slate-200 transition-colors font-medium"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
