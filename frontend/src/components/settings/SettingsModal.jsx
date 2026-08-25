import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useChat } from '../../context/ChatContext';
import { sounds } from '../../lib/sound';
import { Settings, X, Volume2, VolumeX, User, Sparkles, RefreshCw, LogOut, Check, ShieldCheck, Database } from 'lucide-react';

export function SettingsModal({ isOpen, onClose }) {
  const { user, updateProfile, logout, demoUsers, switchDemoUser, isConfigured } = useAuth();
  const { soundEnabled, toggleSound } = useChat();

  const [displayName, setDisplayName] = useState(user?.display_name || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [statusMessage, setStatusMessage] = useState(user?.status_message || 'online');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || '');
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSavedSuccess(false);
    try {
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

  const generateNewAvatar = () => {
    const seed = Math.random().toString(36).substring(7);
    setAvatarUrl(`https://api.dicebear.com/7.x/bottts/svg?seed=${seed}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fadeIn">
      <div className="glass-modal w-full max-w-lg rounded-2xl p-6 shadow-2xl border border-slate-700/60 flex flex-col max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-brand-500/20 text-brand-400 flex items-center justify-center border border-brand-500/30">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Configurações & Perfil</h3>
              <p className="text-xs text-slate-400">Personalize sua experiência no chat</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-background-surface transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Perfil & Avatar */}
        <form onSubmit={handleSaveProfile} className="mt-5 space-y-4">
          <div className="flex items-center gap-4 p-4 rounded-xl bg-background-surface/60 border border-slate-700/50">
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
                className="absolute -bottom-1 -right-1 p-1 bg-brand-600 hover:bg-brand-500 text-white rounded-lg shadow transition-transform group-hover:scale-110"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-xs text-slate-400 block mb-1">URL do Avatar</span>
              <input
                type="text"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="https://..."
                className="w-full px-3 py-1.5 rounded-lg bg-background-dark text-xs border border-slate-700 text-slate-200 focus:border-brand-500 transition-all truncate"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Nome de Exibição</label>
              <input
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-background-surface border border-slate-700 text-slate-100 text-xs focus:border-brand-500 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Status Personalizado</label>
              <input
                type="text"
                value={statusMessage}
                onChange={(e) => setStatusMessage(e.target.value)}
                placeholder="Ex: Focado, em reunião, etc"
                className="w-full px-3.5 py-2 rounded-xl bg-background-surface border border-slate-700 text-slate-100 text-xs focus:border-brand-500 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Bio / Recado</label>
            <input
              type="text"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Fale um pouco sobre você"
              className="w-full px-3.5 py-2 rounded-xl bg-background-surface border border-slate-700 text-slate-100 text-xs focus:border-brand-500 transition-all"
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            {savedSuccess ? (
              <span className="text-xs text-green-400 flex items-center gap-1">
                <Check className="w-4 h-4" /> Perfil atualizado!
              </span>
            ) : <span />}

            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-brand-600 hover:bg-brand-500 text-white shadow-md transition-all disabled:opacity-50"
            >
              {saving ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          </div>
        </form>

        {/* Preferências & Notificações */}
        <div className="mt-6 pt-5 border-t border-slate-800 space-y-3">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Preferências de Áudio & Sistema</h4>

          <div className="flex items-center justify-between p-3 rounded-xl bg-background-surface/50 border border-slate-800">
            <div className="flex items-center gap-3">
              {soundEnabled ? (
                <Volume2 className="w-5 h-5 text-brand-400" />
              ) : (
                <VolumeX className="w-5 h-5 text-slate-500" />
              )}
              <div>
                <p className="text-xs font-semibold text-slate-200">Sons de Mensagens</p>
                <p className="text-[11px] text-slate-400">Efeitos sonoros para envio e recebimento</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => sounds.playReceive()}
                className="px-2.5 py-1 text-[11px] font-medium rounded-lg bg-background-card hover:bg-background-hover text-slate-300 border border-slate-700"
              >
                Testar Som
              </button>
              <button
                type="button"
                onClick={toggleSound}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  soundEnabled ? 'bg-brand-600' : 'bg-slate-700'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    soundEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Alternador Rápido de Contas Demo */}
        <div className="mt-6 pt-5 border-t border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" /> Alternar Usuário de Demonstração
            </h4>
            <span className="text-[10px] text-slate-500">Teste em abas</span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {demoUsers.map((d) => (
              <button
                key={d.id}
                onClick={() => {
                  switchDemoUser(d.id);
                  onClose();
                }}
                className={`p-2 rounded-xl text-center border transition-all ${
                  user?.id === d.id
                    ? 'bg-brand-600/30 border-brand-500 text-white shadow-sm'
                    : 'bg-background-surface/60 border-slate-800 hover:border-slate-600 text-slate-300'
                }`}
              >
                <img
                  src={d.avatar_url}
                  alt={d.display_name}
                  className="w-8 h-8 rounded-full mx-auto mb-1 object-cover border border-slate-700"
                />
                <span className="text-[11px] font-medium block truncate">{d.display_name.split(' ')[0]}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Footer com Status do Banco e Logout */}
        <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Database className="w-3.5 h-3.5 text-emerald-400" />
            <span>{isConfigured ? 'Supabase Conectado' : 'Modo Demonstração Ativo'}</span>
          </div>

          <button
            onClick={() => {
              logout();
              onClose();
            }}
            className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 px-3 py-1.5 rounded-lg transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" /> Sair
          </button>
        </div>
      </div>
    </div>
  );
}
