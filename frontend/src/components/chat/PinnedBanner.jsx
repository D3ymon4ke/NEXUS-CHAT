import React from 'react';
import { Pin, X } from 'lucide-react';

export function PinnedBanner({ pinnedMessages = [], onUnpin, onJumpToMessage }) {
  if (!pinnedMessages || pinnedMessages.length === 0) return null;

  const currentPin = pinnedMessages[0];

  return (
    <div className="bg-background-card/90 backdrop-blur border-b border-slate-700/60 px-3 sm:px-4 py-2 flex items-center justify-between text-xs transition-all animate-fadeIn w-full max-w-full min-w-0 box-border">
      <div
        onClick={() => onJumpToMessage && onJumpToMessage(currentPin.id)}
        className="flex items-center gap-2 flex-1 cursor-pointer min-w-0 mr-2"
      >
        <div className="p-1 rounded-md bg-brand-500/20 text-brand-400 flex-shrink-0">
          <Pin className="w-3.5 h-3.5 fill-brand-400/30 rotate-45" />
        </div>
        <div className="flex-1 min-w-0 flex items-center gap-1.5 overflow-hidden">
          <span className="font-semibold text-brand-300 flex-shrink-0">Fixada:</span>
          <span className="text-slate-300 truncate min-w-0 flex-1">
            {currentPin.content || 'Anexo'}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {pinnedMessages.length > 1 && (
          <span className="text-[10px] bg-slate-700/60 px-1.5 py-0.5 rounded text-slate-300">
            +{pinnedMessages.length - 1}
          </span>
        )}
        {onUnpin && (
          <button
            onClick={() => onUnpin(currentPin.id)}
            title="Desafixar mensagem"
            className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 rounded transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
