import React, { useState } from 'react';
import { sounds } from '../../lib/sound';
import confetti from 'canvas-confetti';
import {
  Sparkles,
  MessageSquare,
  Music,
  ShoppingBag,
  Smartphone,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  X,
  Flame,
  Shield,
  Layers,
  Crown,
  Share2
} from 'lucide-react';

const TUTORIAL_STEPS = [
  {
    id: 'welcome',
    badge: 'Início',
    title: 'Bem-vindo ao Nexus Chat! 🚀',
    subtitle: 'Comunicação em tempo real de altíssima performance',
    description: 'Você acabou de entrar na melhor experiência de chat moderna. Conecte-se com amigos, personalize seu perfil com música e conquiste recompensas exclusivas.',
    icon: Sparkles,
    gradient: 'from-brand-600 via-indigo-600 to-purple-600',
    highlightItems: [
      { icon: '⚡', title: 'Tempo Real Ultra Rápido', desc: 'Mensagens instantâneas com WebSockets e Supabase' },
      { icon: '🔒', title: 'Segurança Total', desc: 'Row-Level Security e autenticação moderna' },
      { icon: '🎮', title: 'Gamificação Integrada', desc: 'Ganhe Nexus Coins enquanto conversa' }
    ]
  },
  {
    id: 'chats',
    badge: 'Comunicação',
    title: 'Conversas, Grupos & Belmont Conference 💬',
    subtitle: 'Múltiplas formas de interagir',
    description: 'Inicie chats diretos com qualquer usuário, crie grupos com seus amigos ou participe da Belmont Conference, nossa sala de encontro global permanente.',
    icon: MessageSquare,
    gradient: 'from-blue-600 via-cyan-600 to-teal-600',
    highlightItems: [
      { icon: '👥', title: 'Conversas Diretas', desc: 'Chat 1-a-1 com status de digitação e recibos de leitura' },
      { icon: '🛡️', title: 'Belmont Conference', desc: 'O canal permanente para toda a comunidade interagir' },
      { icon: '📎', title: 'Envio de Mídia & Áudio', desc: 'Compartilhe fotos, arquivos e mensagens de voz com 1 clique' }
    ]
  },
  {
    id: 'music_profile',
    badge: 'Personalização',
    title: 'Música Tema no Perfil (Profile Anthem) 🎵',
    subtitle: 'Dê uma trilha sonora ao seu perfil',
    description: 'Cole o link de qualquer música do YouTube, Spotify ou arquivo de áudio no seu perfil. Quando qualquer amigo visitar seu perfil, ele poderá ouvir a sua música!',
    icon: Music,
    gradient: 'from-rose-600 via-pink-600 to-amber-600',
    highlightItems: [
      { icon: '▶️', title: 'YouTube & Spotify', desc: 'O sistema puxa a capa e metadados automaticamente' },
      { icon: '💽', title: 'Player com Disco Giratório', desc: 'Visual retrô com equalizador animado pulsante' },
      { icon: '✨', title: 'Molduras & Badges', desc: 'Equipe molduras neon, ouro e efeitos luminosos' }
    ]
  },
  {
    id: 'economy',
    badge: 'Economia & Loja',
    title: 'Nexus Coins, Carteira & Loja VIP 💰',
    subtitle: 'Recompensas por atividade diária',
    description: 'Cada mensagem e login consecutivo aumentam seu streak diário e rendem moedas Nexus. Use seu saldo na Loja para comprar itens cosméticos raros.',
    icon: ShoppingBag,
    gradient: 'from-amber-600 via-yellow-600 to-orange-600',
    highlightItems: [
      { icon: '🔥', title: 'Daily Streak', desc: 'Faça login todos os dias para acumular bônus de moedas' },
      { icon: '🛍️', title: 'Loja de Cosméticos', desc: 'Compre molduras neon, cores de nome e emblemas VIP' },
      { icon: '💳', title: 'Carteira Nexus', desc: 'Veja seu saldo, histórico de ganhos e faça transferências' }
    ]
  },
  {
    id: 'stories_pwa',
    badge: 'Recursos Pro',
    title: 'Stories & Aplicativo no Celular (PWA) 📱',
    subtitle: 'Tudo na palma da sua mão',
    description: 'Poste fotos temporárias que duram 24 horas na barra superior de Stories e instale o Nexus Chat no seu celular como um app nativo!',
    icon: Smartphone,
    gradient: 'from-emerald-600 via-teal-600 to-cyan-600',
    highlightItems: [
      { icon: '📸', title: 'Stories Temporários', desc: 'Compartilhe momentos com seus contatos' },
      { icon: '📲', title: 'Instalar no Celular', desc: 'Clique no botão verde de download no menu para instalar' },
      { icon: '🔔', title: 'Notificações Sonoras', desc: 'Efeitos sonoros customizados para cada ação' }
    ]
  }
];

export function OnboardingTutorialModal({ isOpen, onClose, onFinish }) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  if (!isOpen) return null;

  const currentStep = TUTORIAL_STEPS[currentStepIndex];
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === TUTORIAL_STEPS.length - 1;
  const StepIcon = currentStep.icon;

  const handleNext = () => {
    if (isLastStep) {
      handleComplete();
    } else {
      setCurrentStepIndex((prev) => prev + 1);
      sounds.playPop();
    }
  };

  const handlePrev = () => {
    if (!isFirstStep) {
      setCurrentStepIndex((prev) => prev - 1);
      sounds.playPop();
    }
  };

  const handleComplete = () => {
    sounds.playPop();
    confetti({
      particleCount: 100,
      spread: 90,
      origin: { y: 0.6 }
    });
    localStorage.setItem('nexus_tutorial_completed', 'true');
    if (onFinish) onFinish();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn select-none">
      <div className="glass-modal w-full max-w-lg rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-700/80 flex flex-col relative overflow-hidden">
        {/* Glow de Fundo dinâmico baseado no passo */}
        <div className={`absolute -top-24 -right-24 w-60 h-60 bg-gradient-to-br ${currentStep.gradient} opacity-25 rounded-full blur-3xl pointer-events-none transition-all duration-500`} />
        <div className={`absolute -bottom-24 -left-24 w-60 h-60 bg-gradient-to-tr ${currentStep.gradient} opacity-20 rounded-full blur-3xl pointer-events-none transition-all duration-500`} />

        {/* Header com indicador e botão Fechar */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800/80">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full bg-brand-500/20 text-brand-300 border border-brand-500/40 text-[10px] font-extrabold uppercase tracking-wider">
              {currentStep.badge}
            </span>
            <span className="text-xs text-slate-400 font-semibold">
              Passo {currentStepIndex + 1} de {TUTORIAL_STEPS.length}
            </span>
          </div>

          <button
            onClick={handleComplete}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-background-surface transition-colors"
            title="Pular Tutorial"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Conteúdo do Slide */}
        <div className="mt-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-2xl bg-gradient-to-tr ${currentStep.gradient} text-white flex items-center justify-center shadow-lg shadow-brand-500/20 flex-shrink-0`}>
              <StepIcon className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-extrabold text-white leading-tight">
                {currentStep.title}
              </h2>
              <p className="text-xs text-brand-300 font-medium">{currentStep.subtitle}</p>
            </div>
          </div>

          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            {currentStep.description}
          </p>

          {/* Destaques em Cards com ícones */}
          <div className="grid grid-cols-1 gap-2.5 pt-2">
            {currentStep.highlightItems.map((item, index) => (
              <div
                key={index}
                className="flex items-start gap-3 p-3 rounded-2xl bg-background-surface/70 border border-slate-800/90 hover:border-slate-700 transition-colors shadow-sm"
              >
                <span className="text-xl flex-shrink-0 mt-0.5">{item.icon}</span>
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-slate-100">{item.title}</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer com Navegação e Indicadores (Dots) */}
        <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between">
          {/* Indicadores de bolinhas (Dots) */}
          <div className="flex items-center gap-1.5">
            {TUTORIAL_STEPS.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentStepIndex(i)}
                className={`h-2 rounded-full transition-all ${
                  i === currentStepIndex
                    ? 'w-6 bg-brand-500 shadow-sm shadow-brand-500/50'
                    : 'w-2 bg-slate-700 hover:bg-slate-600'
                }`}
                title={`Ir para passo ${i + 1}`}
              />
            ))}
          </div>

          {/* Botões de Ação */}
          <div className="flex items-center gap-2">
            {!isFirstStep && (
              <button
                onClick={handlePrev}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold transition-all flex items-center gap-1"
              >
                <ChevronLeft className="w-4 h-4" /> Voltar
              </button>
            )}

            <button
              onClick={handleNext}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold shadow-lg transition-all flex items-center gap-1.5 active:scale-95 ${
                isLastStep
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 text-white shadow-emerald-500/25'
                  : 'bg-brand-600 hover:bg-brand-500 text-white shadow-brand-500/30'
              }`}
            >
              {isLastStep ? (
                <>
                  <CheckCircle2 className="w-4 h-4" /> Concluir Tutorial
                </>
              ) : (
                <>
                  <span>Próximo</span>
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
