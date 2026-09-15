import React, { useState } from 'react';
import { supabase, isSupabaseConfigured } from '../../lib/supabaseClient';
import { sounds } from '../../lib/sound';
import confetti from 'canvas-confetti';
import {
  FileText,
  X,
  Plus,
  Pin,
  Send,
  Sparkles,
  Tag,
  AlertCircle
} from 'lucide-react';

const TAG_OPTIONS = [
  { tag: 'NOVIDADE', label: 'Novidade', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' },
  { tag: 'ATUALIZAÇÃO', label: 'Atualização', color: 'bg-amber-500/20 text-amber-300 border-amber-500/40' },
  { tag: 'PATCH', label: 'Patch / Correção', color: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' },
  { tag: 'EVENTO', label: 'Evento', color: 'bg-purple-500/20 text-purple-300 border-purple-500/40' },
  { tag: 'AVISO', label: 'Aviso Oficial', color: 'bg-rose-500/20 text-rose-300 border-rose-500/40' }
];

export function CreatePatchNoteModal({ isOpen, onClose, onPatchCreated, currentUser }) {
  const [tag, setTag] = useState('NOVIDADE');
  const [title, setTitle] = useState('');
  const [version, setVersion] = useState('');
  const [content, setContent] = useState('');
  const [isPinned, setIsPinned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!title.trim()) {
      setErrorMsg('Informe o título da nota de atualização.');
      return;
    }
    if (!content.trim()) {
      setErrorMsg('Informe o conteúdo da publicação.');
      return;
    }

    try {
      setLoading(true);

      if (isSupabaseConfigured && supabase) {
        // Se a nova nota for fixada, podemos opcionalmente desafixar outras
        const { data, error } = await supabase
          .from('patch_notes')
          .insert({
            title: title.trim(),
            tag,
            version: version.trim() || null,
            content: content.trim(),
            author_name: currentUser?.display_name || currentUser?.username || 'Damon',
            is_pinned: isPinned,
            created_at: new Date().toISOString()
          })
          .select()
          .single();

        if (error) throw error;

        sounds.playPop?.();
        confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
        if (onPatchCreated) onPatchCreated(data);
      }

      onClose();
    } catch (err) {
      console.error('Erro ao criar nota de atualização:', err);
      setErrorMsg(err.message || 'Erro ao publicar nota.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center safe-modal-overlay bg-black/80 backdrop-blur-md animate-fadeIn select-none p-3.5 sm:p-4">
      <div className="w-full max-w-lg rounded-2xl sm:rounded-3xl bg-gradient-to-b from-slate-900 via-background-darker to-slate-950 border border-amber-500/40 shadow-2xl p-4 sm:p-6 relative overflow-hidden flex flex-col max-h-[90vh]">
        {/* Topbar */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-extrabold text-white">Nova Notícia / Atualização</h2>
              <p className="text-[11px] text-slate-400">Publicação oficial direta no Feed do Hub</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Formulário com Scroll */}
        <form onSubmit={handleSubmit} className="overflow-y-auto py-3 space-y-3.5 flex-1 pr-1">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Seleção de Categoria / Tag */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-amber-400" />
              <span>Categoria / Tag</span>
            </label>
            <div className="flex flex-wrap gap-1.5">
              {TAG_OPTIONS.map((opt) => (
                <button
                  key={opt.tag}
                  type="button"
                  onClick={() => setTag(opt.tag)}
                  className={`px-2.5 py-1 rounded-xl text-xs font-extrabold border transition-all ${
                    tag === opt.tag
                      ? `${opt.color} ring-2 ring-white/20 scale-102 shadow-md`
                      : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Título & Versão */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div className="sm:col-span-2 space-y-1">
              <label className="text-xs font-bold text-slate-300">Título da Notícia</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: 🎰 Grande Inauguração do Cassino Nexus!"
                className="w-full px-3 py-2 rounded-xl bg-slate-950/80 border border-slate-700/80 focus:border-amber-400 text-white text-xs font-medium placeholder-slate-500 focus:outline-none transition-colors"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-300">Versão (Opcional)</label>
              <input
                type="text"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                placeholder="Ex: v3.2.0"
                className="w-full px-3 py-2 rounded-xl bg-slate-950/80 border border-slate-700/80 focus:border-amber-400 text-white text-xs font-medium placeholder-slate-500 focus:outline-none transition-colors"
              />
            </div>
          </div>

          {/* Opção de Destaque / Pin */}
          <label className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-950/50 border border-slate-800 cursor-pointer hover:border-slate-700 transition-colors">
            <input
              type="checkbox"
              checked={isPinned}
              onChange={(e) => setIsPinned(e.target.checked)}
              className="w-4 h-4 rounded text-amber-500 bg-slate-900 border-slate-700 focus:ring-amber-500 focus:ring-offset-0"
            />
            <div className="flex items-center gap-1.5 text-xs text-slate-300 font-bold">
              <Pin className="w-3.5 h-3.5 text-amber-400" />
              <span>Fixar no topo (Destaque principal do Hub)</span>
            </div>
          </label>

          {/* Conteúdo em Markdown */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
              <span>Conteúdo (Suporta Markdown)</span>
              <span className="text-[10px] text-slate-500 font-normal">Use tópicos (-), **negrito**, etc.</span>
            </label>
            <textarea
              rows={6}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Descreva as novidades, melhorias ou comunicados..."
              className="w-full px-3 py-2 rounded-xl bg-slate-950/80 border border-slate-700/80 focus:border-amber-400 text-white text-xs font-normal placeholder-slate-500 focus:outline-none transition-colors resize-none leading-relaxed"
            />
          </div>

          {/* Botões de Ação */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 hover:from-amber-400 text-black font-extrabold text-xs shadow-lg shadow-amber-500/25 flex items-center gap-1.5 active:scale-95 transition-all"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Publicar Notícia</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
