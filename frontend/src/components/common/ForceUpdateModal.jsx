import React, { useState, useEffect } from 'react';
import { sounds } from '../../lib/sound';
import confetti from 'canvas-confetti';
import {
  Sparkles,
  RefreshCw,
  Zap,
  ShieldCheck,
  CheckCircle2,
  Trash2,
  AlertTriangle,
  Radio,
  X
} from 'lucide-react';

export function ForceUpdateModal({ updateData, onClose }) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [progressText, setProgressText] = useState('Pronto para atualizar');

  useEffect(() => {
    if (updateData) {
      try {
        sounds?.playNotification?.();
      } catch (e) {}

      // Efeito festivo de alerta de update
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.4 },
          colors: ['#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899', '#10b981']
        });
      } catch (e) {}
    }
  }, [updateData]);

  if (!updateData) return null;

  const handlePerformUpdate = async () => {
    setIsUpdating(true);
    setProgressText('Limpando cache do navegador & PWA...');

    try {
      // 1. Limpar todos os caches do CacheStorage
      if (typeof caches !== 'undefined') {
        const cacheKeys = await caches.keys();
        await Promise.all(cacheKeys.map((key) => caches.delete(key)));
      }

      // 2. Atualizar e desregistrar Service Workers ativos
      if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
        setProgressText('Sincronizando novo Service Worker...');
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const reg of registrations) {
          if (reg.waiting) {
            reg.waiting.postMessage({ type: 'SKIP_WAITING' });
          }
          await reg.update().catch(() => {});
        }
      }

      // 3. Recarregamento
      setProgressText('Recarregando com nova versão...');
      
      setTimeout(() => {
        // Hard reload forçando busca direta na rede
        window.location.reload(true);
      }, 700);
    } catch (err) {
      console.warn('Erro durante limpeza de cache forçada:', err);
      window.location.reload(true);
    }
  };

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn select-none">
      <div className="relative w-full max-w-md bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border border-cyan-500/40 rounded-3xl p-5 sm:p-6 shadow-2xl shadow-cyan-500/20 text-center overflow-hidden">
        {/* Glow de fundo */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-48 h-48 bg-gradient-to-br from-cyan-500/20 via-brand-500/20 to-purple-600/20 rounded-full blur-3xl pointer-events-none" />

        {/* Badge topo */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 text-xs font-extrabold uppercase tracking-wider mb-3">
          <Radio className="w-3.5 h-3.5 animate-pulse text-cyan-400" />
          <span>Alerta de Atualização Remota</span>
        </div>

        {/* Ícone Central */}
        <div className="relative w-16 h-16 sm:w-20 sm:h-20 mx-auto my-2 flex items-center justify-center">
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 opacity-25 blur-lg animate-pulse" />
          <div className="relative w-full h-full rounded-2xl bg-slate-950/80 border border-cyan-400/50 flex items-center justify-center text-cyan-400 shadow-xl">
            <RefreshCw className={`w-8 h-8 sm:w-10 sm:h-10 text-cyan-400 ${isUpdating ? 'animate-spin' : ''}`} />
          </div>
        </div>

        {/* Título & Versão */}
        <h3 className="text-base sm:text-lg font-black text-white mt-3">
          {updateData.title || '🚀 Nova Atualização do Nexus Disponível!'}
        </h3>

        {updateData.version && (
          <div className="inline-block mt-1 px-2.5 py-0.5 rounded-lg bg-slate-800/80 text-[11px] font-mono text-cyan-300 border border-cyan-500/30">
            Build: {updateData.version}
          </div>
        )}

        {/* Mensagem / Motivo */}
        <p className="text-xs sm:text-sm text-slate-300 mt-2.5 leading-relaxed bg-slate-950/60 p-3 rounded-2xl border border-slate-800/80">
          {updateData.message || 'O administrador disparou uma atualização do sistema para aplicar novas correções e melhorias. Clique no botão abaixo para recarregar o app com a versão mais recente.'}
        </p>

        {/* Itens que serão limpos */}
        <div className="flex items-center justify-center gap-3 text-[11px] text-slate-400 mt-3">
          <span className="flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Cache Renovado
          </span>
          <span className="flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> PWA Atualizado
          </span>
          <span className="flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Sem Deslogar
          </span>
        </div>

        {/* Ações */}
        <div className="mt-5 space-y-2">
          <button
            onClick={handlePerformUpdate}
            disabled={isUpdating}
            className="w-full py-3 sm:py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-black text-xs sm:text-sm shadow-xl shadow-cyan-500/25 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-75"
          >
            <RefreshCw className={`w-4 h-4 ${isUpdating ? 'animate-spin' : ''}`} />
            <span>{isUpdating ? progressText : '✨ Atualizar Agora & Limpar Cache'}</span>
          </button>

          {!isUpdating && onClose && (
            <button
              onClick={onClose}
              className="w-full py-2 text-xs font-bold text-slate-400 hover:text-white transition-colors"
            >
              Lembrar mais tarde
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
