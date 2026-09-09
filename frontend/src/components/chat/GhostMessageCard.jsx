import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../../context/AuthContext';
import { useChat } from '../../context/ChatContext';
import { supabase, isSupabaseConfigured } from '../../lib/supabaseClient';
import { sounds } from '../../lib/sound';
import {
  Ghost,
  Eye,
  Lock,
  Clock,
  Flame,
  X,
  AlertTriangle,
  Timer,
  CheckCircle2,
  Sparkles
} from 'lucide-react';

export function GhostMessageCard({ message, isOwn }) {
  const { user } = useAuth();
  const { deleteMessage } = useChat();

  let ghostData = null;
  try {
    if (typeof message.content === 'string' && message.content.startsWith('{')) {
      const parsed = JSON.parse(message.content);
      ghostData = parsed.ghost_message;
    } else if (typeof message.content === 'object' && message.content?.ghost_message) {
      ghostData = message.content.ghost_message;
    }
  } catch (e) {
    ghostData = null;
  }

  if (!ghostData) {
    return (
      <div className="p-3 rounded-2xl bg-purple-950/40 border border-purple-800/50 text-xs text-purple-200 flex items-center gap-2">
        <Ghost className="w-4 h-4 text-purple-400" />
        <span>[Mensagem Fantasma]</span>
      </div>
    );
  }

  const {
    ghostType, // 'view_once' | '10s' | '1m' | '1h' | '24h'
    content: secretContent,
    attachments: secretAttachments = [],
    senderName,
    senderId,
    viewedBy = [],
    isExpired = false,
    revealedAt = null
  } = ghostData;

  const isViewOnce = ghostType === 'view_once';
  const isSender = user?.id === senderId;
  const hasUserViewed = Array.isArray(viewedBy) && user?.id && viewedBy.includes(user.id);

  // Estados locais
  const [isRevealed, setIsRevealed] = useState(false);
  const [showFullViewModal, setShowFullViewModal] = useState(false);
  const [timeLeft, setTimeLeft] = useState(null);
  const [totalSeconds, setTotalSeconds] = useState(10);
  const timerRef = useRef(null);

  // Duração em segundos para timers automáticos
  const getDurationSeconds = (type) => {
    switch (type) {
      case '10s': return 10;
      case '1m': return 60;
      case '1h': return 3600;
      case '24h': return 86400;
      default: return 10;
    }
  };

  const timerBadgeLabel = {
    view_once: 'Visualização Única (1x)',
    '10s': '10 Segundos',
    '1m': '1 Minuto',
    '1h': '1 Hora',
    '24h': '24 Horas'
  }[ghostType] || 'Fantasma';

  // Função para expirar / autodestruir a mensagem no Supabase e banco
  const handleExpireMessage = async () => {
    try {
      sounds.playPop();
      const updatedPayload = JSON.stringify({
        ghost_message: {
          ...ghostData,
          isExpired: true,
          content: '[Mensagem Fantasma Expirada]',
          attachments: []
        }
      });

      if (isSupabaseConfigured && supabase) {
        await supabase
          .from('messages')
          .update({ content: updatedPayload, is_deleted: true })
          .eq('id', message.id);
      }
    } catch (err) {
      console.warn('Erro ao expirar mensagem fantasma:', err);
    }
  };

  // Se já foi revelada anteriormente no servidor (para mensagens com timer 10s, 1m, 1h)
  useEffect(() => {
    if (revealedAt && !isExpired && !isViewOnce) {
      const elapsed = Math.floor((Date.now() - new Date(revealedAt).getTime()) / 1000);
      const duration = getDurationSeconds(ghostType);
      const remaining = duration - elapsed;

      if (remaining <= 0) {
        handleExpireMessage();
      } else {
        setTotalSeconds(duration);
        setTimeLeft(remaining);
        setIsRevealed(true);
      }
    }
  }, [revealedAt, isExpired, ghostType, isViewOnce]);

  // Efeito do timer regressivo
  useEffect(() => {
    if (timeLeft === null || isExpired) return;

    if (timeLeft <= 0) {
      handleExpireMessage();
      return;
    }

    timerRef.current = setTimeout(() => {
      setTimeLeft(prev => (prev !== null ? prev - 1 : 0));
    }, 1000);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [timeLeft, isExpired]);

  // Se já foi expirada por qualquer motivo
  if (isExpired || message.is_deleted) {
    return (
      <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-purple-900/40 shadow-inner flex items-center gap-2.5 text-slate-400 select-none animate-fadeIn min-w-0 max-w-full">
        <div className="w-8 h-8 rounded-xl bg-purple-950/60 border border-purple-800/50 flex items-center justify-center text-purple-400 flex-shrink-0">
          <Ghost className="w-4 h-4 opacity-50" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300 flex-wrap">
            <span>Mensagem Fantasma Expirada</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-950 text-purple-400 border border-purple-800/40 uppercase font-semibold">
              {isViewOnce ? '1x Vista' : 'Autodestruída'}
            </span>
          </div>
          <p className="text-[10px] text-slate-500 mt-0.5">Este conteúdo foi apagado permanentemente por privacidade.</p>
        </div>
      </div>
    );
  }

  // Ação para revelar e iniciar contagem regressiva
  const handleReveal = async () => {
    if (isExpired) return;

    if (isViewOnce) {
      setShowFullViewModal(true);
      sounds.playPop();
      return;
    }

    // Timers de 10s, 1m, 1h, 24h
    const secs = getDurationSeconds(ghostType);
    setTotalSeconds(secs);
    setTimeLeft(secs);
    setIsRevealed(true);
    sounds.playPop();

    // Se no Supabase, registra revelação e timestamp para que outros clientes sincronizem o timer
    if (isSupabaseConfigured && supabase && user) {
      const nowIso = new Date().toISOString();
      const updatedViewed = hasUserViewed ? viewedBy : [...(viewedBy || []), user.id];
      const updatedPayload = JSON.stringify({
        ghost_message: {
          ...ghostData,
          viewedBy: updatedViewed,
          revealedAt: revealedAt || nowIso
        }
      });
      supabase.from('messages').update({ content: updatedPayload }).eq('id', message.id).catch(console.warn);
    }
  };

  // Ao fechar o modal de visualização única
  const handleCloseViewOnce = async () => {
    setShowFullViewModal(false);
    await handleExpireMessage();
  };

  // Formatador de tempo para timers longos (ex: 1h, 1m)
  const formatTimeRemaining = (seconds) => {
    if (seconds <= 0) return '0s';
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins < 60) return `${mins}m ${secs > 0 ? `${secs}s` : ''}`;
    const hrs = Math.floor(mins / 60);
    const remainMins = mins % 60;
    return `${hrs}h ${remainMins > 0 ? `${remainMins}m` : ''}`;
  };

  const hasSecretMedia = Array.isArray(secretAttachments) && secretAttachments.length > 0;

  return (
    <div className="w-full max-w-full sm:max-w-sm rounded-2xl border border-purple-500/40 bg-gradient-to-br from-purple-950/80 via-slate-900/95 to-background-dark/95 shadow-2xl overflow-hidden backdrop-blur-md transition-all animate-fadeIn min-w-0 box-border">
      {/* Header do Card Fantasma */}
      <div className="px-3 sm:px-3.5 py-2 bg-purple-900/30 border-b border-purple-500/30 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-purple-300 font-extrabold text-[11px]">
          <Ghost className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
          <span>MODO FANTASMA</span>
        </div>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-200 border border-purple-500/30 font-bold flex items-center gap-1">
          <Clock className="w-3 h-3 text-purple-300" />
          <span>{timerBadgeLabel}</span>
        </span>
      </div>

      {/* Conteúdo Central */}
      <div className="p-3.5">
        {!isRevealed ? (
          /* Card Oculto aguardando clique para revelar */
          <div className="text-center py-2 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-purple-600/20 border border-purple-500/40 flex items-center justify-center mx-auto text-purple-300 shadow-lg shadow-purple-600/20 group hover:scale-110 transition-transform">
              {isViewOnce ? <Lock className="w-6 h-6" /> : <Eye className="w-6 h-6" />}
            </div>

            <div>
              <h4 className="text-xs font-bold text-white mb-0.5">
                {isViewOnce
                  ? hasSecretMedia ? 'Foto de Visualização Única' : 'Mensagem de Visualização Única'
                  : `Mensagem Autodestrutiva (${timerBadgeLabel})`}
              </h4>
              <p className="text-[10px] text-purple-300/70 max-w-[240px] mx-auto leading-relaxed">
                {isViewOnce
                  ? 'Este conteúdo só pode ser aberto uma única vez e será destruído ao fechar.'
                  : `O conteúdo se autodestruirá permanentemente após ${timerBadgeLabel.toLowerCase()}.`}
              </p>
            </div>

            <button
              onClick={handleReveal}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold text-xs shadow-lg shadow-purple-600/30 transition-all flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98]"
            >
              <Eye className="w-4 h-4" />
              <span>{isViewOnce ? (hasSecretMedia ? 'Abrir Foto (1x)' : 'Abrir Mensagem (1x)') : 'Revelar Mensagem'}</span>
            </button>
          </div>
        ) : (
          /* Conteúdo Revelado com Timer Regressivo */
          <div className="space-y-3 animate-fadeIn">
            {/* Barra de Progresso do Timer */}
            {timeLeft !== null && (
              <div className="flex items-center justify-between bg-purple-950/90 px-3 py-1.5 rounded-xl border border-purple-700/50">
                <div className="flex items-center gap-1.5 text-xs font-black text-rose-400">
                  <Flame className="w-4 h-4 text-rose-500 animate-bounce" />
                  <span>Autodestruição em {formatTimeRemaining(timeLeft)}</span>
                </div>
                <div className="w-20 sm:w-24 h-2 bg-slate-800 rounded-full overflow-hidden flex-shrink-0 ml-2">
                  <div
                    className="h-full bg-gradient-to-r from-purple-500 to-rose-500 transition-all duration-1000 ease-linear"
                    style={{ width: `${Math.max(0, Math.min(100, (timeLeft / totalSeconds) * 100))}%` }}
                  />
                </div>
              </div>
            )}

            {/* Anexos de imagem se houver */}
            {secretAttachments.length > 0 && (
              <div className="space-y-1.5">
                {secretAttachments.map((att, idx) => (
                  <div key={idx} className="rounded-2xl overflow-hidden border border-purple-500/40 bg-black/60 flex items-center justify-center p-1">
                    <img
                      src={att.file_url}
                      alt={att.file_name || 'Foto fantasma'}
                      className="max-h-80 w-auto max-w-full object-contain rounded-xl select-none"
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Texto da mensagem */}
            {secretContent && (
              <p className="text-xs text-white leading-relaxed font-medium bg-slate-900/90 p-2.5 rounded-xl border border-slate-800/80 break-words whitespace-pre-wrap">
                {secretContent}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Modal de Visualização Única Fullscreen (1x) com Safe Areas via React Portal */}
      {showFullViewModal && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center safe-modal-overlay bg-black/95 backdrop-blur-2xl animate-fadeIn select-none p-3 sm:p-5">
          <div className="relative max-w-xl w-full flex flex-col items-center max-h-[100%] h-full justify-between py-2">
            {/* Header com Aviso de 1x */}
            <div className="w-full flex items-center justify-between p-3 rounded-2xl bg-purple-950/90 border border-purple-500/50 mb-2 shadow-2xl flex-shrink-0">
              <div className="flex items-center gap-2 text-purple-300 font-extrabold text-xs min-w-0 flex-1 mr-2">
                <Ghost className="w-4 h-4 text-purple-400 flex-shrink-0" />
                <span className="truncate">VISUALIZAÇÃO ÚNICA (1x)</span>
                <span className="text-[10px] text-purple-200 font-normal ml-1 hidden sm:inline truncate">
                  • Destruição ao fechar
                </span>
              </div>
              <button
                onClick={handleCloseViewOnce}
                className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black transition-all flex items-center gap-1.5 border border-rose-400/50 shadow-lg shadow-rose-600/30 flex-shrink-0 active:scale-95 cursor-pointer"
              >
                <X className="w-4 h-4" />
                <span>Fechar & Destruir</span>
              </button>
            </div>

            {/* Imagem / Conteúdo Secreto Ajustado para não cortar */}
            <div className="rounded-2xl sm:rounded-3xl overflow-hidden border border-purple-500/40 shadow-2xl flex-1 w-full flex items-center justify-center bg-black/80 p-2 min-h-0">
              {secretAttachments.length > 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 w-full h-full min-h-0">
                  <img
                    src={secretAttachments[0].file_url}
                    alt="Foto 1x"
                    className="max-h-full max-w-full w-auto h-auto object-contain pointer-events-none rounded-xl"
                  />
                  {secretContent && (
                    <p className="text-xs text-slate-200 bg-slate-900/90 px-3 py-1.5 rounded-xl border border-purple-500/30 max-w-md text-center flex-shrink-0">
                      {secretContent}
                    </p>
                  )}
                </div>
              ) : (
                <div className="p-6 text-center text-white text-sm sm:text-base max-w-md leading-relaxed overflow-y-auto">
                  {secretContent}
                </div>
              )}
            </div>

            {/* Rodapé Informativo */}
            <div className="mt-2 text-[10px] sm:text-[11px] text-slate-400 flex items-center gap-1.5 flex-shrink-0">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
              <span>Esta mensagem será apagada permanentemente assim que você fechar.</span>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
