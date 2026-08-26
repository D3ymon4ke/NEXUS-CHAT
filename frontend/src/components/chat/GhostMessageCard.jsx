import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useChat } from '../../context/ChatContext';
import { supabase, isSupabaseConfigured } from '../../lib/supabaseClient';
import { sounds } from '../../lib/sound';
import {
  Ghost,
  Eye,
  EyeOff,
  Lock,
  Clock,
  Flame,
  CheckCircle2,
  Sparkles,
  X,
  AlertTriangle
} from 'lucide-react';

export function GhostMessageCard({ message, isOwn }) {
  const { user } = useAuth();
  const { deleteMessage, editMessage } = useChat();

  let ghostData = null;
  try {
    if (typeof message.content === 'string' && message.content.startsWith('{')) {
      const parsed = JSON.parse(message.content);
      ghostData = parsed.ghost_message;
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
  const hasUserViewed = viewedBy.includes(user?.id);

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

  // Se já foi expirada por qualquer motivo
  if (isExpired) {
    return (
      <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-purple-900/40 shadow-inner flex items-center gap-2.5 text-slate-400 select-none animate-fadeIn">
        <div className="w-8 h-8 rounded-xl bg-purple-950/60 border border-purple-800/50 flex items-center justify-center text-purple-400">
          <Ghost className="w-4 h-4 opacity-50" />
        </div>
        <div>
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
            <span>Mensagem Fantasma Expirada</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-950 text-purple-400 border border-purple-800/40 uppercase">
              {isViewOnce ? '1x Vista' : 'Autodestruída'}
            </span>
          </div>
          <p className="text-[10px] text-slate-500">Este conteúdo foi apagado permanentemente por privacidade.</p>
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

    // Timers de 10s ou 1m
    const secs = getDurationSeconds(ghostType);
    setTotalSeconds(secs);
    setTimeLeft(secs);
    setIsRevealed(true);
    sounds.playPop();

    // Se no Supabase, atualiza viewedBy
    if (!hasUserViewed && isSupabaseConfigured && supabase && user) {
      const updatedViewed = [...viewedBy, user.id];
      const updatedPayload = JSON.stringify({
        ghost_message: {
          ...ghostData,
          viewedBy: updatedViewed,
          revealedAt: new Date().toISOString()
        }
      });
      supabase.from('messages').update({ content: updatedPayload }).eq('id', message.id).catch(console.warn);
    }
  };

  // Efeito do timer regressivo
  useEffect(() => {
    if (timeLeft === null || isExpired) return;

    if (timeLeft <= 0) {
      handleExpireMessage();
      return;
    }

    timerRef.current = setTimeout(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [timeLeft]);

  // Função para expirar / autodestruir a mensagem
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

  // Ao fechar o modal de visualização única
  const handleCloseViewOnce = async () => {
    setShowFullViewModal(false);
    await handleExpireMessage();
  };

  const timerBadgeLabel = {
    view_once: 'Visualização Única (1x)',
    '10s': '10 Segundos',
    '1m': '1 Minuto',
    '1h': '1 Hora',
    '24h': '24 Horas'
  }[ghostType] || 'Fantasma';

  return (
    <div className="rounded-2xl border border-purple-500/40 bg-gradient-to-br from-purple-950/70 via-slate-900/90 to-background-dark/95 shadow-xl overflow-hidden backdrop-blur-md max-w-sm transition-all animate-fadeIn">
      {/* Header do Card Fantasma */}
      <div className="px-3.5 py-2 bg-purple-900/30 border-b border-purple-500/30 flex items-center justify-between">
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
                  ? 'Foto / Mensagem de Visualização Única'
                  : `Mensagem Autodestrutiva (${timerBadgeLabel})`}
              </h4>
              <p className="text-[10px] text-purple-300/70 max-w-[240px] mx-auto">
                {isViewOnce
                  ? 'Este conteúdo só pode ser aberto uma única vez e será destruído ao fechar.'
                  : `O conteúdo se autodestruirá permanentemente após a abertura.`}
              </p>
            </div>

            <button
              onClick={handleReveal}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold text-xs shadow-lg shadow-purple-600/30 transition-all flex items-center justify-center gap-2 hover:scale-[1.02]"
            >
              <Eye className="w-4 h-4" />
              <span>{isViewOnce ? 'Abrir Foto (1x)' : 'Revelar Mensagem'}</span>
            </button>
          </div>
        ) : (
          /* Conteúdo Revelado com Timer Regressivo */
          <div className="space-y-3 animate-fadeIn">
            {/* Barra de Progresso do Timer */}
            {timeLeft !== null && (
              <div className="flex items-center justify-between bg-purple-950/80 px-2.5 py-1.5 rounded-xl border border-purple-700/50">
                <div className="flex items-center gap-1.5 text-xs font-black text-rose-400">
                  <Flame className="w-4 h-4 text-rose-500 animate-bounce" />
                  <span>Autodestruição em {timeLeft}s</span>
                </div>
                <div className="w-24 h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-purple-500 to-rose-500 transition-all duration-1000 ease-linear"
                    style={{ width: `${(timeLeft / totalSeconds) * 100}%` }}
                  />
                </div>
              </div>
            )}

            {/* Anexos de imagem se houver */}
            {secretAttachments.length > 0 && (
              <div className="space-y-1.5">
                {secretAttachments.map((att, idx) => (
                  <div key={idx} className="rounded-xl overflow-hidden border border-purple-500/40">
                    <img
                      src={att.file_url}
                      alt={att.file_name || 'Foto fantasma'}
                      className="w-full max-h-64 object-cover"
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Texto da mensagem */}
            {secretContent && (
              <p className="text-xs text-white leading-relaxed font-medium bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                {secretContent}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Modal de Visualização Única Fullscreen (1x) */}
      {showFullViewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-2xl animate-fadeIn select-none">
          <div className="relative max-w-2xl w-full flex flex-col items-center">
            {/* Header com Aviso de 1x */}
            <div className="w-full flex items-center justify-between p-3 rounded-2xl bg-purple-950/90 border border-purple-500/50 mb-3 shadow-2xl">
              <div className="flex items-center gap-2 text-purple-300 font-extrabold text-xs">
                <Ghost className="w-4 h-4 text-purple-400" />
                <span>VISUALIZAÇÃO ÚNICA (1x)</span>
                <span className="text-[10px] text-purple-200 font-normal ml-1">
                  • Fechar esta janela destruirá a foto para sempre
                </span>
              </div>
              <button
                onClick={handleCloseViewOnce}
                className="px-3 py-1 rounded-xl bg-rose-600/30 hover:bg-rose-600 text-rose-200 hover:text-white text-xs font-bold transition-colors flex items-center gap-1 border border-rose-500/40"
              >
                <X className="w-3.5 h-3.5" />
                <span>Fechar & Destruir</span>
              </button>
            </div>

            {/* Imagem / Conteúdo Secreto */}
            <div className="rounded-3xl overflow-hidden border-2 border-purple-500/50 shadow-2xl max-h-[75vh] flex items-center justify-center bg-black">
              {secretAttachments.length > 0 ? (
                <img
                  src={secretAttachments[0].file_url}
                  alt="Foto 1x"
                  className="max-h-[75vh] w-auto object-contain pointer-events-none"
                />
              ) : (
                <div className="p-8 text-center text-white text-sm max-w-md">
                  {secretContent}
                </div>
              )}
            </div>

            {/* Rodapé Informativo */}
            <div className="mt-3 text-[11px] text-slate-400 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              <span>Capturas de tela são registradas no histórico de segurança.</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
