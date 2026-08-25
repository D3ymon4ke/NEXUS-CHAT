import React from 'react';
import { X, Download, ExternalLink } from 'lucide-react';

export function ImageViewerModal({ imageUrl, onClose }) {
  if (!imageUrl) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fadeIn"
    >
      <div className="relative max-w-5xl max-h-[90vh] flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
        {/* Barra superior de ações */}
        <div className="absolute top-[-44px] right-0 flex items-center gap-3 text-white">
          <a
            href={imageUrl}
            download
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-full bg-slate-800/80 hover:bg-slate-700 transition-colors"
            title="Baixar imagem"
          >
            <Download className="w-5 h-5" />
          </a>
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-slate-800/80 hover:bg-slate-700 transition-colors"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Imagem em tamanho grande */}
        <img
          src={imageUrl}
          alt="Visualização"
          className="max-w-full max-h-[85vh] rounded-xl object-contain shadow-2xl border border-slate-700/50"
        />
      </div>
    </div>
  );
}
