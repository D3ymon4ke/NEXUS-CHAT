import React from 'react';
import { X, Gift, Heart, Calendar, MessageSquare, Sparkles } from 'lucide-react';
import { GIFT_RARITIES } from '../../lib/giftCatalog';

export function GiftDetailModal({
  isOpen,
  onClose,
  giftInfo,
  giftEntries = []
}) {
  if (!isOpen || !giftInfo) return null;

  const rarityConfig = GIFT_RARITIES[giftInfo.rarity] || GIFT_RARITIES.common;
  const totalCount = giftEntries.reduce((sum, g) => sum + (g.quantity || 1), 0);

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-xl animate-fadeIn select-none overflow-hidden box-border"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-slate-700/80 bg-gradient-to-b from-slate-900/95 via-background-darker/95 to-slate-950/95 shadow-2xl flex flex-col max-h-[85vh] overflow-hidden relative"
      >
        {/* Topbar */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 flex-shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-2xl flex-shrink-0">{giftInfo.icon}</span>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-extrabold text-white truncate">{giftInfo.name}</h3>
                <span className={`text-[8px] sm:text-[9px] px-1.5 py-0.2 rounded-full font-extrabold uppercase border ${rarityConfig.badgeClass}`}>
                  {rarityConfig.label}
                </span>
              </div>
              <p className="text-[10px] text-amber-300 font-semibold">{totalCount} recebidos no total</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Lista de Remetentes e Mensagens */}
        <div className="flex-1 overflow-y-auto my-3 space-y-2 pr-1 min-h-[140px]">
          {giftEntries.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-400">
              Nenhum registro encontrado para este presente.
            </div>
          ) : (
            giftEntries.map((entry, idx) => {
              const sender = entry.sender || { username: 'Amigo Nexus', display_name: 'Amigo Nexus' };
              return (
                <div
                  key={idx}
                  className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800/90 space-y-1.5 text-xs shadow-sm"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <img
                        src={sender.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${sender.id || 'friend'}`}
                        alt="avatar"
                        className="w-6 h-6 rounded-full object-cover border border-slate-700 flex-shrink-0"
                      />
                      <span className="font-bold text-slate-200 truncate">{sender.display_name || sender.username}</span>
                    </div>

                    <span className="text-[10px] px-2 py-0.2 rounded-full bg-amber-500/20 text-amber-300 font-extrabold flex-shrink-0">
                      x{entry.quantity || 1}
                    </span>
                  </div>

                  {entry.message && (
                    <p className="text-[11px] text-slate-300 italic pl-1 border-l-2 border-amber-400/60 leading-relaxed">
                      "{entry.message}"
                    </p>
                  )}

                  <div className="text-[9px] text-slate-500 text-right">
                    {entry.created_at ? new Date(entry.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Recente'}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <button
          onClick={onClose}
          className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors flex-shrink-0"
        >
          Fechar
        </button>
      </div>
    </div>
  );
}
