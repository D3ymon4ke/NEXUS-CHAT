import React from 'react';
import { X, Download, ZoomIn, Sparkles, ExternalLink } from 'lucide-react';

export function AvatarLightboxModal({ isOpen, onClose, user, frameClass = '' }) {
  if (!isOpen || !user) return null;

  const avatarUrl = user.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.id || 'nexus'}`;
  const displayName = user.display_name || user.username || 'Usuário';

  const handleDownload = async () => {
    try {
      const response = await fetch(avatarUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `avatar_${user.username || 'nexus'}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      window.open(avatarUrl, '_blank');
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 bg-black/90 backdrop-blur-2xl animate-fadeIn select-none overflow-hidden box-border"
    >
      {/* Container Principal da Imagem */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative max-w-lg w-full flex flex-col items-center animate-scaleUp"
      >
        {/* Topbar com Título e Ações */}
        <div className="w-full flex items-center justify-between pb-3 text-white px-2">
          <div className="flex items-center gap-2 min-w-0">
            <Sparkles className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <div className="min-w-0">
              <h3 className="text-sm font-extrabold truncate">{displayName}</h3>
              <p className="text-[11px] text-slate-400 truncate">@{user.username || 'usuario'}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/60 transition-all flex items-center gap-1.5 text-xs font-bold shadow"
              title="Baixar foto de perfil"
            >
              <Download className="w-4 h-4" />
              <span className="hidden xs:inline">Baixar</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-rose-900/80 text-slate-400 hover:text-white border border-slate-700/60 transition-all shadow"
              title="Fechar visualizador"
              aria-label="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Moldura & Imagem em Alta Resolução */}
        <div className="relative p-2 sm:p-3 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-2xl backdrop-blur-md max-w-[85vw] sm:max-w-[420px]">
          <img
            src={avatarUrl}
            alt={displayName}
            className={`w-64 h-64 sm:w-80 sm:h-80 rounded-2xl object-cover shadow-2xl transition-all duration-300 select-none pointer-events-auto ${frameClass}`}
          />
        </div>

        {/* Legenda Informativa */}
        <div className="mt-3 text-center">
          <span className="text-[11px] text-slate-400 bg-slate-900/90 px-3 py-1 rounded-full border border-slate-800">
            Foto de Perfil Original • Nexus HD
          </span>
        </div>
      </div>
    </div>
  );
}
