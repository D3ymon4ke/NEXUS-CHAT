import React, { useState, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase, isSupabaseConfigured } from '../../lib/supabaseClient';
import { sounds } from '../../lib/sound';
import confetti from 'canvas-confetti';
import {
  X,
  Image as ImageIcon,
  Send,
  Globe,
  Users,
  Lock,
  Loader2,
  Sparkles,
  Camera
} from 'lucide-react';

export function CreateStoryModal({ isOpen, onClose, onStoryCreated }) {
  const { user } = useAuth();
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaType, setMediaType] = useState('image'); // 'image' | 'video'
  const [caption, setCaption] = useState('');
  const [privacy, setPrivacy] = useState('global'); // 'global' | 'friends' | 'custom'
  const [uploading, setUploading] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = ev.target?.result;
      if (base64) {
        setMediaUrl(base64);
        setMediaType(file.type.startsWith('video/') ? 'video' : 'image');
      }
      setUploading(false);
    };
    reader.onerror = () => setUploading(false);
    reader.readAsDataURL(file);
  };

  const handlePublishStory = async (e) => {
    e.preventDefault();
    if (!mediaUrl || !user) return;

    try {
      setPublishing(true);

      if (isSupabaseConfigured && supabase) {
        await supabase.from('nexus_stories').insert({
          user_id: user.id,
          media_url: mediaUrl,
          media_type: mediaType,
          caption: caption.trim() || null,
          privacy
        });
      }

      sounds.playPop();
      confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
      onClose();
      if (onStoryCreated) onStoryCreated();
    } catch (err) {
      console.error('Erro ao publicar story:', err);
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn select-none">
      <div className="glass-modal w-full max-w-md rounded-3xl p-6 shadow-2xl border border-rose-500/40 flex flex-col relative overflow-hidden">
        {/* Glow Decorativo */}
        <div className="absolute -top-20 -right-20 w-48 h-48 bg-rose-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-48 h-48 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Topbar */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 flex items-center justify-center text-white shadow">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white">Criar Nexus Story</h2>
              <p className="text-[11px] text-slate-400">Desaparece automaticamente em 24 horas</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-background-surface transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handlePublishStory} className="mt-4 space-y-4">
          {/* Seletor / Preview de Imagem */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept="image/*,video/*"
            className="hidden"
          />

          {!mediaUrl ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="w-full h-56 rounded-2xl border-2 border-dashed border-slate-700 hover:border-brand-500 bg-slate-900/60 hover:bg-slate-900 flex flex-col items-center justify-center gap-2.5 cursor-pointer transition-all group"
            >
              <div className="w-12 h-12 rounded-2xl bg-brand-500/15 border border-brand-500/30 text-brand-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <ImageIcon className="w-6 h-6" />
              </div>
              <div className="text-center">
                <span className="text-xs font-bold text-slate-200 block">Clique para escolher foto ou vídeo</span>
                <span className="text-[10px] text-slate-400">JPG, PNG, GIF, WebP ou MP4</span>
              </div>
            </div>
          ) : (
            <div className="relative w-full h-64 rounded-2xl overflow-hidden border border-slate-700 shadow-xl group">
              {mediaType === 'video' ? (
                <video src={mediaUrl} controls className="w-full h-full object-cover" />
              ) : (
                <img src={mediaUrl} alt="Preview" className="w-full h-full object-cover" />
              )}
              <button
                type="button"
                onClick={() => setMediaUrl('')}
                className="absolute top-2 right-2 p-1.5 rounded-xl bg-black/60 text-white hover:bg-rose-600 transition-colors shadow"
                title="Trocar mídia"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Legenda do Story */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-300 mb-1">Legenda / Frase (Opcional)</label>
            <input
              type="text"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Digite algo sobre o seu story..."
              maxLength={120}
              className="w-full px-3.5 py-2 rounded-xl bg-background-dark border border-slate-700 text-xs text-white placeholder-slate-500 focus:border-brand-500 focus:outline-none"
            />
          </div>

          {/* Seletor de Privacidade */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-300 mb-1">Quem pode ver este Story?</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'global', label: 'Global (Todos)', icon: Globe },
                { id: 'friends', label: 'Amigos', icon: Users },
                { id: 'custom', label: 'Privado', icon: Lock }
              ].map((opt) => {
                const Icon = opt.icon;
                const isSelected = privacy === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setPrivacy(opt.id)}
                    className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all flex flex-col items-center gap-1 ${
                      isSelected
                        ? 'bg-gradient-to-br from-amber-500/20 to-rose-500/20 text-amber-300 border-amber-500/60 shadow-md'
                        : 'bg-background-surface/80 text-slate-400 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span className="text-[10px]">{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Botão Publicar */}
          <button
            type="submit"
            disabled={!mediaUrl || publishing}
            className={`w-full py-3 rounded-2xl font-extrabold text-xs shadow-xl transition-all flex items-center justify-center gap-2 ${
              mediaUrl && !publishing
                ? 'bg-gradient-to-r from-amber-500 via-rose-500 to-purple-600 hover:from-amber-400 hover:to-rose-400 text-white shadow-rose-500/25 hover:scale-[1.01]'
                : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
            }`}
          >
            {publishing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Publicando Story...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" /> Publicar no Nexus Stories
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
