import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useChat } from '../../context/ChatContext';
import { supabase, isSupabaseConfigured } from '../../lib/supabaseClient';
import { sounds } from '../../lib/sound';
import { ProfileMusicPlayer } from './ProfileMusicPlayer';
import confetti from 'canvas-confetti';
import {
  X,
  MessageSquare,
  UserPlus,
  UserCheck,
  Clock,
  Sparkles,
  Shield,
  Coins,
  Flame,
  Calendar,
  Layers,
  Heart,
  Share2,
  Music
} from 'lucide-react';

const FRAME_STYLES = {
  frame_cyber_neon: 'border-2 border-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.8)] animate-pulse',
  frame_belmont_gold: 'border-2 border-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.9)] ring-2 ring-amber-500/50',
  frame_inferno: 'border-2 border-rose-500 shadow-[0_0_14px_rgba(244,63,94,0.9)] ring-1 ring-orange-500',
  frame_galaxy: 'border-2 border-purple-400 shadow-[0_0_16px_rgba(192,132,252,0.9)] ring-2 ring-indigo-500'
};

const BADGE_LABELS = {
  badge_coordinator: { icon: '⭐', label: 'Coordenador', color: 'text-amber-300 bg-amber-500/20 border-amber-500/40' },
  badge_moderator: { icon: '🛡️', label: 'Moderador', color: 'text-indigo-300 bg-indigo-500/20 border-indigo-500/40' },
  badge_beta_tester: { icon: '🧪', label: 'BETA TESTER', color: 'text-cyan-300 bg-cyan-500/20 border-cyan-500/40' },
  badge_ambassador: { icon: '🌟', label: 'Embaixador', color: 'text-emerald-300 bg-emerald-500/20 border-emerald-500/40' },
  badge_vip_honor: { icon: '💎', label: 'VIP Honorário', color: 'text-rose-300 bg-rose-500/20 border-rose-500/40' },
  badge_belmont_vip: { icon: '👑', label: 'VIP Belmont', color: 'text-amber-300 bg-amber-500/20 border-amber-500/40' },
  badge_early_adopter: { icon: '⚡', label: 'Pioneiro', color: 'text-amber-300 bg-amber-500/20 border-amber-500/40' },
  badge_diamond: { icon: '💎', label: 'Diamante', color: 'text-sky-300 bg-sky-500/20 border-sky-500/40' },
  badge_chat_master: { icon: '🔥', label: 'Chat Master', color: 'text-rose-300 bg-rose-500/20 border-rose-500/40' }
};

const NAME_STYLES = {
  name_rainbow_glow: 'bg-gradient-to-r from-red-400 via-amber-300 via-green-300 to-sky-400 bg-clip-text text-transparent font-extrabold',
  name_golden_glow: 'text-amber-300 font-extrabold drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]',
  name_electric_cyan: 'text-cyan-400 font-extrabold drop-shadow-[0_0_8px_rgba(34,211,238,0.6)]'
};

export function UserProfileModal({
  targetUser,
  isOpen,
  onClose,
  onStartDirectChat,
  onOpenUserStories,
  onOpenEditProfile
}) {
  const { user: currentUser } = useAuth();
  const [friendshipStatus, setFriendshipStatus] = useState('none'); // 'none' | 'pending' | 'accepted' | 'incoming'
  const [actionLoading, setActionLoading] = useState(false);
  const [hasActiveStories, setHasActiveStories] = useState(false);

  const isOwnProfile = currentUser?.id === targetUser?.id;
  const userSongUrl = targetUser?.profile_song_url || (isOwnProfile ? currentUser?.profile_song_url : null);
  const userSongTitle = targetUser?.profile_song_title || (isOwnProfile ? currentUser?.profile_song_title : '');
  const userSongArtist = targetUser?.profile_song_artist || (isOwnProfile ? currentUser?.profile_song_artist : '');
  const userSongCover = targetUser?.profile_song_cover || (isOwnProfile ? currentUser?.profile_song_cover : '');

  useEffect(() => {
    if (!isOpen || !targetUser || !currentUser) return;
    checkFriendship();
    checkStories();
  }, [isOpen, targetUser?.id, currentUser?.id]);

  const checkFriendship = async () => {
    if (!isSupabaseConfigured || !supabase || isOwnProfile) return;
    try {
      const { data } = await supabase
        .from('friendships')
        .select('*')
        .or(`and(user_id.eq.${currentUser.id},friend_id.eq.${targetUser.id}),and(user_id.eq.${targetUser.id},friend_id.eq.${currentUser.id})`)
        .maybeSingle();

      if (!data) {
        setFriendshipStatus('none');
      } else if (data.status === 'accepted') {
        setFriendshipStatus('accepted');
      } else if (data.user_id === currentUser.id) {
        setFriendshipStatus('pending');
      } else {
        setFriendshipStatus('incoming');
      }
    } catch (err) {
      console.error('Erro ao checar amizade:', err);
    }
  };

  const checkStories = async () => {
    if (!isSupabaseConfigured || !supabase) return;
    try {
      const now = new Date().toISOString();
      const { count } = await supabase
        .from('nexus_stories')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', targetUser.id)
        .gt('expires_at', now);

      setHasActiveStories(Boolean(count && count > 0));
    } catch (err) {
      console.warn('Erro ao checar stories do perfil:', err);
    }
  };

  const handleSendFriendRequest = async () => {
    if (!currentUser || !targetUser || isOwnProfile) return;
    try {
      setActionLoading(true);
      if (isSupabaseConfigured && supabase) {
        await supabase.from('friendships').insert({
          user_id: currentUser.id,
          friend_id: targetUser.id,
          status: 'pending'
        });
      }

      sounds.playPop();
      confetti({ particleCount: 40, spread: 50, origin: { y: 0.6 } });
      setFriendshipStatus('pending');
    } catch (err) {
      console.error('Erro ao enviar pedido de amizade:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleAcceptFriendRequest = async () => {
    if (!currentUser || !targetUser) return;
    try {
      setActionLoading(true);
      if (isSupabaseConfigured && supabase) {
        await supabase
          .from('friendships')
          .update({ status: 'accepted', updated_at: new Date().toISOString() })
          .or(`and(user_id.eq.${targetUser.id},friend_id.eq.${currentUser.id}),and(user_id.eq.${currentUser.id},friend_id.eq.${targetUser.id})`);
      }

      sounds.playPop();
      confetti({ particleCount: 60, spread: 60, origin: { y: 0.6 } });
      setFriendshipStatus('accepted');
    } catch (err) {
      console.error('Erro ao aceitar pedido:', err);
    } finally {
      setActionLoading(false);
    }
  };

  if (!isOpen || !targetUser) return null;

  const frameClass = FRAME_STYLES[targetUser.equipped_frame] || 'border-2 border-slate-700';
  const badgeInfo = BADGE_LABELS[targetUser.equipped_badge];
  const nameStyle = NAME_STYLES[targetUser.equipped_name_color] || 'text-white font-extrabold';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn select-none">
      <div className="glass-modal w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-slate-700/80 flex flex-col relative overflow-hidden max-h-[95vh] overflow-y-auto">
        {/* Glow de Fundo */}
        <div className="absolute -top-20 -right-20 w-48 h-48 bg-brand-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-48 h-48 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Botão Fechar */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-background-surface transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Avatar com Moldura & Stories */}
        <div className="flex flex-col items-center text-center mt-2">
          <div className="relative group cursor-pointer" onClick={() => hasActiveStories && onOpenUserStories && onOpenUserStories(targetUser.id)}>
            <div className={`p-1 rounded-full ${hasActiveStories ? 'bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 p-[3px] shadow-lg animate-pulse' : ''}`}>
              <img
                src={targetUser.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${targetUser.id}`}
                alt={targetUser.display_name}
                className={`w-24 h-24 rounded-full object-cover shadow-2xl ${frameClass}`}
              />
            </div>
            {hasActiveStories && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-gradient-to-r from-rose-600 to-amber-600 text-white text-[9px] font-extrabold uppercase shadow">
                Ver Stories 📱
              </span>
            )}
          </div>

          {/* Nome e Badges */}
          <div className="mt-3.5 space-y-1">
            <div className="flex flex-wrap items-center justify-center gap-1.5">
              <h2 className={`text-lg font-bold ${nameStyle}`}>{targetUser.display_name || targetUser.username}</h2>
              {targetUser.custom_title && (
                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-gradient-to-r from-cyan-500/25 to-blue-600/25 text-cyan-300 font-extrabold border border-cyan-400/50 shadow-sm flex items-center gap-1">
                  <span>⭐</span>
                  <span>{targetUser.custom_title}</span>
                </span>
              )}
              {badgeInfo && (
                <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold flex items-center gap-1 ${badgeInfo.color || 'bg-amber-500/20 text-amber-300 border-amber-500/40'}`}>
                  <span>{badgeInfo.icon}</span>
                  <span>{badgeInfo.label}</span>
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400">@{targetUser.username}</p>
          </div>

          {/* Status Message */}
          <div className="mt-2.5 px-3 py-1 rounded-full bg-background-dark/80 border border-slate-800 text-[11px] text-slate-300 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>{targetUser.status_message || 'Online no Nexus Chat'}</span>
          </div>

          {/* Bio */}
          {targetUser.bio && (
            <p className="text-xs text-slate-300 mt-3 px-2 leading-relaxed italic">
              "{targetUser.bio}"
            </p>
          )}

          {/* MÚSICA TEMA DO PERFIL (PROFILE ANTHEM) */}
          <div className="w-full mt-3.5">
            {userSongUrl ? (
              <ProfileMusicPlayer
                songUrl={userSongUrl}
                songTitle={userSongTitle}
                songArtist={userSongArtist}
                songCover={userSongCover}
              />
            ) : isOwnProfile ? (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  if (onOpenEditProfile) onOpenEditProfile();
                }}
                className="w-full p-2.5 rounded-2xl bg-indigo-950/40 hover:bg-indigo-900/50 border border-indigo-500/30 text-indigo-300 hover:text-indigo-200 text-xs font-bold flex items-center justify-center gap-2 transition-all group"
              >
                <Music className="w-4 h-4 text-indigo-400 group-hover:scale-110 transition-transform" />
                <span>+ Adicionar Música Tema no Perfil</span>
              </button>
            ) : null}
          </div>

          {/* Estatísticas do Usuário */}
          <div className="grid grid-cols-2 gap-2.5 w-full mt-3.5 p-3 rounded-2xl bg-background-surface/60 border border-slate-800">
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-1 text-amber-300 font-extrabold text-xs">
                <img src="/nexus-coin.jpg" alt="Moeda" className="w-3.5 h-3.5 rounded-full" />
                <span>{targetUser.nexus_coins || 0}</span>
              </div>
              <span className="text-[10px] text-slate-400">Nexus Coins</span>
            </div>
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-1 text-slate-200 font-extrabold text-xs">
                <Flame className="w-3.5 h-3.5 text-amber-400" />
                <span>{targetUser.daily_streak || 0} dias</span>
              </div>
              <span className="text-[10px] text-slate-400">Streak de Login</span>
            </div>
          </div>

          {/* Botões de Ação */}
          {!isOwnProfile ? (
            <div className="grid grid-cols-2 gap-2 w-full mt-4">
              {/* Botão de Amizade */}
              {friendshipStatus === 'accepted' ? (
                <button
                  disabled
                  className="py-2.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-bold flex items-center justify-center gap-1.5 cursor-default"
                >
                  <UserCheck className="w-4 h-4" /> Amigos
                </button>
              ) : friendshipStatus === 'pending' ? (
                <button
                  disabled
                  className="py-2.5 rounded-xl bg-slate-800 text-slate-400 border border-slate-700 text-xs font-bold flex items-center justify-center gap-1.5 cursor-default"
                >
                  <Clock className="w-4 h-4" /> Solicitado
                </button>
              ) : friendshipStatus === 'incoming' ? (
                <button
                  onClick={handleAcceptFriendRequest}
                  disabled={actionLoading}
                  className="py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md"
                >
                  <UserCheck className="w-4 h-4" /> Aceitar Amigo
                </button>
              ) : (
                <button
                  onClick={handleSendFriendRequest}
                  disabled={actionLoading}
                  className="py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md transition-all hover:scale-105"
                >
                  <UserPlus className="w-4 h-4" /> Adicionar
                </button>
              )}

              {/* Botão de Mensagem Direta */}
              <button
                onClick={() => {
                  onClose();
                  if (onStartDirectChat) onStartDirectChat(targetUser);
                }}
                className="py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 text-black text-xs font-extrabold flex items-center justify-center gap-1.5 shadow-md transition-all hover:scale-105"
              >
                <MessageSquare className="w-4 h-4" /> Conversar
              </button>
            </div>
          ) : (
            <div className="w-full mt-3">
              <button
                onClick={() => {
                  onClose();
                  if (onOpenEditProfile) onOpenEditProfile();
                }}
                className="w-full py-2.5 rounded-xl bg-brand-600/30 hover:bg-brand-600/50 border border-brand-500/40 text-brand-300 font-bold text-xs shadow transition-all flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4" /> Editar Meu Perfil & Música
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
