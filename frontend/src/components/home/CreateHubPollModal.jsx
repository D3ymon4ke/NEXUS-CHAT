import React, { useState } from 'react';
import { supabase, isSupabaseConfigured } from '../../lib/supabaseClient';
import { sounds } from '../../lib/sound';
import confetti from 'canvas-confetti';
import {
  Vote,
  X,
  Plus,
  Trash2,
  Send,
  Sparkles,
  Calendar,
  Layers
} from 'lucide-react';

export function CreateHubPollModal({ isOpen, onClose, onPollCreated, currentUser }) {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState([
    { id: 0, text: '' },
    { id: 1, text: '' }
  ]);
  const [allowMultiple, setAllowMultiple] = useState(false);
  const [durationDays, setDurationDays] = useState('7');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleAddOption = () => {
    if (options.length >= 6) return;
    setOptions((prev) => [...prev, { id: prev.length, text: '' }]);
  };

  const handleRemoveOption = (indexToRemove) => {
    if (options.length <= 2) return;
    setOptions((prev) => prev.filter((_, idx) => idx !== indexToRemove).map((opt, idx) => ({ ...opt, id: idx })));
  };

  const handleOptionChange = (idx, value) => {
    setOptions((prev) => {
      const copy = [...prev];
      copy[idx].text = value;
      return copy;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    const trimmedQuestion = question.trim();
    if (!trimmedQuestion) {
      setErrorMsg('Por favor, digite a pergunta da enquete.');
      return;
    }

    const validOptions = options.map((o) => ({ ...o, text: o.text.trim() })).filter((o) => o.text.length > 0);
    if (validOptions.length < 2) {
      setErrorMsg('A enquete precisa de pelo menos 2 opções válidas.');
      return;
    }

    try {
      setLoading(true);

      let expiresAt = null;
      if (durationDays !== 'never') {
        const days = parseInt(durationDays, 10) || 7;
        const d = new Date();
        d.setDate(d.getDate() + days);
        expiresAt = d.toISOString();
      }

      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase
          .from('nexus_polls')
          .insert({
            question: trimmedQuestion,
            options: validOptions,
            is_hub_poll: true,
            allow_multiple: allowMultiple,
            expires_at: expiresAt,
            creator_id: currentUser?.id || null
          })
          .select()
          .single();

        if (error) throw error;

        sounds.playPop();
        confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
        if (onPollCreated) onPollCreated(data);
      }

      onClose();
    } catch (err) {
      console.error('Erro ao criar enquete no Hub:', err);
      setErrorMsg('Erro ao salvar enquete.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-xl animate-fadeIn select-none overflow-hidden box-border">
      <div className="w-full max-w-lg rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-amber-500/40 bg-gradient-to-b from-slate-900/95 via-background-darker/95 to-slate-950/95 shadow-2xl flex flex-col max-h-[92vh] overflow-y-auto relative min-w-0 box-border">
        {/* Topbar */}
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-800 flex-shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-amber-500/20 text-amber-300 flex items-center justify-center border border-amber-500/40 flex-shrink-0">
              <Vote className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-extrabold text-white truncate">
                CRIAR ENQUETE DA COMUNIDADE
              </h2>
              <p className="text-[10px] sm:text-xs text-slate-400 truncate">
                Publique uma votação oficial diretamente no HUB Principal
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="my-2 p-2.5 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-semibold">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5 mt-3">
          {/* Pergunta */}
          <div>
            <label className="block text-xs font-extrabold text-slate-300 mb-1">
              Pergunta da Enquete
            </label>
            <input
              type="text"
              required
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ex: Qual novo recurso você prefere para a próxima atualização?"
              className="w-full px-3.5 py-2 sm:py-2.5 rounded-xl bg-background-dark border border-slate-700 text-xs sm:text-sm text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none"
            />
          </div>

          {/* Opções de Resposta */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-extrabold text-slate-300">
                Opções de Resposta ({options.length}/6)
              </label>
              {options.length < 6 && (
                <button
                  type="button"
                  onClick={handleAddOption}
                  className="text-[11px] text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Adicionar Opção
                </button>
              )}
            </div>

            <div className="space-y-2">
              {options.map((opt, idx) => (
                <div key={opt.id} className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-500 w-4 text-center">
                    {idx + 1}.
                  </span>
                  <input
                    type="text"
                    required
                    value={opt.text}
                    onChange={(e) => handleOptionChange(idx, e.target.value)}
                    placeholder={`Opção ${idx + 1}...`}
                    className="flex-1 px-3 py-2 rounded-xl bg-background-dark border border-slate-700 text-xs text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none"
                  />
                  {options.length > 2 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveOption(idx)}
                      className="p-2 rounded-xl text-rose-400 hover:bg-rose-500/20 transition-colors"
                      title="Remover opção"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Configurações Adicionais */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-800">
            <div>
              <label className="block text-[11px] font-bold text-slate-400 mb-1">
                Duração da Enquete
              </label>
              <select
                value={durationDays}
                onChange={(e) => setDurationDays(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-background-dark border border-slate-700 text-xs text-white focus:border-amber-500 font-semibold"
              >
                <option value="1">1 Dia</option>
                <option value="3">3 Dias</option>
                <option value="7">7 Dias (1 Semana)</option>
                <option value="15">15 Dias</option>
                <option value="30">30 Dias (1 Mês)</option>
                <option value="never">Sem Limite de Tempo</option>
              </select>
            </div>

            <div className="flex items-center">
              <label className="flex items-center gap-2 text-xs text-slate-300 font-semibold cursor-pointer pt-3 sm:pt-4">
                <input
                  type="checkbox"
                  checked={allowMultiple}
                  onChange={(e) => setAllowMultiple(e.target.checked)}
                  className="rounded border-slate-700 bg-background-dark text-amber-500 focus:ring-0"
                />
                <span>Permitir Múltipla Escolha</span>
              </label>
            </div>
          </div>

          {/* Botão de Envio */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 sm:py-3 rounded-xl sm:rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 hover:from-amber-400 text-black font-extrabold text-xs shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2 active:scale-95 mt-4"
          >
            <Send className="w-4 h-4" />
            <span>{loading ? 'Publicando...' : 'Publicar Enquete no HUB'}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
