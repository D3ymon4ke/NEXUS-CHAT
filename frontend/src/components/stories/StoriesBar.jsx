import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase, isSupabaseConfigured } from '../../lib/supabaseClient';
import { Plus, Sparkles, ChevronRight, ChevronLeft } from 'lucide-react';

export function StoriesBar({ onOpenCreateStory, onOpenStoryViewer }) {
  const { user } = useAuth();
  const [groupedStories, setGroupedStories] = useState([]);
  const [userHasStory, setUserHasStory] = useState(false);

  useEffect(() => {
    loadActiveStories();

    // Escutar novos stories em tempo real
    if (isSupabaseConfigured && supabase) {
      const channel = supabase
        .channel('realtime:stories')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'nexus_stories' },
          () => {
            loadActiveStories();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user?.id]);

  const loadActiveStories = async () => {
    if (!isSupabaseConfigured || !supabase) return;
    try {
      const now = new Date().toISOString();
      const { data } = await supabase
        .from('nexus_stories')
        .select('*, author:profiles(*)')
        .gt('expires_at', now)
        .order('created_at', { ascending: true });

      if (data) {
        // Agrupar stories por autor
        const groups = new Map();
        let hasOwn = false;

        data.forEach((story) => {
          if (story.user_id === user?.id) hasOwn = true;

          if (!groups.has(story.user_id)) {
            groups.set(story.user_id, {
              user: story.author || { id: story.user_id, display_name: 'Usuário' },
              stories: []
            });
          }
          groups.get(story.user_id).stories.push(story);
        });

        setUserHasStory(hasOwn);
        setGroupedStories(Array.from(groups.values()));
      }
    } catch (err) {
      console.warn('Erro ao carregar stories:', err);
    }
  };

  return (
    <div className="w-full py-2.5 px-3 bg-background-surface/40 border-b border-slate-800/80 flex items-center gap-3 overflow-x-auto select-none no-scrollbar">
      {/* Botão de Adicionar / Ver Meu Story */}
      <div className="flex flex-col items-center flex-shrink-0 cursor-pointer group">
        <div className="relative" onClick={onOpenCreateStory}>
          <div className={`p-0.5 rounded-full ${userHasStory ? 'bg-gradient-to-tr from-amber-400 via-rose-500 to-purple-600' : 'bg-slate-700'}`}>
            <img
              src={user?.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${user?.id}`}
              alt="Meu Avatar"
              className="w-12 h-12 rounded-full object-cover border-2 border-slate-900 shadow group-hover:scale-105 transition-transform"
            />
          </div>
          <button
            type="button"
            className="absolute bottom-0 right-0 p-1 bg-brand-600 hover:bg-brand-500 text-white rounded-full border-2 border-slate-900 shadow-md group-hover:scale-110 transition-transform"
            title="Criar novo Story"
          >
            <Plus className="w-3 h-3" />
          </button>
        </div>
        <span className="text-[10px] font-bold text-slate-300 mt-1 truncate max-w-[60px]">
          {userHasStory ? 'Seu Story' : 'Criar Story'}
        </span>
      </div>

      {/* Stories de Outros Usuários */}
      {groupedStories.map((group) => {
        if (group.user.id === user?.id) return null; // Já mostrado no primeiro item

        return (
          <div
            key={group.user.id}
            onClick={() => onOpenStoryViewer && onOpenStoryViewer(group)}
            className="flex flex-col items-center flex-shrink-0 cursor-pointer group"
          >
            <div className="p-0.5 rounded-full bg-gradient-to-tr from-amber-400 via-rose-500 to-purple-600 shadow-md group-hover:scale-105 transition-transform animate-pulse">
              <img
                src={group.user.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${group.user.id}`}
                alt={group.user.display_name}
                className="w-12 h-12 rounded-full object-cover border-2 border-slate-900"
              />
            </div>
            <span className="text-[10px] font-bold text-slate-300 mt-1 truncate max-w-[60px] group-hover:text-amber-300 transition-colors">
              {group.user.display_name || group.user.username}
            </span>
          </div>
        );
      })}
    </div>
  );
}
