import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase, isSupabaseConfigured } from '../../lib/supabaseClient';
import { sounds } from '../../lib/sound';
import confetti from 'canvas-confetti';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Heart,
  Flame,
  Laugh,
  Send,
  Eye,
  Crown,
  Sparkles,
  Volume2,
  VolumeX,
  Trash2
} from 'lucide-react';

const STORY_DURATION = 5000; // 5 segundos por story

const STORY_REACTIONS = [
  { id: 'heart', emoji: '❤️', label: 'Curtir' },
  { id: 'fire', emoji: '🔥', label: 'Fogo' },
  { id: 'clap', emoji: '👏', label: 'Aplausos' },
  { id: 'laugh', emoji: '😂', label: 'Rir' },
  { id: 'crown', emoji: '👑', label: 'Coroa' }
];

export function StoryViewerModal({ storyGroup, isOpen, onClose, onReplyToAuthor }) {
  const { user: currentUser } = useAuth();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [floatingEmojis, setFloatingEmojis] = useState([]);
  const [viewCount, setViewCount] = useState(0);

  const progressTimerRef = useRef(null);

  const author = storyGroup?.user || {};
  const stories = storyGroup?.stories || [];
  const currentStory = stories[currentIndex];

  const isOwnStory = currentUser?.id === author?.id;

  useEffect(() => {
    if (!isOpen || !currentStory) return;
    setProgress(0);
    recordView(currentStory.id);
    loadStoryStats(currentStory.id);
  }, [isOpen, currentIndex, currentStory?.id]);

  // Temporizador da barra de progresso
  useEffect(() => {
    if (!isOpen || isPaused || !currentStory) return;

    const interval = 50;
    const increment = (interval / STORY_DURATION) * 100;

    progressTimerRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          handleNextStory();
          return 0;
        }
        return prev + increment;
      });
    }, interval);

    return () => clearInterval(progressTimerRef.current);
  }, [isOpen, isPaused, currentIndex, currentStory?.id]);

  const recordView = async (storyId) => {
    if (!isSupabaseConfigured || !supabase || !currentUser) return;
    try {
      await supabase.from('story_views').insert({
        story_id: storyId,
        viewer_id: currentUser.id
      }).maybeSingle();
    } catch (e) {
      // Ignora erro se já visualizado
    }
  };

  const loadStoryStats = async (storyId) => {
    if (!isSupabaseConfigured || !supabase) return;
    try {
      const { count } = await supabase
        .from('story_views')
        .select('*', { count: 'exact', head: true })
        .eq('story_id', storyId);

      setViewCount(count || 0);
    } catch (e) {
      console.warn('Erro ao buscar views:', e);
    }
  };

  const handleNextStory = () => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setProgress(0);
    } else {
      onClose();
    }
  };

  const handlePrevStory = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      setProgress(0);
    }
  };

  const handleSendReaction = async (reaction) => {
    if (!currentStory || !currentUser) return;

    // Efeito de partículas flutuantes
    const id = Date.now();
    setFloatingEmojis((prev) => [...prev, { id, emoji: reaction.emoji, x: Math.random() * 60 + 20 }]);
    setTimeout(() => {
      setFloatingEmojis((prev) => prev.filter((item) => item.id !== id));
    }, 2000);

    sounds.playPop();

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('story_reactions').insert({
          story_id: currentStory.id,
          user_id: currentUser.id,
          reaction_type: reaction.id
        });
      } catch (e) {
        // Ignora duplicata
      }
    }
  };

  const handleDeleteOwnStory = async () => {
    if (!window.confirm('Tem certeza que deseja excluir este Story?')) return;
    try {
      if (isSupabaseConfigured && supabase && currentStory) {
        await supabase.from('nexus_stories').delete().eq('id', currentStory.id);
      }
      sounds.playPop();
      onClose();
    } catch (e) {
      console.error('Erro ao excluir story:', e);
    }
  };

  if (!isOpen || !currentStory) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-xl animate-fadeIn select-none">
      {/* Contêiner Estilo Celular / Story */}
      <div
        className="relative w-full max-w-sm sm:max-w-md h-full sm:h-[85vh] sm:max-h-[750px] sm:rounded-3xl overflow-hidden shadow-2xl bg-black border sm:border-slate-800 flex flex-col justify-between"
        onMouseDown={() => setIsPaused(true)}
        onMouseUp={() => setIsPaused(false)}
        onTouchStart={() => setIsPaused(true)}
        onTouchEnd={() => setIsPaused(false)}
      >
        {/* Barras de Progresso no Topo */}
        <div className="absolute top-3 left-3 right-3 z-30 flex items-center gap-1.5">
          {stories.map((s, idx) => (
            <div key={s.id || idx} className="flex-1 h-1 rounded-full bg-white/30 overflow-hidden">
              <div
                className="h-full bg-white transition-all duration-75"
                style={{
                  width: idx < currentIndex ? '100%' : idx === currentIndex ? `${progress}%` : '0%'
                }}
              />
            </div>
          ))}
        </div>

        {/* Topbar do Autor */}
        <div className="absolute top-7 left-3 right-3 z-30 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img
              src={author.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${author.id}`}
              alt={author.display_name}
              className="w-10 h-10 rounded-full object-cover border-2 border-amber-400 shadow-md"
            />
            <div>
              <span className="text-xs font-bold text-white block drop-shadow">
                {author.display_name || author.username} {isOwnStory && '(Você)'}
              </span>
              <span className="text-[10px] text-white/75 drop-shadow">
                {new Date(currentStory.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isOwnStory && (
              <>
                <span className="text-xs text-white/90 font-bold px-2.5 py-1 rounded-full bg-black/50 border border-white/20 flex items-center gap-1">
                  <Eye className="w-3.5 h-3.5 text-amber-300" /> {viewCount}
                </span>
                <button
                  type="button"
                  onClick={handleDeleteOwnStory}
                  className="p-1.5 rounded-full bg-rose-600/80 hover:bg-rose-600 text-white transition-colors"
                  title="Excluir este story"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-full bg-black/40 text-white hover:bg-black/70 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Áreas de Toque Esquerda e Direita para Navegação */}
        <div
          onClick={handlePrevStory}
          className="absolute top-0 left-0 w-1/3 h-full z-20 cursor-pointer"
          title="Story anterior"
        />
        <div
          onClick={handleNextStory}
          className="absolute top-0 right-0 w-2/3 h-full z-20 cursor-pointer"
          title="Próximo story"
        />

        {/* Mídia do Story (Imagem ou Vídeo) */}
        <div className="flex-1 w-full h-full flex items-center justify-center bg-black relative">
          {currentStory.media_type === 'video' ? (
            <video
              src={currentStory.media_url}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-contain sm:object-cover"
            />
          ) : (
            <img
              src={currentStory.media_url}
              alt="Story"
              className="w-full h-full object-contain sm:object-cover"
            />
          )}

          {/* Legenda do Story */}
          {currentStory.caption && (
            <div className="absolute bottom-20 left-4 right-4 z-25 p-3 rounded-2xl bg-black/60 backdrop-blur-md border border-white/10 text-white text-xs font-semibold text-center leading-relaxed">
              {currentStory.caption}
            </div>
          )}

          {/* Partículas Flutuantes de Reação */}
          {floatingEmojis.map((item) => (
            <div
              key={item.id}
              style={{ left: `${item.x}%` }}
              className="absolute bottom-24 text-3xl animate-floatUp pointer-events-none z-35"
            >
              {item.emoji}
            </div>
          ))}
        </div>

        {/* Barra de Reações Rápidas e Resposta no Rodapé */}
        {!isOwnStory && (
          <div className="relative z-30 p-4 bg-gradient-to-t from-black via-black/80 to-transparent flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              {STORY_REACTIONS.map((reac) => (
                <button
                  key={reac.id}
                  onClick={() => handleSendReaction(reac)}
                  className="p-2 rounded-full bg-white/15 hover:bg-white/30 text-xl transition-transform hover:scale-125 backdrop-blur-sm"
                  title={reac.label}
                >
                  {reac.emoji}
                </button>
              ))}
            </div>

            {onReplyToAuthor && (
              <button
                onClick={() => {
                  onClose();
                  onReplyToAuthor(author);
                }}
                className="px-3.5 py-2 rounded-full bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold flex items-center gap-1 shadow-lg transition-all"
              >
                <Send className="w-3.5 h-3.5" /> Responder
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
