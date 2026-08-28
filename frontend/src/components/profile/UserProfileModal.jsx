import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useChat } from '../../context/ChatContext';
import { supabase, isSupabaseConfigured } from '../../lib/supabaseClient';
import { sounds } from '../../lib/sound';
import { ProfileMusicPlayer } from './ProfileMusicPlayer';
import { AvatarLightboxModal } from './AvatarLightboxModal';
import { SendGiftModal } from './SendGiftModal';
import { GiftDetailModal } from './GiftDetailModal';
import { GIFT_CATALOG, GIFT_RARITIES } from '../../lib/giftCatalog';
import { compressImageFile } from '../../lib/imageCompressor';
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
  Music,
  Camera,
  Gift,
  ZoomIn,
  Image as ImageIcon,
  Check
} from 'lucide-react';

import { getFrameAsset, getFrameStyle } from '../../lib/shopCatalog';

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
  const { user: currentUser, updateProfile } = useAuth();
  const [friendshipStatus, setFriendshipStatus] = useState('none'); // 'none' | 'pending' | 'accepted' | 'incoming'
  const [actionLoading, setActionLoading] = useState(false);
  const [hasActiveStories, setHasActiveStories] = useState(false);

  // Presentes recebidos
  const [receivedGifts, setReceivedGifts] = useState([]);
  const [loadingGifts, setLoadingGifts] = useState(false);

  // Modais Secundários
  const [showLightbox, setShowLightbox] = useState(false);
  const [showSendGiftModal, setShowSendGiftModal] = useState(false);
  const [selectedGiftDetail, setSelectedGiftDetail] = useState(null);

  // Capa de Perfil
  const [uploadingBanner, setUploadingBanner] = useState(false);

  const isOwnProfile = currentUser?.id === targetUser?.id;
  const userSongUrl = targetUser?.profile_song_url || (isOwnProfile ? currentUser?.profile_song_url : null);
  const userSongTitle = targetUser?.profile_song_title || (isOwnProfile ? currentUser?.profile_song_title : '');
  const userSongArtist = targetUser?.profile_song_artist || (isOwnProfile ? currentUser?.profile_song_artist : '');
  const userSongCover = targetUser?.profile_song_cover || (isOwnProfile ? currentUser?.profile_song_cover : '');
  const bannerUrl = (isOwnProfile ? currentUser?.profile_banner_url : targetUser?.profile_banner_url) || null;

  useEffect(() => {
    if (!isOpen || !targetUser || !currentUser) return;
    checkFriendship();
    checkStories();
    loadReceivedGifts();
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

  const loadReceivedGifts = async () => {
    if (!isSupabaseConfigured || !supabase || !targetUser) return;
    try {
      setLoadingGifts(true);
      const { data, error } = await supabase
        .from('user_gifts')
        .select('*, sender:profiles(id, username, display_name, avatar_url)')
        .eq('recipient_id', targetUser.id)
        .order('created_at', { ascending: false });

      if (data) {
        setReceivedGifts(data);
      }
    } catch (err) {
      console.warn('Erro ao carregar presentes recebidos:', err);
    } finally {
      setLoadingGifts(false);
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

  const handleBannerUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !isOwnProfile) return;

    try {
      setUploadingBanner(true);
      const base64Banner = await compressImageFile(file, { maxWidth: 1200, maxHeight: 400, quality: 0.82 });

      if (isSupabaseConfigured && supabase && currentUser) {
        await supabase
          .from('profiles')
          .update({ profile_banner_url: base64Banner })
          .eq('id', currentUser.id);
      }

      if (updateProfile) {
        updateProfile({ profile_banner_url: base64Banner });
      }

      sounds.playPop();
    } catch (err) {
      console.error('Erro ao fazer upload da capa:', err);
    } finally {
      setUploadingBanner(false);
    }
  };

  if (!isOpen || !targetUser) return null;

  const equippedFrameKey = isOwnProfile ? (currentUser?.equipped_frame || targetUser?.equipped_frame) : targetUser?.equipped_frame;
  const animatedFrameUrl = getFrameAsset(equippedFrameKey);
  const frameClass = getFrameStyle(equippedFrameKey) || (!animatedFrameUrl ? 'border-2 border-slate-700' : '');
  const badgeInfo = BADGE_LABELS[targetUser.equipped_badge];
  const nameStyle = NAME_STYLES[targetUser.equipped_name_color] || 'text-white font-extrabold';

  // Agrupar presentes recebidos por ID único
  const groupedGifts = receivedGifts.reduce((acc, item) => {
    if (!acc[item.gift_id]) {
      const catalogItem = GIFT_CATALOG.find(g => g.id === item.gift_id) || {
        id: item.gift_id,
        name: item.gift_name,
        icon: item.gift_icon,
        rarity: item.rarity || 'common'
      };
      acc[item.gift_id] = {
        giftInfo: catalogItem,
        count: 0,
        entries: []
      };
    }
    acc[item.gift_id].count += (item.quantity || 1);
    acc[item.gift_id].entries.push(item);
    return acc;
  }, {});

  const totalGiftsCount = Object.values(groupedGifts).reduce((sum, g) => sum + g.count, 0);

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/85 backdrop-blur-xl animate-fadeIn select-none overflow-hidden box-border">
        <div className="glass-modal w-full max-w-sm sm:max-w-md rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-700/80 flex flex-col relative overflow-hidden max-h-[96vh] sm:max-h-[92vh] overflow-y-auto box-border">
          {/* Glow de Fundo */}
          <div className="absolute -top-20 -right-20 w-48 h-48 bg-brand-500/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-20 -left-20 w-48 h-48 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />

          {/* CAPA DE PERFIL (PROFILE BANNER / COVER) */}
          <div className="relative w-full h-28 sm:h-36 overflow-hidden bg-gradient-to-r from-purple-950 via-slate-900 to-indigo-950 flex-shrink-0">
            {bannerUrl ? (
              <img
                src={bannerUrl}
                alt="Capa de Perfil"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-r from-purple-900/60 via-slate-900 to-amber-950/60 relative">
                <div className="absolute inset-0 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:16px_16px] opacity-20" />
              </div>
            )}

            {/* Overlay Gradiente na Base da Capa */}
            <div className="absolute inset-0 bg-gradient-to-t from-background-card via-transparent to-black/30 pointer-events-none" />

            {/* Botão de Upload da Capa (Apenas no Perfil Próprio) */}
            {isOwnProfile && (
              <label
                className="absolute top-3 left-3 p-1.5 sm:p-2 rounded-xl bg-black/60 hover:bg-black/80 text-slate-200 hover:text-white border border-white/20 backdrop-blur transition-all cursor-pointer shadow flex items-center gap-1 text-[10px] font-bold z-10 active:scale-95"
                title="Trocar capa do perfil"
              >
                <Camera className="w-3.5 h-3.5" />
                <span className="hidden xs:inline">{uploadingBanner ? 'Enviando...' : 'Trocar Capa'}</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleBannerUpload}
                  disabled={uploadingBanner}
                  className="hidden"
                />
              </label>
            )}

            {/* Botão Fechar no Topo Direito da Capa */}
            <button
              onClick={onClose}
              className="absolute top-3 right-3 p-1.5 sm:p-2 rounded-xl bg-black/60 hover:bg-rose-900/80 text-slate-300 hover:text-white border border-white/20 backdrop-blur transition-colors z-20"
              title="Fechar perfil"
              aria-label="Fechar"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>

          {/* CORPO DO PERFIL */}
          <div className="p-4 sm:p-5 pt-0 flex flex-col items-center text-center relative -mt-12 sm:-mt-14 z-10 min-w-0">
            {/* Avatar com Moldura, Stories e Botão de Lightbox */}
            <div className="relative group cursor-pointer">
              <div className={`p-1 rounded-full ${hasActiveStories ? 'bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 p-[3px] shadow-lg animate-pulse' : ''}`}>
                <div
                  onClick={() => setShowLightbox(true)}
                  className="relative group/avatar inline-flex items-center justify-center"
                  title="Clique para ver a foto em tela cheia"
                >
                  <img
                    src={targetUser.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${targetUser.id}`}
                    alt={targetUser.display_name}
                    className={`w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover shadow-2xl bg-slate-900 transition-transform group-hover/avatar:scale-105 ${frameClass}`}
                  />

                  {/* Moldura Animada Sobreposta no Perfil */}
                  {animatedFrameUrl && (
                    <img
                      src={animatedFrameUrl}
                      alt="Moldura Animada"
                      className="absolute -inset-[22%] w-[144%] h-[144%] max-w-none pointer-events-none object-contain z-10 select-none drop-shadow-xl"
                    />
                  )}

                  {/* Ícone de Lupa no Hover */}
                  <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover/avatar:opacity-100 transition-opacity flex items-center justify-center text-white z-20">
                    <ZoomIn className="w-5 h-5 drop-shadow-md" />
                  </div>
                </div>
              </div>

              {hasActiveStories && (
                <button
                  type="button"
                  onClick={() => onOpenUserStories && onOpenUserStories(targetUser.id)}
                  className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-gradient-to-r from-rose-600 to-amber-600 text-white text-[9px] font-extrabold uppercase shadow hover:scale-105 transition-transform"
                >
                  Stories 📱
                </button>
              )}
            </div>

            {/* Nome e Badges */}
            <div className="mt-2.5 space-y-0.5 min-w-0 max-w-full">
              <div className="flex flex-wrap items-center justify-center gap-1.5">
                <h2 className={`text-base sm:text-lg font-bold truncate max-w-[200px] sm:max-w-none ${nameStyle}`}>
                  {targetUser.display_name || targetUser.username}
                </h2>
                {targetUser.custom_title && (
                  <span className="text-[9px] sm:text-[10px] px-2 py-0.5 rounded-full bg-gradient-to-r from-cyan-500/25 to-blue-600/25 text-cyan-300 font-extrabold border border-cyan-400/50 shadow-sm flex items-center gap-1 flex-shrink-0">
                    <span>⭐</span>
                    <span className="truncate">{targetUser.custom_title}</span>
                  </span>
                )}
                {badgeInfo && (
                  <span className={`text-[9px] sm:text-[10px] px-2 py-0.5 rounded-full border font-bold flex items-center gap-1 flex-shrink-0 ${badgeInfo.color || 'bg-amber-500/20 text-amber-300 border-amber-500/40'}`}>
                    <span>{badgeInfo.icon}</span>
                    <span className="truncate">{badgeInfo.label}</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 truncate">@{targetUser.username}</p>
            </div>

            {/* Status Message */}
            <div className="mt-2 px-3 py-0.5 rounded-full bg-background-dark/80 border border-slate-800 text-[11px] text-slate-300 flex items-center gap-1.5 max-w-full truncate">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
              <span className="truncate">{targetUser.status_message || 'Online no Nexus Chat'}</span>
            </div>

            {/* Bio */}
            {targetUser.bio && (
              <p className="text-xs text-slate-300 mt-2 px-2 leading-relaxed italic line-clamp-3">
                "{targetUser.bio}"
              </p>
            )}

            {/* MÚSICA TEMA DO PERFIL (PROFILE ANTHEM) */}
            <div className="w-full mt-3 min-w-0">
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
                  className="w-full p-2 rounded-xl bg-indigo-950/40 hover:bg-indigo-900/50 border border-indigo-500/30 text-indigo-300 hover:text-indigo-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-all group"
                >
                  <Music className="w-3.5 h-3.5 text-indigo-400 group-hover:scale-110 transition-transform" />
                  <span>+ Adicionar Música Tema</span>
                </button>
              ) : null}
            </div>

            {/* Estatísticas do Usuário */}
            <div className="grid grid-cols-2 gap-2 w-full mt-3 p-2.5 rounded-2xl bg-background-surface/60 border border-slate-800">
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

            {/* MOSTRUÁRIO / VITRINE DE PRESENTES RECEBIDOS 🎁 */}
            <div className="w-full mt-3 p-3 rounded-2xl bg-gradient-to-br from-slate-900/90 via-slate-900/80 to-purple-950/30 border border-purple-500/30 shadow-lg text-left">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <Gift className="w-4 h-4 text-amber-400 animate-pulse" />
                  <h3 className="text-xs font-extrabold text-white uppercase tracking-wider">
                    Vitrine de Presentes
                  </h3>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-bold border border-purple-500/30">
                  {totalGiftsCount} {totalGiftsCount === 1 ? 'Presente' : 'Presentes'}
                </span>
              </div>

              {Object.keys(groupedGifts).length === 0 ? (
                <div className="py-4 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-1">
                  <span className="text-2xl opacity-60">🎁</span>
                  <span>Nenhum presente recebido ainda.</span>
                  {!isOwnProfile && (
                    <button
                      onClick={() => setShowSendGiftModal(true)}
                      className="mt-1.5 text-[11px] text-amber-400 hover:text-amber-300 font-bold underline"
                    >
                      Seja o primeiro a presentear!
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-2 mt-1">
                  {Object.entries(groupedGifts).map(([giftId, group]) => {
                    const rarityConfig = GIFT_RARITIES[group.giftInfo.rarity] || GIFT_RARITIES.common;
                    return (
                      <div
                        key={giftId}
                        onClick={() => setSelectedGiftDetail({ giftInfo: group.giftInfo, entries: group.entries })}
                        className={`p-2 rounded-xl bg-slate-950/80 border ${rarityConfig.borderClass} hover:scale-105 transition-all cursor-pointer flex flex-col items-center justify-center relative shadow group/gift`}
                        title={`Clique para ver mensagens de quem enviou ${group.giftInfo.name}`}
                      >
                        <span className="text-2xl group-hover/gift:scale-110 transition-transform">
                          {group.giftInfo.icon}
                        </span>
                        <span className="text-[9px] font-bold text-slate-200 mt-1 truncate max-w-full text-center">
                          {group.giftInfo.name}
                        </span>
                        <span className="absolute -top-1.5 -right-1.5 px-1.5 py-0.2 rounded-full bg-amber-500 text-slate-950 font-black text-[9px] shadow">
                          x{group.count}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* BOTÕES DE AÇÃO */}
            {!isOwnProfile ? (
              <div className="w-full mt-3.5 space-y-2">
                {/* Botão Destacado: ENVIAR PRESENTE */}
                <button
                  onClick={() => setShowSendGiftModal(true)}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 hover:from-amber-400 text-black text-xs font-black shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2 active:scale-95"
                >
                  <Gift className="w-4 h-4" />
                  <span>Presentear {targetUser.display_name || targetUser.username} 🎁</span>
                </button>

                <div className="grid grid-cols-2 gap-2 w-full">
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
                      className="py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md active:scale-95"
                    >
                      <UserCheck className="w-4 h-4" /> Aceitar Amigo
                    </button>
                  ) : (
                    <button
                      onClick={handleSendFriendRequest}
                      disabled={actionLoading}
                      className="py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md transition-all active:scale-95"
                    >
                      <UserPlus className="w-4 h-4" /> Adicionar
                    </button>
                  )}

                  {/* Botão de Conversar */}
                  <button
                    onClick={() => {
                      onClose();
                      if (onStartDirectChat) onStartDirectChat(targetUser);
                    }}
                    className="py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 text-xs font-extrabold flex items-center justify-center gap-1.5 shadow transition-all active:scale-95"
                  >
                    <MessageSquare className="w-4 h-4 text-amber-400" /> Conversar
                  </button>
                </div>
              </div>
            ) : (
              <div className="w-full mt-3 space-y-2">
                <button
                  onClick={() => {
                    onClose();
                    if (onOpenEditProfile) onOpenEditProfile();
                  }}
                  className="w-full py-2.5 rounded-xl bg-brand-600/30 hover:bg-brand-600/50 border border-brand-500/40 text-brand-300 font-bold text-xs shadow transition-all flex items-center justify-center gap-2 active:scale-95"
                >
                  <Sparkles className="w-4 h-4" /> Editar Meu Perfil & Capa
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MODAIS SECUNDÁRIOS */}
      {/* 1. Lightbox de Foto de Perfil em Alta Resolução */}
      <AvatarLightboxModal
        isOpen={showLightbox}
        onClose={() => setShowLightbox(false)}
        user={targetUser}
        frameClass={frameClass}
      />

      {/* 2. Modal de Envio de Presentes */}
      <SendGiftModal
        isOpen={showSendGiftModal}
        onClose={() => setShowSendGiftModal(false)}
        targetUser={targetUser}
        onGiftSent={() => {
          loadReceivedGifts();
        }}
      />

      {/* 3. Modal de Detalhes do Presente da Vitrine */}
      <GiftDetailModal
        isOpen={Boolean(selectedGiftDetail)}
        onClose={() => setSelectedGiftDetail(null)}
        giftInfo={selectedGiftDetail?.giftInfo}
        giftEntries={selectedGiftDetail?.entries}
      />
    </>
  );
}
