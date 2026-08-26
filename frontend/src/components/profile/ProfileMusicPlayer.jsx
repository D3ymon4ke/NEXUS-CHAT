import React, { useState, useRef, useEffect } from 'react';
import { parseMusicLink } from '../../lib/musicUtils';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  ExternalLink,
  Disc,
  Music2,
  Sparkles
} from 'lucide-react';

export function ProfileMusicPlayer({
  songUrl,
  songTitle,
  songArtist,
  songCover,
  compact = false,
  autoPlay = false
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showEmbed, setShowEmbed] = useState(false);

  const audioRef = useRef(null);
  const parsed = parseMusicLink(songUrl);

  const isDirectAudio = parsed?.type === 'audio';
  const isYouTube = parsed?.type === 'youtube';
  const isSpotify = parsed?.type === 'spotify';
  const isSoundCloud = parsed?.type === 'soundcloud';

  const title = songTitle || parsed?.inferredTitle || 'Música do Perfil';
  const artist = songArtist || parsed?.platformName || 'Artista Nexus';
  const coverImage = songCover || parsed?.coverUrl || `https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=150`;

  // Gerenciamento de Áudio Direto
  useEffect(() => {
    if (!isDirectAudio || !audioRef.current) return;
    const audio = audioRef.current;

    const updateProgress = () => {
      setCurrentTime(audio.currentTime);
      setDuration(audio.duration || 0);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('timeupdate', updateProgress);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateProgress);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [isDirectAudio, songUrl]);

  const togglePlay = () => {
    if (isDirectAudio && audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play().then(() => setIsPlaying(true)).catch((e) => {
          console.warn('Erro ao tocar áudio direto:', e);
        });
      }
    } else if (isYouTube || isSpotify || isSoundCloud) {
      setShowEmbed(!showEmbed);
      setIsPlaying(!isPlaying);
    } else {
      window.open(songUrl, '_blank');
    }
  };

  const toggleMute = () => {
    if (isDirectAudio && audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleVolumeChange = (e) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (audioRef.current) {
      audioRef.current.volume = val;
      if (val === 0) setIsMuted(true);
      else setIsMuted(false);
    }
  };

  if (!songUrl) return null;

  return (
    <div className="w-full rounded-2xl bg-gradient-to-r from-slate-900/90 via-slate-900/95 to-slate-800/90 border border-slate-700/60 p-3 shadow-xl backdrop-blur relative overflow-hidden group">
      {/* Background glow neon */}
      <div className="absolute -top-10 -right-10 w-28 h-28 bg-brand-500/20 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute -bottom-10 -left-10 w-28 h-28 bg-purple-500/20 rounded-full blur-2xl pointer-events-none" />

      {/* Áudio nativo invisível */}
      {isDirectAudio && (
        <audio
          ref={audioRef}
          src={parsed.audioUrl}
          preload="metadata"
        />
      )}

      <div className="flex items-center gap-3 relative z-10">
        {/* Disco de Vinil com Capa e Animação de Giro */}
        <div
          onClick={togglePlay}
          className="relative w-12 h-12 flex-shrink-0 cursor-pointer group/disc"
          title={isPlaying ? 'Pausar Música' : 'Tocar Música'}
        >
          <div
            className={`w-12 h-12 rounded-full overflow-hidden border-2 border-brand-500/70 shadow-md flex items-center justify-center bg-slate-950 transition-all ${
              isPlaying ? 'animate-spin [animation-duration:4s]' : 'group-hover/disc:scale-105'
            }`}
          >
            <img
              src={coverImage}
              alt={title}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=150';
              }}
            />
          </div>

          {/* Centro do disco de vinil */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-slate-900 border border-brand-400/80 shadow" />

          {/* Ícone de Play / Pause overlay */}
          <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover/disc:opacity-100 transition-opacity">
            {isPlaying ? (
              <Pause className="w-4 h-4 text-white drop-shadow" />
            ) : (
              <Play className="w-4 h-4 text-white fill-white drop-shadow ml-0.5" />
            )}
          </div>
        </div>

        {/* Metadados da Música + Equalizador */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1">
            <div className="flex items-center gap-1.5 min-w-0">
              <Music2 className="w-3.5 h-3.5 text-brand-400 flex-shrink-0 animate-pulse" />
              <h4 className="text-xs font-bold text-white truncate max-w-[140px] sm:max-w-[190px]">
                {title}
              </h4>
            </div>

            {/* Equalizador animado em CSS */}
            <div className="flex items-end gap-0.5 h-3.5 flex-shrink-0 px-1">
              <span
                className={`w-0.5 bg-brand-400 rounded-full transition-all ${
                  isPlaying ? 'h-3 animate-pulse' : 'h-1'
                }`}
              />
              <span
                className={`w-0.5 bg-brand-300 rounded-full transition-all ${
                  isPlaying ? 'h-3.5 animate-bounce [animation-delay:0.15s]' : 'h-1.5'
                }`}
              />
              <span
                className={`w-0.5 bg-purple-400 rounded-full transition-all ${
                  isPlaying ? 'h-2 animate-bounce [animation-delay:0.3s]' : 'h-1'
                }`}
              />
              <span
                className={`w-0.5 bg-pink-400 rounded-full transition-all ${
                  isPlaying ? 'h-3 animate-pulse [animation-delay:0.2s]' : 'h-1.5'
                }`}
              />
            </div>
          </div>

          <div className="flex items-center justify-between mt-0.5 text-[10px] text-slate-400">
            <span className="truncate max-w-[130px] font-medium">{artist}</span>
            <span className="text-brand-300/80 font-mono text-[9px] uppercase tracking-wider">
              {parsed?.platformName || 'Anthem'}
            </span>
          </div>

          {/* Barra de Progresso para Áudio Direto */}
          {isDirectAudio && duration > 0 && (
            <div className="w-full bg-slate-800 rounded-full h-1 mt-1.5 overflow-hidden">
              <div
                className="bg-gradient-to-r from-brand-500 to-purple-500 h-full rounded-full transition-all"
                style={{ width: `${(currentTime / duration) * 100}%` }}
              />
            </div>
          )}
        </div>

        {/* Botão Play/Pause + Link Original */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            type="button"
            onClick={togglePlay}
            className="p-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white shadow-md shadow-brand-500/30 transition-transform active:scale-95 flex items-center justify-center"
            title={isPlaying ? 'Pausar Música' : 'Tocar Música'}
          >
            {isPlaying ? (
              <Pause className="w-3.5 h-3.5" />
            ) : (
              <Play className="w-3.5 h-3.5 fill-white ml-0.5" />
            )}
          </button>

          <a
            href={songUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Abrir no site original"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Embed Iframe Dinâmico para YouTube / Spotify / SoundCloud quando ativado */}
      {showEmbed && parsed?.embedUrl && (
        <div className="mt-2.5 pt-2.5 border-t border-slate-800 animate-fadeIn">
          {isSpotify ? (
            <iframe
              src={parsed.embedUrl}
              width="100%"
              height="80"
              frameBorder="0"
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              loading="lazy"
              className="rounded-xl shadow"
            />
          ) : isYouTube ? (
            <div className="relative aspect-video w-full rounded-xl overflow-hidden shadow-lg border border-slate-700">
              <iframe
                src={parsed.embedUrl}
                title={title}
                width="100%"
                height="100%"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full"
              />
            </div>
          ) : isSoundCloud ? (
            <iframe
              width="100%"
              height="120"
              scrolling="no"
              frameBorder="no"
              allow="autoplay"
              src={parsed.embedUrl}
              className="rounded-xl shadow"
            />
          ) : null}
        </div>
      )}
    </div>
  );
}
