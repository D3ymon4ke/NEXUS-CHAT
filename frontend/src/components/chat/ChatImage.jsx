import React, { useState } from 'react';
import { Loader2, Maximize2, AlertCircle } from 'lucide-react';

/**
 * Componente especializado de imagem com carregamento instantâneo (0ms) no estilo Telegram/Instagram.
 * Exibe miniatura blur imediata e faz transição suave para alta definição com indicador de progresso.
 */
export function ChatImage({
  src,
  alt = 'Imagem',
  blurPlaceholder = null,
  width = null,
  height = null,
  aspectRatio = null,
  onClick,
  className = ''
}) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  // Calcula aspect ratio seguro para evitar layout shift
  let computedRatio = aspectRatio;
  if (!computedRatio && width && height && width > 0 && height > 0) {
    computedRatio = width / height;
  }

  // Limites proporcionais para manter balão harmonioso (estilo Telegram)
  let containerStyle = {};
  if (computedRatio) {
    // Limita proporções muito extremas (ex: prints muito compridos ou banners muito finos)
    const clampedRatio = Math.max(0.65, Math.min(2.2, computedRatio));
    containerStyle = {
      aspectRatio: `${clampedRatio}`,
      maxHeight: '360px',
      maxWidth: '100%'
    };
  } else {
    containerStyle = {
      maxHeight: '360px',
      minHeight: '180px',
      maxWidth: '100%'
    };
  }

  return (
    <div
      onClick={onClick}
      style={containerStyle}
      className={`group relative overflow-hidden rounded-2xl cursor-pointer bg-slate-900/60 border border-white/10 shadow-md transition-all duration-300 hover:shadow-xl hover:border-white/20 select-none ${className}`}
    >
      {/* 1. Placeholder Desfocado Instantâneo (0ms / Blur-Up) */}
      {blurPlaceholder ? (
        <img
          src={blurPlaceholder}
          alt=""
          aria-hidden="true"
          className={`absolute inset-0 w-full h-full object-cover filter blur-xl scale-125 transition-opacity duration-700 pointer-events-none ${
            isLoaded ? 'opacity-0' : 'opacity-100'
          }`}
        />
      ) : (
        /* Fallback Skeleton Shimmer quando não houver miniatura */
        <div
          className={`absolute inset-0 bg-gradient-to-br from-slate-800/80 via-slate-700/50 to-slate-900/80 animate-pulse transition-opacity duration-700 ${
            isLoaded ? 'opacity-0' : 'opacity-100'
          }`}
        />
      )}

      {/* 2. Indicador Circular de Carregamento Estilo Telegram no Centro */}
      {!isLoaded && !hasError && (
        <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
          <div className="flex items-center justify-center w-11 h-11 rounded-full bg-black/55 backdrop-blur-md border border-white/15 shadow-xl transition-transform transform scale-100 animate-fadeIn">
            <Loader2 className="w-5 h-5 text-white animate-spin opacity-90" />
          </div>
        </div>
      )}

      {/* 3. Indicador de Falha ao Carregar Imagem */}
      {hasError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 p-3 text-slate-400 z-20 bg-slate-900/80 backdrop-blur-sm">
          <AlertCircle className="w-6 h-6 text-rose-400/80" />
          <span className="text-[11px] font-medium text-slate-300">Falha ao carregar imagem</span>
        </div>
      )}

      {/* 4. Imagem Original em Alta Resolução */}
      {!hasError && (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          onLoad={() => setIsLoaded(true)}
          onError={() => setHasError(true)}
          className={`relative z-10 w-full h-full object-cover transition-all duration-500 ease-out ${
            isLoaded
              ? 'opacity-100 scale-100 filter-none'
              : 'opacity-0 scale-[1.03]'
          } group-hover:scale-[1.015]`}
        />
      )}

      {/* 5. Overlay Glassmórfico de Hover com Botão de Expansão */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-30 pointer-events-none flex items-end justify-end p-2.5">
        <div className="p-1.5 rounded-full bg-black/60 backdrop-blur-md text-white/90 border border-white/15 shadow-lg transform translate-y-1 group-hover:translate-y-0 transition-transform">
          <Maximize2 className="w-3.5 h-3.5" />
        </div>
      </div>
    </div>
  );
}
