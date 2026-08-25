import React, { useState, useEffect } from 'react';
import { Download, Smartphone, X, Check, Share, PlusSquare, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';
import { sounds } from '../../lib/sound';

export function InstallAppModal({ isOpen, onClose }) {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isIOS, setIsIOS] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    // Detectar se é iOS
    const isIosDevice = /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase());
    setIsIOS(isIosDevice);

    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    window.addEventListener('appinstalled', () => {
      setInstalled(true);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      alert('Para instalar: Abra o menu do seu navegador e clique em "Adicionar à tela inicial" ou "Instalar aplicativo".');
      return;
    }

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
      sounds.playPop();
      setInstalled(true);
      onClose();
    }
    setDeferredPrompt(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn select-none">
      <div className="glass-modal w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-brand-500/50 flex flex-col relative overflow-hidden text-center space-y-4">
        {/* Glow */}
        <div className="absolute -top-20 -right-20 w-44 h-44 bg-brand-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-44 h-44 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />

        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-background-surface transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Ícone do App */}
        <div className="flex flex-col items-center justify-center pt-2">
          <div className="relative">
            <img
              src="/belmont-logo.jpg"
              alt="Nexus Chat Logo"
              className="w-20 h-20 rounded-3xl object-cover border-2 border-amber-400 shadow-2xl shadow-amber-500/30"
            />
            <span className="absolute -bottom-1 -right-1 p-1 bg-brand-600 rounded-full text-white border-2 border-slate-900 shadow">
              <Smartphone className="w-3.5 h-3.5" />
            </span>
          </div>

          <h2 className="text-lg font-extrabold text-white mt-3">Instalar Nexus Chat</h2>
          <p className="text-xs text-slate-300 mt-0.5">
            Adicione o app direto na tela inicial do seu celular para acesso rápido e notificações!
          </p>
        </div>

        {/* Instruções para iOS ou Android */}
        {isIOS ? (
          <div className="p-4 rounded-2xl bg-background-surface/90 border border-slate-700 text-left space-y-2 text-xs text-slate-300">
            <div className="font-bold text-white flex items-center gap-1.5">
              <Share className="w-4 h-4 text-brand-400" /> Como instalar no iPhone / iPad:
            </div>
            <ol className="list-decimal list-inside space-y-1 text-[11px] text-slate-300">
              <li>Toque no botão <strong>Compartilhar</strong> (ícone de quadrado com seta para cima) no Safari.</li>
              <li>Role para baixo e toque em <strong>"Adicionar à Tela de Início"</strong>.</li>
              <li>Toque em <strong>"Adicionar"</strong> no canto superior direito.</li>
            </ol>
          </div>
        ) : (
          <button
            onClick={handleInstallClick}
            className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 hover:from-amber-400 text-black font-extrabold text-xs shadow-xl shadow-amber-500/25 transition-all flex items-center justify-center gap-2 hover:scale-105"
          >
            <Download className="w-4 h-4" /> Instalar Aplicativo Agora
          </button>
        )}

        <button
          onClick={onClose}
          className="text-xs text-slate-400 hover:text-white transition-colors"
        >
          Continuar no navegador
        </button>
      </div>
    </div>
  );
}
