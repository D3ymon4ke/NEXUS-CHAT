import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useChat } from '../../context/ChatContext';
import { supabase, isSupabaseConfigured } from '../../lib/supabaseClient';
import { SHOP_CATALOG } from '../../lib/shopCatalog';
import { sounds } from '../../lib/sound';
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
  Palette
} from 'lucide-react';

export function SettingsModal({ isOpen, onClose }) {
  const { user, updateProfile, logout, isConfigured } = useAuth();
  const { soundEnabled, toggleSound } = useChat();

  const [activeTab, setActiveTab] = useState('profile'); // 'profile' | 'inventory' | 'preferences'
  const [displayName, setDisplayName] = useState(user?.display_name || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [statusMessage, setStatusMessage] = useState(user?.status_message || 'online');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || '');
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const unlockedItems = user?.unlocked_items || ['frame_default', 'bubble_default'];
  const myInventoryItems = SHOP_CATALOG.filter(i => unlockedItems.includes(i.id));

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSavedSuccess(false);
    try {
      if (isSupabaseConfigured && supabase && user) {
        await supabase
          .from('profiles')
          .update({
            display_name: displayName,
            bio,
            status_message: statusMessage,
            avatar_url: avatarUrl
          })
          .eq('id', user.id);
      }

      await updateProfile({
        display_name: displayName,
        bio,
        status_message: statusMessage,
        avatar_url: avatarUrl
      });
      setSavedSuccess(true);
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
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="flex items-center gap-4 p-4 rounded-2xl bg-background-surface/60 border border-slate-700/50">
              <div className="relative group">
                <img
                  src={avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${user?.id}`}
                  alt="Avatar"
                  className="w-16 h-16 rounded-2xl object-cover border-2 border-brand-500 shadow-md"
                />
                <button
                  type="button"
                  onClick={generateNewAvatar}
                  title="Gerar novo avatar aleatório"
                  className="absolute -bottom-1 -right-1 p-1.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl shadow transition-transform group-hover:scale-110"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-xs text-slate-400 block mb-1 font-semibold">URL do Avatar</span>
                <input
                  type="text"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3 py-1.5 rounded-xl bg-background-dark text-xs border border-slate-700 text-slate-200 focus:border-brand-500 transition-all truncate"
                />
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

            {savedSuccess && (
              <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-1.5">
                <Check className="w-4 h-4" /> Perfil atualizado com sucesso!
              </div>
            )}

            <button
              type="submit"
              disabled={saving}
              className="w-full py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-extrabold text-xs shadow-lg transition-all"
            >
              {saving ? 'Salvando...' : 'Salvar Alterações do Perfil'}
            </button>
          </form>
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

            <div className="p-4 rounded-2xl bg-background-surface/60 border border-slate-800 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-white">Sair da Conta</div>
                <div className="text-[11px] text-slate-400">Encerrar sessão ativa neste navegador</div>
              </div>
              <button
                type="button"
                onClick={logout}
                className="px-3.5 py-1.5 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30 text-xs font-bold flex items-center gap-1.5"
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
