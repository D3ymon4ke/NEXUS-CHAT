import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase, isSupabaseConfigured } from '../../lib/supabaseClient';
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
  AlertCircle
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { sounds } from '../../lib/sound';

export function AuthModal({ isOpen, onClose, onOpenTutorial }) {
  const { login, register, demoUsers, switchDemoUser, isConfigured } = useAuth();
  const [tab, setTab] = useState('login'); // 'login' | 'register' | 'forgot' | 'demo'
  const [email, setEmail] = useState('');
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
        await login(email, password);
        sounds.playPop();
        confetti({ particleCount: 50, spread: 60, origin: { y: 0.8 } });
        onClose();
      } else if (tab === 'register') {
        if (!(displayName || '').trim()) throw new Error('Por favor, informe seu nome de exibição.');
        if ((password || '').length < 6) throw new Error('A senha deve ter pelo menos 6 caracteres.');
        if (password !== confirmPassword) throw new Error('As senhas digitadas não coincidem.');

        await register(email, password, displayName, username, isBetaInvite);
        sounds.playPop();
        confetti({ particleCount: 100, spread: 90, origin: { y: 0.7 } });

        if (isBetaInvite) {
          setBetaRegisteredSuccess(true);
        } else {
          onClose();
          // Disparar Tutorial Interativo após novo cadastro
          if (onOpenTutorial) {
            setTimeout(() => {
              onOpenTutorial();
            }, 400);
          }
        }
      } else if (tab === 'forgot') {
        if (!(email || '').trim()) throw new Error('Por favor, informe seu e-mail cadastrado.');
        if (isSupabaseConfigured && supabase) {
          const { error: resetErr } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: window.location.origin
          });
          if (resetErr) throw resetErr;
        }
        setSuccessMsg('Link de redefinição de senha enviado para o seu e-mail!');
      }
    } catch (err) {
      setError(err.message || 'Ocorreu um erro ao processar sua solicitação.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn select-none">
      <div className="glass-modal w-full max-w-md rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-700/70 relative overflow-hidden flex flex-col max-h-[95vh] overflow-y-auto">
        {/* Glow de Fundo */}
        <div className="absolute -top-20 -right-20 w-52 h-52 bg-brand-500/25 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-52 h-52 bg-purple-600/25 rounded-full blur-3xl pointer-events-none" />

        {/* Header do Modal */}
        <div className="flex flex-col items-center text-center mb-4 relative z-10">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-brand-600 via-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-brand-500/30 mb-3 border border-brand-400/30">
            {isBetaInvite ? <span className="text-3xl">🧪</span> : <MessageSquare className="w-7 h-7 text-white" />}
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight">Nexus Chat</h2>
          <p className="text-xs text-slate-400 mt-0.5">Comunicação e conexão em tempo real</p>

          {/* Banner de Convite de Testador Beta */}
          {isBetaInvite && (
            <div className="mt-3 p-2.5 rounded-2xl bg-cyan-950/60 border border-cyan-500/40 text-left flex items-center gap-2.5 shadow-lg shadow-cyan-500/10 animate-pulse">
              <span className="text-2xl flex-shrink-0">🧪</span>
              <div className="min-w-0">
                <span className="text-[10px] font-extrabold text-cyan-300 uppercase block tracking-wider">
                  Convite Oficial • Testador Beta
                </span>
                <span className="text-[11px] text-slate-300 block">
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
              <h3 className="text-xl font-black text-white mt-2">
                Candidatura em Análise 👑
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed px-2">
                Sua conta foi criada e enviada para confirmação do <strong>Administrador Damon</strong>.
                Assim que for aprovada no Painel, você receberá a <strong>Moldura BETA TESTER</strong> e todas as permissões especiais!
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setBetaRegisteredSuccess(false);
                setTab('login');
              }}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 text-slate-950 font-black text-xs shadow-lg shadow-cyan-500/30 transition-all"
            >
              Fazer Login & Acessar Minha Conta
            </button>
          </div>
        ) : (
          <>
            {/* Tabs de Navegação */}
            <div className="flex bg-background-surface/90 p-1 rounded-2xl mb-5 border border-slate-700/60 relative z-10">
              <button
                type="button"
                onClick={() => { setTab('login'); setError(''); setSuccessMsg(''); }}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                  tab === 'login'
                    ? 'bg-gradient-to-r from-brand-600 to-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Entrar
              </button>
              <button
                type="button"
                onClick={() => { setTab('register'); setError(''); setSuccessMsg(''); }}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                  tab === 'register'
                    ? 'bg-gradient-to-r from-brand-600 to-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {isBetaInvite ? '🧪 Inscrição Beta' : 'Cadastrar'}
              </button>
              <button
                type="button"
                onClick={() => { setTab('demo'); setError(''); setSuccessMsg(''); }}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1 ${
                  tab === 'demo'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-indigo-400 hover:text-indigo-300'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" /> Teste Demo
              </button>
            </div>

        {/* Mensagens de Erro e Sucesso */}
        {error && (
          <div className="mb-4 p-3 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2 animate-shake">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span className="leading-tight">{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Conteúdo: Teste Demo */}
        {tab === 'demo' ? (
          <div className="space-y-2.5 relative z-10">
            <p className="text-xs text-slate-400 text-center mb-1">
              Escolha uma conta demonstrativa para navegar e testar instantaneamente:
            </p>
            {demoUsers.map((u) => (
              <button
                key={u.id}
                type="button"
                onClick={() => {
                  switchDemoUser(u.id);
                  onClose();
                }}
                className="w-full flex items-center gap-3 p-3 rounded-2xl bg-background-surface hover:bg-background-hover border border-slate-700/60 hover:border-brand-500/50 transition-all text-left group"
              >
                <img
                  src={u.avatar_url}
                  alt={u.display_name}
                  className="w-10 h-10 rounded-full object-cover border border-slate-600"
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
        ) : tab === 'forgot' ? (
          /* Formulário de Recuperação de Senha */
          <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
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
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu.email@exemplo.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-background-surface border border-slate-700 text-slate-100 placeholder-slate-500 text-xs focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 text-white font-extrabold text-xs shadow-lg shadow-brand-500/25 transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                'Enviar Link de Recuperação'
              )}
            </button>

            <button
              type="button"
              onClick={() => { setTab('login'); setError(''); setSuccessMsg(''); }}
              className="w-full text-center text-xs text-brand-400 hover:text-brand-300 font-semibold"
            >
              ← Voltar para o Login
            </button>
          </form>
        ) : (
          /* Formulário de Login / Cadastro */
          <form onSubmit={handleSubmit} className="space-y-3.5 relative z-10">
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
                      className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-background-surface border border-slate-700 text-slate-100 placeholder-slate-500 text-xs focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Nome de Usuário (@handle)</label>
                  <div className="relative">
                    <AtSign className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                      placeholder="Ex: carlossilva"
                      className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-background-surface border border-slate-700 text-slate-100 placeholder-slate-500 text-xs focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all"
                    />
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">E-mail</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu.email@exemplo.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-background-surface border border-slate-700 text-slate-100 placeholder-slate-500 text-xs focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-300">Senha</label>
                {tab === 'login' && (
                  <button
                    type="button"
                    onClick={() => { setTab('forgot'); setError(''); }}
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
                  className="w-full pl-10 pr-10 py-2.5 rounded-2xl bg-background-surface border border-slate-700 text-slate-100 placeholder-slate-500 text-xs focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
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
                    className="w-full pl-10 pr-10 py-2.5 rounded-2xl bg-background-surface border border-slate-700 text-slate-100 placeholder-slate-500 text-xs focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 rounded-2xl bg-gradient-to-r from-brand-600 via-indigo-600 to-purple-600 hover:from-brand-500 hover:to-indigo-500 text-white font-extrabold text-xs shadow-lg shadow-brand-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-98"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : tab === 'login' ? (
                <>
                  <LogIn className="w-4 h-4" /> Entrar no Nexus Chat
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" /> Criar Minha Conta & Começar
                </>
              )}
            </button>
          </form>
          )}
        </>
        )}

        {/* Footer do Modal */}
        <div className="mt-5 pt-3.5 border-t border-slate-800/80 text-center flex items-center justify-between text-[11px] text-slate-400 relative z-10">
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
