import React from 'react';
import { getFrameAsset, getFrameStyle } from '../../lib/shopCatalog';

export function UserAvatar({
  src,
  alt = 'Avatar',
  frame,
  size = 'md', // 'xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl'
  className = '',
  imgClassName = '',
  isOnline,
  onClick,
  showZoomIcon
}) {
  const animatedFrame = getFrameAsset(frame);
  const cssFrame = getFrameStyle(frame) || (!animatedFrame ? 'border border-slate-700/80' : '');

  const sizeClasses = {
    xs: 'w-6 h-6',
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16',
    '2xl': 'w-20 h-20 sm:w-24 sm:h-24',
    '3xl': 'w-28 h-28 sm:w-32 sm:h-32'
  };

  const containerSize = sizeClasses[size] || size;

  return (
    <div
      onClick={onClick}
      className={`relative inline-flex items-center justify-center flex-shrink-0 select-none ${containerSize} ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      {/* Imagem do Avatar */}
      <img
        src={src || `https://api.dicebear.com/7.x/bottts/svg?seed=nexus`}
        alt={alt}
        className={`w-full h-full rounded-full object-cover bg-slate-900 ${cssFrame} ${imgClassName}`}
      />

      {/* Moldura Animada Sobreposta */}
      {animatedFrame && (
        <img
          src={animatedFrame}
          alt="Moldura Animada"
          className="absolute -inset-[22%] w-[144%] h-[144%] max-w-none pointer-events-none object-contain z-10 select-none drop-shadow-md"
        />
      )}

      {/* Indicador de Status Online */}
      {isOnline !== undefined && (
        <span className="absolute bottom-0 right-0 z-20 flex h-3 w-3">
          {isOnline && (
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          )}
          <span
            className={`relative inline-flex rounded-full h-3 w-3 border-2 border-slate-900 ${
              isOnline ? 'bg-emerald-500' : 'bg-slate-500'
            }`}
          />
        </span>
      )}
    </div>
  );
}

export default UserAvatar;
