import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useChat } from '../../context/ChatContext';
import { supabase, isSupabaseConfigured } from '../../lib/supabaseClient';
import { sounds } from '../../lib/sound';
import confetti from 'canvas-confetti';
import {
  BarChart3,
  Plus,
  Trash2,
  Clock,
  CheckSquare,
  X,
  Sparkles,
  HelpCircle
} from 'lucide-react';

const DURATION_OPTIONS = [
  { label: '5 minutos', value: 5 * 60 * 1000 },
  { label: '15 minutos', value: 15 * 60 * 1000 },
  { label: '1 hora', value: 60 * 60 * 1000 },
  { label: '6 horas', value: 6 * 60 * 60 * 1000 },
  { label: '24 horas (1 dia)', value: 24 * 60 * 60 * 1000 },
  { label: '3 dias', value: 3 * 24 * 60 * 60 * 1000 },
  { label: 'Sem limite (Permanente)', value: null }
];

export function CreatePollModal({ isOpen, onClose }) {
  const { user } = useAuth();
  const { activeConversation, activeConversationId, sendMessage } = useChat();

  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [durationIndex, setDurationIndex] = useState(4); // Default 24h
  const [allowMultiple, setAllowMultiple] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Verificação de Administrador do Grupo
  const BELMONT_ID = '00000000-0000-0000-0000-000000000001';
  const isBelmont = activeConversation?.id === BELMONT_ID || activeConversation?.name === 'BELMONT CONFERENCE' || activeConversation?.is_permanent;
  const isGroup = activeConversation?.type === 'group' || isBelmont;
  const isAdminUser = Boolean(user?.is_admin || user?.role === 'admin' || user?.username === 'damon');
  const isGroupAdmin = Boolean(isGroup && (isAdminUser || activeConversation?.created_by === user?.id));

  if (!isOpen) return null;

  const handleAddOption = () => {
    if (options.length < 8) {
      setOptions([...options, '']);
      sounds.playPop();
    }
  };

  const handleRemoveOption = (index) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
      sounds.playPop();
    }
  };

  const handleOptionChange = (index, value) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cleanQuestion = question.trim();
    const cleanOptions = options.map((opt, idx) => ({
      id: idx + 1,
      text: opt.trim()
    })).filter(opt => opt.text.length > 0);

    if (!cleanQuestion || cleanOptions.length < 2) {
      alert('Por favor, preencha a pergunta e pelo menos 2 opções de resposta.');
      return;
    }

    if (!activeConversationId) {
      alert('Selecione uma conversa para criar a enquete.');
      return;
    }

    if (!isGroupAdmin) {
      alert('Apenas administradores de grupo podem criar e lançar enquetes.');
      return;
    }

    try {
      setSubmitting(true);
      const selectedDuration = DURATION_OPTIONS[durationIndex].value;
      const expiresAt = selectedDuration ? new Date(Date.now() + selectedDuration).toISOString() : null;

      const pollData = {
        question: cleanQuestion,
        options: cleanOptions,
        expires_at: expiresAt,
        allow_multiple: allowMultiple,
        creator: {
          id: user.id,
          display_name: user.display_name || user.username,
          avatar_url: user.avatar_url,
          username: user.username
        }
      };

      if (isSupabaseConfigured && supabase) {
        // 1. Criar na tabela nexus_polls
        const { data: createdPoll, error: pollErr } = await supabase
          .from('nexus_polls')
          .insert({
            conversation_id: activeConversationId,
            creator_id: user.id,
            question: cleanQuestion,
            options: cleanOptions,
            expires_at: expiresAt,
            allow_multiple: allowMultiple
          })
          .select()
          .single();

        if (createdPoll) {
          pollData.id = createdPoll.id;
        }
      }

      // 2. Enviar mensagem de tipo poll
      await sendMessage({
        content: JSON.stringify(pollData),
        type: 'poll'
      });

      sounds.playPop();
      confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });

      // Reset
      setQuestion('');
      setOptions(['', '']);
      setDurationIndex(4);
      setAllowMultiple(false);
      onClose();
    } catch (err) {
      console.error('Erro ao criar enquete:', err);
      alert('Erro ao criar enquete. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-xl animate-fadeIn select-none">
      <div className="w-full max-w-lg rounded-3xl p-6 shadow-2xl border border-brand-500/40 bg-gradient-to-b from-slate-900/95 via-background-darker/95 to-slate-950/95 flex flex-col max-h-[92vh] overflow-hidden relative backdrop-blur-2xl">
        {/* Glow Decorativo */}
        <div className="absolute -top-24 -right-24 w-60 h-60 bg-brand-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-60 h-60 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Topbar */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-brand-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-brand-500/25">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-white">Criar Nova Enquete</h3>
                <span className="text-[9px] px-2 py-0.2 rounded-full bg-brand-500/20 text-brand-300 border border-brand-500/40 font-extrabold uppercase">
                  /enquete
                </span>
              </div>
              <p className="text-[11px] text-slate-400">Lance votações com contagem de votos e tempo limite</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
          {/* Pergunta */}
          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1.5 flex items-center gap-1.5">
              <span>Pergunta da Enquete</span>
              <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ex: Qual o próximo torneio da Belmont Conference?"
              className="w-full px-3.5 py-2.5 rounded-2xl bg-background-dark border border-slate-700 text-xs text-white placeholder-slate-500 focus:border-brand-500 focus:outline-none"
            />
          </div>

          {/* Opções de Resposta */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-300 block flex items-center justify-between">
              <span>Opções de Voto ({options.length}/8)</span>
              <span className="text-[10px] text-slate-500 font-medium">Mínimo 2 opções</span>
            </label>

            {options.map((opt, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-slate-500 w-5 text-right">{idx + 1}.</span>
                <input
                  type="text"
                  required
                  value={opt}
                  onChange={(e) => handleOptionChange(idx, e.target.value)}
                  placeholder={`Opção ${idx + 1}...`}
                  className="flex-1 px-3.5 py-2 rounded-xl bg-background-dark border border-slate-700 text-xs text-white placeholder-slate-500 focus:border-brand-500 focus:outline-none"
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

            {options.length < 8 && (
              <button
                type="button"
                onClick={handleAddOption}
                className="mt-1.5 w-full py-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700 text-brand-300 hover:text-brand-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
              >
                <Plus className="w-4 h-4" /> Adicionar Outra Opção
              </button>
            )}
          </div>

          {/* Duração da Enquete */}
          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1.5 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>Tempo Limite para Votação</span>
            </label>
            <select
              value={durationIndex}
              onChange={(e) => setDurationIndex(Number(e.target.value))}
              className="w-full px-3.5 py-2.5 rounded-2xl bg-background-dark border border-slate-700 text-xs text-white focus:border-brand-500 focus:outline-none font-medium"
            >
              {DURATION_OPTIONS.map((d, i) => (
                <option key={i} value={i}>{d.label}</option>
              ))}
            </select>
          </div>

          {/* Múltipla Escolha */}
          <div className="pt-2">
            <label className="flex items-center gap-2.5 p-3 rounded-2xl bg-slate-900/80 border border-slate-800 cursor-pointer hover:border-slate-700 transition-colors">
              <input
                type="checkbox"
                checked={allowMultiple}
                onChange={(e) => setAllowMultiple(e.target.checked)}
                className="w-4 h-4 rounded border-slate-700 bg-background-dark text-brand-500 focus:ring-0 cursor-pointer"
              />
              <div className="text-xs">
                <span className="font-bold text-white block">Permitir seleção de múltiplas opções</span>
                <span className="text-[10px] text-slate-400">Usuários poderão votar em mais de uma alternativa</span>
              </div>
            </label>
          </div>

          {/* Botão de Envio */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 rounded-2xl bg-gradient-to-r from-brand-600 via-indigo-600 to-brand-700 hover:from-brand-500 text-white font-extrabold text-xs shadow-xl shadow-brand-500/25 transition-all flex items-center justify-center gap-2 hover:scale-[1.01]"
          >
            <BarChart3 className="w-4 h-4" />
            <span>{submitting ? 'Publicando Enquete...' : 'Lançar Enquete na Conversa'}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
