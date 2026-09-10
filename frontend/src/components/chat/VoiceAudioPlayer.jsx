import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2 } from 'lucide-react';
import { haptics } from '../../lib/haptics';

// Gera barras de amplitude pseudo-aleatórias mas determinísticas com base no URL do áudio
function generateWaveformBars(seedStr, count = 28) {
  let hash = 0;
  for (let i = 0; i < seedStr.length; i++) {
    hash = (hash << 5) - hash + seedStr.charCodeAt(i);
    hash |= 0;
  }
  const bars = [];
  for (let i = 0; i < count; i++) {
    const val = Math.abs(Math.sin((hash + i * 37) * 0.45));
    // Altura normalizada entre 20% e 95%
    bars.push(Math.round(20 + val * 75));
  }
  return bars;
}

function formatAudioTime(seconds) {
  if (!seconds || isNaN(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

export function VoiceAudioPlayer({ src, isOwn = false }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const audioRef = useRef(null);
  const waveformRef = useRef(null);

  const bars = React.useMemo(() => generateWaveformBars(src || 'voice-note', 28), [src]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
        setDuration(audio.duration);
      }
    };

    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const onEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('ended', onEnded);
    };
  }, []);

  const togglePlay = (e) => {
    e.stopPropagation();
    const audio = audioRef.current;
    if (!audio) return;

    haptics.selection?.();

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().then(() => {
        setIsPlaying(true);
      }).catch((err) => {
        console.warn('Erro ao reproduzir áudio:', err);
      });
    }
  };

  const handleSpeedToggle = (e) => {
    e.stopPropagation();
    haptics.light?.();
    const audio = audioRef.current;
    const speeds = [1, 1.5, 2];
    const nextIdx = (speeds.indexOf(playbackRate) + 1) % speeds.length;
    const newSpeed = speeds[nextIdx];
    setPlaybackRate(newSpeed);
    if (audio) {
      audio.playbackRate = newSpeed;
    }
  };

  const handleWaveformClick = (e) => {
    e.stopPropagation();
    const audio = audioRef.current;
    const container = waveformRef.current;
    if (!audio || !container || !duration) return;

    const rect = container.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    const newTime = ratio * duration;
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const progressRatio = duration > 0 ? currentTime / duration : 0;

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className={`flex items-center gap-2.5 p-2.5 rounded-2xl max-w-xs sm:max-w-sm select-none transition-all my-1 ${
        isOwn
          ? 'bg-black/25 text-white border border-white/10 shadow-sm'
          : 'bg-background-dark/80 text-slate-100 border border-slate-700/60 shadow-md'
      }`}
    >
      <audio ref={audioRef} src={src} preload="metadata" />

      {/* Botão Play / Pause estilo Telegram */}
      <button
        type="button"
        onClick={togglePlay}
        className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-transform active:scale-95 shadow-md ${
          isOwn
            ? 'bg-white text-brand-700 hover:bg-slate-100'
            : 'bg-brand-500 text-white hover:bg-brand-400'
        }`}
        title={isPlaying ? 'Pausar' : 'Reproduzir'}
      >
        {isPlaying ? (
          <Pause className="w-4 h-4 fill-current" />
        ) : (
          <Play className="w-4 h-4 ml-0.5 fill-current" />
        )}
      </button>

      {/* Área Central: Waveform + Duração */}
      <div className="flex-1 min-w-0 flex flex-col justify-center gap-1">
        {/* Barras de Onda Sonora */}
        <div
          ref={waveformRef}
          onClick={handleWaveformClick}
          className="flex items-center gap-[2.5px] h-7 cursor-pointer py-1 group/wave"
          title="Clique para avançar/retroceder"
        >
          {bars.map((heightPercent, idx) => {
            const barRatio = idx / bars.length;
            const isPlayed = barRatio <= progressRatio;

            return (
              <div
                key={idx}
                style={{ height: `${heightPercent}%` }}
                className={`w-[3px] rounded-full transition-all duration-100 ${
                  isPlayed
                    ? isOwn
                      ? 'bg-white'
                      : 'bg-brand-400'
                    : isOwn
                    ? 'bg-white/30 group-hover/wave:bg-white/45'
                    : 'bg-slate-600/70 group-hover/wave:bg-slate-500'
                }`}
              />
            );
          })}
        </div>

        {/* Timers */}
        <div className="flex items-center justify-between text-[11px] font-mono tracking-tight opacity-75">
          <span>{isPlaying ? formatAudioTime(currentTime) : (duration ? formatAudioTime(duration) : 'Áudio')}</span>
          {duration > 0 && isPlaying && <span>{formatAudioTime(duration)}</span>}
        </div>
      </div>

      {/* Botão de Velocidade (1x / 1.5x / 2x) */}
      <button
        type="button"
        onClick={handleSpeedToggle}
        className={`px-1.5 py-0.5 rounded-lg text-[10px] font-bold font-mono transition-colors flex-shrink-0 ${
          playbackRate > 1
            ? isOwn
              ? 'bg-white text-slate-900 font-extrabold shadow'
              : 'bg-brand-500 text-white font-extrabold shadow'
            : isOwn
            ? 'bg-white/15 text-white hover:bg-white/25'
            : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
        }`}
        title="Alternar velocidade"
      >
        {playbackRate}x
      </button>
    </div>
  );
}
