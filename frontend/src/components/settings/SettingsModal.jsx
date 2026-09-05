import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useChat } from '../../context/ChatContext';
import { supabase, isSupabaseConfigured } from '../../lib/supabaseClient';
import { SHOP_CATALOG } from '../../lib/shopCatalog';
import { PRESET_BANNERS } from '../../lib/giftCatalog';
import { sounds } from '../../lib/sound';
import { fetchMusicMetadata } from '../../lib/musicUtils';
import { ProfileMusicPlayer } from '../profile/ProfileMusicPlayer';
import { compressImageFile } from '../../lib/imageCompressor';
import { notificationService } from '../../lib/notificationService';
import {
  Settings,
  X,
  Volume2,
  VolumeX,
  User,
  Sparkles,
  RefreshCw,
  LogOut,
  Check,
  ShieldCheck,
  Database,
  Package,
  Layers,
  Palette,
  Upload,
  Camera,
  Music,
  Trash2,
  Loader2,
  ExternalLink,
  Gift,
  Image as ImageIcon,
  Bell,
  BellOff
} from 'lucide-react';

export function SettingsModal({ isOpen, onClose, onOpenProfile }) {
  const { user, updateProfile, logout, isConfigured } = useAuth();
  const { soundEnabled, toggleSound } = useChat();

  const [activeTab, setActiveTab] = useState('profile'); // 'profile' | 'inventory' | 'preferences'
  const [displayName, setDisplayName] = useState(user?.display_name || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [statusMessage, setStatusMessage] = useState(user?.status_message || 'online');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || '');
  const [profileBannerUrl, setProfileBannerUrl] = useState(user?.profile_banner_url || '');

  // Música do Perfil (Profile Anthem)
  const [songUrl, setSongUrl] = useState(user?.profile_song_url || '');
  const [songTitle, setSongTitle] = useState(user?.profile_song_title || '');
  const [songArtist, setSongArtist] = useState(user?.profile_song_artist || '');
  const [songCover, setSongCover] = useState(user?.profile_song_cover || '');
  const [loadingMusicMeta, setLoadingMusicMeta] = useState(false);

  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Notificações Push & Segundo Plano
  const [notifPermission, setNotifPermission] = useState(() => notificationService.getPermission());
  const [notifEnabled, setNotifEnabled] = useState(() => notificationService.isEnabled());
  const [testingNotif, setTestingNotif] = useState(false);
  const [notifFeedback, setNotifFeedback] = useState('');

  // Sincronizar dados do usuário sempre que o modal for aberto ou o usuário mudar
  useEffect(() => {
    if (user && isOpen) {
      setDisplayName(user.display_name || '');
      setBio(user.bio || '');
      setStatusMessage(user.status_message || 'online');
      setAvatarUrl(user.avatar_url || '');
      setProfileBannerUrl(user.profile_banner_url || '');
      setSongUrl(user.profile_song_url || '');
      setSongTitle(user.profile_song_title || '');
      setSongArtist(user.profile_song_artist || '');
      setSongCover(user.profile_song_cover || '');
      setNotifPermission(notificationService.getPermission());
      setNotifEnabled(notificationService.isEnabled());
    }
  }, [user, isOpen]);

  const handleToggleNotifications = async () => {
    if (notifPermission !== 'granted') {
      const res = await notificationService.requestPermission(user?.id);
      setNotifPermission(res.status);
      if (res.success) {
        setNotifEnabled(true);
        if (user?.id) {
          await notificationService.subscribeToPush(user.id);
        }
        sounds?.playPop?.();
      } else if (res.status === 'denied') {
        sounds?.playError?.();
        setNotifFeedback('Notificações bloqueadas pelo navegador. Habilite nas permissões do site.');
      }
    } else {
      const next = !notifEnabled;
      notificationService.setEnabled(next);
      setNotifEnabled(next);
      if (next && user?.id) {
        await notificationService.subscribeToPush(user.id);
      }
      sounds?.playPop?.();
    }
  };

  const handleTestNotification = async () => {
    setTestingNotif(true);
    setNotifFeedback('');
    try {
      const ok = await notificationService.testNotification();
      if (ok) {
        setNotifFeedback('Notificação de teste enviada!');
      } else {
        setNotifFeedback('Permissão necessária para enviar notificação.');
      }
    } catch (e) {
      setNotifFeedback('Erro ao disparar notificação.');
    } finally {
      setTestingNotif(false);
    }
  };

  if (!isOpen || !user) return null;

  const handleLogout = async () => {
    try {
      onClose?.();
      await logout();
    } catch (err) {
      console.error('Erro ao sair:', err);
    }
  };

  const unlockedItems = user?.unlocked_items || ['frame_default', 'bubble_default'];
  const myInventoryItems = SHOP_CATALOG.filter(i => unlockedItems.includes(i.id));

  // Puxa automaticamente título, artista e capa do link (YouTube / Spotify / MP3)
  const handleFetchMusicData = async (urlToFetch) => {
    const rawUrl = typeof urlToFetch === 'string' ? urlToFetch : (songUrl || '');
    const targetUrl = (rawUrl || '').trim();
    if (!targetUrl) return;
    setLoadingMusicMeta(true);
    try {
      const meta = await fetchMusicMetadata(targetUrl);
      if (meta) {
        if (meta.title && !songTitle) setSongTitle(meta.title);
        else if (meta.title) setSongTitle(meta.title);

        if (meta.artist && !songArtist) setSongArtist(meta.artist);
        else if (meta.artist) setSongArtist(meta.artist);

        if (meta.coverUrl) setSongCover(meta.coverUrl);
        sounds.playPop();
      }
    } catch (err) {
      console.warn('Erro ao obter metadados da música:', err);
    } finally {
      setLoadingMusicMeta(false);
    }
  };

  const handleClearSong = () => {
    setSongUrl('');
    setSongTitle('');
    setSongArtist('');
    setSongCover('');
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSavedSuccess(false);
    try {
      const updates = {
        display_name: (displayName || '').trim(),
        bio: bio || '',
        status_message: statusMessage || 'online',
        avatar_url: avatarUrl || '',
        profile_banner_url: profileBannerUrl || '',
        profile_song_url: (songUrl || '').trim(),
        profile_song_title: (songTitle || '').trim(),
        profile_song_artist: (songArtist || '').trim(),
        profile_song_cover: (songCover || '').trim()
      };

      if (isSupabaseConfigured && supabase && user) {
        await supabase
          .from('profiles')
          .update(updates)
          .eq('id', user.id);
      }

      await updateProfile(updates);
      setSavedSuccess(true);
      sounds.playPop();
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err) {
      console.error('Erro ao salvar perfil:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleEquipFromInventory = async (category, itemId) => {
    try {
      const fieldMap = {
        frames: 'equipped_frame',
        wallpapers: 'equipped_wallpaper',
        bubbles: 'equipped_bubble',
        badges: 'equipped_badge',
        name_colors: 'equipped_name_color'
      };

      const fieldName = fieldMap[category];
      if (!fieldName || !user) return;

      if (isSupabaseConfigured && supabase) {
        await supabase
          .from('profiles')
          .update({ [fieldName]: itemId })
          .eq('id', user.id);
      }

      await updateProfile({ [fieldName]: itemId });
      sounds.playPop();
    } catch (err) {
      console.error('Erro ao equipar:', err);
    }
  };

  const generateNewAvatar = () => {
    const seed = Math.random().toString(36).substring(7);
    setAvatarUrl(`https://api.dicebear.com/7.x/bottts/svg?seed=${seed}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn select-none">
      <div className="glass-modal w-full max-w-lg rounded-3xl p-6 shadow-2xl border border-slate-700/60 flex flex-col max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-brand-500/20 text-brand-400 flex items-center justify-center border border-brand-500/30">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Configurações & Perfil</h3>
              <p className="text-xs text-slate-400">Personalize seu perfil, inventário e preferências</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-background-surface transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Abas */}
        <div className="flex bg-background-surface/80 p-1 rounded-2xl border border-slate-800 my-4">
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'profile'
                ? 'bg-brand-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Perfil</span>
          </button>

          <button
            onClick={() => setActiveTab('inventory')}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'inventory'
                ? 'bg-gradient-to-r from-amber-600 to-yellow-600 text-white shadow'
                : 'text-amber-400/80 hover:text-amber-300'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>🎒 Meu Inventário ({myInventoryItems.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('preferences')}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'preferences'
                ? 'bg-slate-700 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Ajustes</span>
          </button>
        </div>

        {/* ABA 1: PERFIL */}
        {activeTab === 'profile' && (
          <div className="space-y-4">
            {onOpenProfile && (
              <button
                type="button"
                onClick={() => onOpenProfile(user)}
                className="w-full p-2.5 rounded-2xl bg-gradient-to-r from-purple-900/40 via-indigo-900/40 to-amber-900/40 border border-purple-500/40 hover:border-purple-400 text-purple-200 text-xs font-bold flex items-center justify-center gap-2 shadow transition-all hover:scale-[1.01] active:scale-95"
              >
                <Gift className="w-4 h-4 text-amber-400 animate-pulse" />
                <span>Ver Meu Perfil Público & Vitrine de Presentes</span>
                <ExternalLink className="w-3.5 h-3.5 text-slate-400 ml-1" />
              </button>
            )}

            <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-2xl bg-background-surface/60 border border-slate-700/50">
              <div className="relative group">
                <img
                  src={avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${user?.id}`}
                  alt="Avatar"
                  className="w-20 h-20 rounded-2xl object-cover border-2 border-brand-500 shadow-md"
                />
                <button
                  type="button"
                  onClick={generateNewAvatar}
                  title="Gerar avatar aleatório"
                  className="absolute -bottom-1 -right-1 p-1.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl shadow transition-transform group-hover:scale-110"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex-1 min-w-0 w-full space-y-2">
                <input
                  type="file"
                  id="avatar-file-upload"
                  accept="image/*"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      try {
                        const compressedUrl = await compressImageFile(file, 512, 512, 0.88);
                        if (compressedUrl) {
                          setAvatarUrl(compressedUrl);
                          if (isSupabaseConfigured && supabase && user) {
                            await supabase.from('profiles').update({ avatar_url: compressedUrl }).eq('id', user.id);
                            if (updateProfile) updateProfile({ avatar_url: compressedUrl });
                            sounds.playPop();
                          }
                        }
                      } catch (err) {
                        console.error('Erro ao processar imagem:', err);
                      }
                    }
                  }}
                  className="hidden"
                />

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => document.getElementById('avatar-file-upload')?.click()}
                    className="px-3.5 py-1.5 rounded-xl bg-brand-600/30 text-brand-300 hover:bg-brand-600/50 border border-brand-500/40 text-xs font-bold flex items-center gap-1.5 shadow transition-all active:scale-95"
                  >
                    <Upload className="w-3.5 h-3.5" /> Escolher Foto do Dispositivo
                  </button>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 block mb-0.5 font-semibold">Ou insira URL da Imagem:</span>
                  <input
                    type="text"
                    value={avatarUrl}
                    onChange={(e) => setAvatarUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full px-3 py-1.5 rounded-xl bg-background-dark text-xs border border-slate-700 text-slate-200 focus:border-brand-500 transition-all truncate"
                  />
                </div>
              </div>
            </div>

            {/* SEÇÃO: CAPA DE PERFIL (PROFILE BANNER) */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900/90 to-purple-950/30 border border-purple-500/30 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-purple-500/20 text-purple-300 flex items-center justify-center border border-purple-500/40">
                    <ImageIcon className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-extrabold text-white flex items-center gap-1.5">
                      <span>Capa do Perfil (Banner)</span>
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 font-bold uppercase">Novo</span>
                    </h4>
                    <p className="text-[10px] text-slate-400">Personalize o topo widescreen do seu perfil</p>
                  </div>
                </div>

                {profileBannerUrl && (
                  <button
                    type="button"
                    onClick={() => setProfileBannerUrl('')}
                    className="p-1 rounded-lg text-slate-400 hover:text-rose-300 hover:bg-rose-500/20 transition-colors text-[10px] font-bold"
                    title="Remover Capa"
                  >
                    Remover
                  </button>
                )}
              </div>

              {/* Preview da Capa */}
              <div className="w-full h-20 rounded-xl overflow-hidden bg-slate-950 border border-slate-800 relative">
                {profileBannerUrl ? (
                  <img src={profileBannerUrl} alt="Preview Capa" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-r from-purple-900/40 via-slate-900 to-indigo-900/40 flex items-center justify-center text-[11px] text-slate-500">
                    Nenhuma capa selecionada (Gradiente padrão)
                  </div>
                )}
              </div>

              {/* Ações de Capa: Upload + URL */}
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="file"
                  id="banner-file-upload"
                  accept="image/*"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      try {
                        const compressedUrl = await compressImageFile(file, { maxWidth: 1200, maxHeight: 400, quality: 0.82 });
                        if (compressedUrl) {
                          setProfileBannerUrl(compressedUrl);
                          sounds.playPop();
                        }
                      } catch (err) {
                        console.error('Erro ao processar capa:', err);
                      }
                    }
                  }}
                  className="hidden"
                />

                <button
                  type="button"
                  onClick={() => document.getElementById('banner-file-upload')?.click()}
                  className="px-3 py-1.5 rounded-xl bg-purple-600/30 text-purple-300 hover:bg-purple-600/50 border border-purple-500/40 text-xs font-bold flex items-center justify-center gap-1.5 shadow transition-all active:scale-95 flex-shrink-0"
                >
                  <Camera className="w-3.5 h-3.5" /> Enviar do Dispositivo
                </button>

                <input
                  type="text"
                  value={profileBannerUrl}
                  onChange={(e) => setProfileBannerUrl(e.target.value)}
                  placeholder="Ou cole o link da imagem da capa..."
                  className="flex-1 px-3 py-1.5 rounded-xl bg-background-dark text-xs border border-slate-700 text-slate-200 focus:border-purple-500 transition-all truncate"
                />
              </div>

              {/* Presets Rápidos de Capas */}
              <div>
                <span className="text-[10px] text-slate-400 block mb-1 font-semibold">Presets Estilosos de Capa:</span>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                  {PRESET_BANNERS.map((preset) => {
                    const isSelected = profileBannerUrl === preset.url;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => {
                          setProfileBannerUrl(preset.url);
                          sounds.playPop();
                        }}
                        className={`h-9 rounded-lg overflow-hidden border transition-all relative ${
                          isSelected ? 'border-amber-400 ring-2 ring-amber-400/50 scale-105' : 'border-slate-700 hover:border-slate-500'
                        }`}
                        title={preset.name}
                      >
                        <img src={preset.url} alt={preset.name} className="w-full h-full object-cover" />
                        <span className="absolute bottom-0 inset-x-0 bg-black/70 text-[8px] text-white font-bold truncate px-0.5 text-center">
                          {preset.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Nome de Exibição</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-background-dark border border-slate-700 text-xs text-white focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Status</label>
                <input
                  type="text"
                  value={statusMessage}
                  onChange={(e) => setStatusMessage(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-background-dark border border-slate-700 text-xs text-white focus:border-brand-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Biografia (Bio)</label>
              <textarea
                rows={2}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-background-dark border border-slate-700 text-xs text-white focus:border-brand-500 resize-none"
              />
            </div>

            {/* SEÇÃO: MÚSICA TEMA DO PERFIL (PROFILE ANTHEM) */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950/40 to-slate-900 border border-brand-500/30 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-brand-500/20 text-brand-300 flex items-center justify-center border border-brand-500/40">
                    <Music className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-extrabold text-white flex items-center gap-1.5">
                      <span>Música Tema do Perfil</span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-brand-500/20 text-brand-300 border border-brand-500/30">Novo</span>
                    </h4>
                    <p className="text-[10px] text-slate-400">Cole o link do YouTube, Spotify ou MP3 para tocar no seu perfil</p>
                  </div>
                </div>

                {songUrl && (
                  <button
                    type="button"
                    onClick={handleClearSong}
                    className="p-1 rounded-lg text-slate-400 hover:text-rose-300 hover:bg-rose-500/20 transition-colors"
                    title="Remover Música"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={songUrl}
                  onChange={(e) => {
                    setSongUrl(e.target.value);
                  }}
                  onBlur={() => {
                    if (songUrl && (!songTitle || !songCover)) {
                      handleFetchMusicData(songUrl);
                    }
                  }}
                  placeholder="https://www.youtube.com/watch?v=... ou Spotify / MP3"
                  className="flex-1 px-3 py-2 rounded-xl bg-background-dark border border-slate-700 text-xs text-white placeholder-slate-500 focus:border-brand-500"
                />

                <button
                  type="button"
                  onClick={() => handleFetchMusicData(songUrl)}
                  disabled={!songUrl || loadingMusicMeta}
                  className="px-3 py-2 rounded-xl bg-brand-600/30 hover:bg-brand-600/50 border border-brand-500/40 text-brand-300 text-xs font-bold transition-all disabled:opacity-40 flex items-center gap-1.5 flex-shrink-0"
                  title="Puxar Capa e Título Automaticamente"
                >
                  {loadingMusicMeta ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5" />
                  )}
                  <span className="hidden sm:inline">Puxar Dados</span>
                </button>
              </div>

              {/* Campos opcionais de personalização do nome/artista */}
              {songUrl && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-slate-800/80">
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-0.5">Título da Música (Opcional):</label>
                    <input
                      type="text"
                      value={songTitle}
                      onChange={(e) => setSongTitle(e.target.value)}
                      placeholder="Ex: Starboy"
                      className="w-full px-2.5 py-1.5 rounded-lg bg-background-dark border border-slate-800 text-[11px] text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-0.5">Nome do Artista (Opcional):</label>
                    <input
                      type="text"
                      value={songArtist}
                      onChange={(e) => setSongArtist(e.target.value)}
                      placeholder="Ex: The Weeknd"
                      className="w-full px-2.5 py-1.5 rounded-lg bg-background-dark border border-slate-800 text-[11px] text-slate-200"
                    />
                  </div>
                </div>
              )}

              {/* Preview do Player de Música */}
              {songUrl && (
                <div className="pt-2">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <span>Pré-visualização do seu Anthem:</span>
                  </div>
                  <ProfileMusicPlayer
                    songUrl={songUrl}
                    songTitle={songTitle}
                    songArtist={songArtist}
                    songCover={songCover}
                  />
                </div>
              )}
            </div>

            {savedSuccess && (
              <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-1.5">
                <Check className="w-4 h-4" /> Perfil atualizado com sucesso!
              </div>
            )}

            <button
              type="submit"
              disabled={saving}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-brand-600 via-indigo-600 to-purple-600 hover:from-brand-500 text-white font-extrabold text-xs shadow-lg transition-all active:scale-98"
            >
              {saving ? 'Salvando...' : 'Salvar Alterações do Perfil'}
            </button>
          </form>
          </div>
        )}

        {/* ABA 2: MEU INVENTÁRIO (Equipar / Desequipar) */}
        {activeTab === 'inventory' && (
          <div className="space-y-3">
            <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center justify-between">
              <span>Seus itens de personalização desbloqueados:</span>
              <span className="font-extrabold">{myInventoryItems.length} itens</span>
            </div>

            {myInventoryItems.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400">
                Você ainda não comprou itens na Loja Nexus. Abra a Loja para desbloquear molduras e temas!
              </div>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {myInventoryItems.map((item) => {
                  const isEquipped =
                    (item.category === 'frames' && user?.equipped_frame === item.id) ||
                    (item.category === 'wallpapers' && user?.equipped_wallpaper === item.id) ||
                    (item.category === 'bubbles' && user?.equipped_bubble === item.id) ||
                    (item.category === 'badges' && user?.equipped_badge === item.id) ||
                    (item.category === 'name_colors' && user?.equipped_name_color === item.id);

                  return (
                    <div
                      key={item.id}
                      className={`p-3 rounded-2xl border flex items-center justify-between transition-all ${
                        isEquipped
                          ? 'bg-amber-950/30 border-amber-500/60 shadow-sm'
                          : 'bg-background-surface/80 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{item.icon}</span>
                        <div>
                          <div className="text-xs font-bold text-white">{item.name}</div>
                          <div className="text-[10px] text-slate-400">{item.description}</div>
                        </div>
                      </div>

                      <div>
                        {isEquipped ? (
                          <button
                            onClick={() => handleEquipFromInventory(item.category, 'default')}
                            className="px-3 py-1 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-bold hover:bg-rose-500/20 hover:text-rose-300 hover:border-rose-500/40 transition-colors"
                          >
                            Equipado ✨ (Desequipar)
                          </button>
                        ) : (
                          <button
                            onClick={() => handleEquipFromInventory(item.category, item.id)}
                            className="px-3 py-1 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold shadow"
                          >
                            Equipar
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ABA 3: PREFERÊNCIAS & LOGOUT */}
        {activeTab === 'preferences' && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-background-surface/60 border border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {soundEnabled ? <Volume2 className="w-5 h-5 text-brand-400" /> : <VolumeX className="w-5 h-5 text-slate-500" />}
                <div>
                  <div className="text-xs font-bold text-white">Efeitos Sonoros do Chat</div>
                  <div className="text-[11px] text-slate-400">Sons de envio, recebimento e ganho de moedas</div>
                </div>
              </div>
              <button
                type="button"
                onClick={toggleSound}
                className={`px-3 py-1 rounded-xl text-xs font-bold border transition-colors ${
                  soundEnabled
                    ? 'bg-brand-600 text-white border-brand-500'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}
              >
                {soundEnabled ? 'Ativado' : 'Mudo'}
              </button>
            </div>

            {/* Notificações Push / Segundo Plano */}
            <div className="p-4 rounded-2xl bg-background-surface/60 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {notifEnabled && notifPermission === 'granted' ? (
                    <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                      <Bell className="w-5 h-5" />
                    </div>
                  ) : (
                    <div className="p-2.5 rounded-xl bg-slate-800 text-slate-400 border border-slate-700">
                      <BellOff className="w-5 h-5" />
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold text-white">Notificações Push / Segundo Plano</h4>
                      <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-extrabold uppercase border ${
                        notifPermission === 'granted'
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          : notifPermission === 'denied'
                          ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                          : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      }`}>
                        {notifPermission === 'granted' ? 'Permitido' : notifPermission === 'denied' ? 'Bloqueado' : 'Pendente'}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Receba avisos de mensagens mesmo com o app em segundo plano ou fechado
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleToggleNotifications}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors flex-shrink-0 ${
                    notifEnabled && notifPermission === 'granted'
                      ? 'bg-emerald-600 text-white border-emerald-500 shadow-emerald-600/30'
                      : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750'
                  }`}
                >
                  {notifEnabled && notifPermission === 'granted' ? 'Ativadas' : 'Ativar'}
                </button>
              </div>

              {/* Botão de Testar Notificação & Feedback */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 gap-2">
                <span className="text-[11px] text-slate-400 truncate">
                  {notifFeedback || (notifPermission === 'granted' ? 'Notificações prontas para uso' : 'Clique em Ativar para autorizar no navegador')}
                </span>
                <button
                  type="button"
                  onClick={handleTestNotification}
                  disabled={testingNotif}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[11px] font-bold transition-all disabled:opacity-50 flex-shrink-0"
                >
                  {testingNotif ? 'Enviando...' : 'Testar Notificação'}
                </button>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-background-surface/60 border border-slate-800 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-white">Sair da Conta</div>
                <div className="text-[11px] text-slate-400">Encerrar sessão ativa neste navegador</div>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="px-3.5 py-1.5 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30 text-xs font-bold flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all"
              >
                <LogOut className="w-3.5 h-3.5" /> Sair
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
