import React, { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../../lib/supabaseClient';
import { sounds } from '../../lib/sound';
import confetti from 'canvas-confetti';
import {
  Vote,
  CheckCircle,
  Clock,
  Trash2,
  Lock,
  Sparkles,
  Users,
  Flame
} from 'lucide-react';

export function HubPollCard({
  poll,
  currentUser,
  isAdmin,
  onPollDeleted,
  onPollClosed
}) {
  const [votes, setVotes] = useState([]);
  const [loadingVote, setLoadingVote] = useState(false);
  const [isClosed, setIsClosed] = useState(poll?.is_closed || false);

  const pollOptions = Array.isArray(poll?.options) ? poll.options : [];

  useEffect(() => {
    loadVotes();
  }, [poll?.id]);

  const loadVotes = async () => {
    if (!isSupabaseConfigured || !supabase || !poll?.id) return;
    try {
      const { data } = await supabase
        .from('poll_votes')
        .select('*')
        .eq('poll_id', poll.id);

      if (data) {
        setVotes(data);
      }
    } catch (err) {
      console.warn('Erro ao carregar votos da enquete:', err);
    }
  };

  const totalVotes = votes.length;
  const userVotes = votes.filter((v) => v.user_id === currentUser?.id).map((v) => v.option_id);
  const hasVoted = userVotes.length > 0;

  const handleVote = async (optionId) => {
    if (!currentUser || isClosed || loadingVote) return;

    try {
      setLoadingVote(true);
      const alreadyVotedThisOption = userVotes.includes(optionId);

      if (alreadyVotedThisOption) {
        // Remover voto
        if (isSupabaseConfigured && supabase) {
          await supabase
            .from('poll_votes')
            .delete()
            .eq('poll_id', poll.id)
            .eq('user_id', currentUser.id)
            .eq('option_id', optionId);
        }
        setVotes((prev) => prev.filter((v) => !(v.user_id === currentUser.id && v.option_id === optionId)));
        sounds.playPop();
      } else {
        // Se não permitir votos múltiplos, remove os anteriores
        if (!poll.allow_multiple && userVotes.length > 0) {
          if (isSupabaseConfigured && supabase) {
            await supabase
              .from('poll_votes')
              .delete()
              .eq('poll_id', poll.id)
              .eq('user_id', currentUser.id);
          }
        }

        // Inserir novo voto
        if (isSupabaseConfigured && supabase) {
          await supabase
            .from('poll_votes')
            .insert({
              poll_id: poll.id,
              user_id: currentUser.id,
              option_id: optionId
            });
        }

        const newVoteObj = { poll_id: poll.id, user_id: currentUser.id, option_id: optionId };
        setVotes((prev) => {
          const filtered = poll.allow_multiple ? prev : prev.filter((v) => v.user_id !== currentUser.id);
          return [...filtered, newVoteObj];
        });

        sounds.playPop();
        confetti({ particleCount: 35, spread: 50, origin: { y: 0.7 } });
      }
    } catch (err) {
      console.error('Erro ao registrar voto:', err);
    } finally {
      setLoadingVote(false);
    }
  };

  const handleToggleClose = async () => {
    if (!isAdmin || !isSupabaseConfigured || !supabase) return;
    try {
      const nextState = !isClosed;
      await supabase
        .from('nexus_polls')
        .update({ is_closed: nextState })
        .eq('id', poll.id);

      setIsClosed(nextState);
      sounds.playPop();
      if (onPollClosed) onPollClosed(poll.id, nextState);
    } catch (err) {
      console.error('Erro ao encerrar enquete:', err);
    }
  };

  const handleDelete = async () => {
    if (!isAdmin || !isSupabaseConfigured || !supabase) return;
    if (!confirm('Deseja realmente excluir esta enquete do Hub?')) return;
    try {
      await supabase
        .from('nexus_polls')
        .delete()
        .eq('id', poll.id);

      sounds.playPop();
      if (onPollDeleted) onPollDeleted(poll.id);
    } catch (err) {
      console.error('Erro ao excluir enquete:', err);
    }
  };

  return (
    <div className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-slate-900/95 via-slate-900/85 to-indigo-950/40 border border-slate-700/80 shadow-xl relative overflow-hidden transition-all hover:border-slate-600/80 min-w-0 box-border">
      {/* Topbar da Enquete */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center border border-amber-500/40 flex-shrink-0">
            <Vote className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[9px] px-2 py-0.2 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-extrabold uppercase">
                {isClosed ? 'Encerrada' : 'Enquete Oficial'}
              </span>
              {poll.allow_multiple && (
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 font-bold">
                  Múltipla Escolha
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Ações do Admin */}
        {isAdmin && (
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={handleToggleClose}
              className={`p-1.5 rounded-lg text-xs font-bold border transition-colors ${
                isClosed
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                  : 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
              }`}
              title={isClosed ? 'Reabrir Enquete' : 'Encerrar Votação'}
            >
              <Lock className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleDelete}
              className="p-1.5 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30 transition-colors"
              title="Excluir Enquete"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Pergunta */}
      <h3 className="text-sm sm:text-base font-extrabold text-white mb-3 leading-snug break-words">
        {poll.question}
      </h3>

      {/* Opções de Voto */}
      <div className="space-y-2">
        {pollOptions.map((opt) => {
          const optionVotesCount = votes.filter((v) => v.option_id === opt.id).length;
          const percentage = totalVotes > 0 ? Math.round((optionVotesCount / totalVotes) * 100) : 0;
          const isSelectedByMe = userVotes.includes(opt.id);

          return (
            <div
              key={opt.id}
              onClick={() => handleVote(opt.id)}
              className={`relative overflow-hidden p-2.5 sm:p-3 rounded-xl sm:rounded-2xl border transition-all select-none min-w-0 ${
                isClosed
                  ? 'cursor-default opacity-85 border-slate-800 bg-slate-950/60'
                  : 'cursor-pointer hover:border-amber-500/60 active:scale-[0.99]'
              } ${
                isSelectedByMe
                  ? 'bg-slate-900 border-amber-500/80 shadow-md ring-1 ring-amber-500/40'
                  : 'bg-slate-900/80 border-slate-800'
              }`}
            >
              {/* Barra de Progresso com Preenchimento Dinâmico */}
              <div
                className={`absolute left-0 top-0 bottom-0 transition-all duration-500 pointer-events-none rounded-xl ${
                  isSelectedByMe
                    ? 'bg-gradient-to-r from-amber-500/25 via-yellow-500/20 to-amber-500/30'
                    : 'bg-slate-800/60'
                }`}
                style={{ width: `${percentage}%` }}
              />

              {/* Conteúdo da Opção */}
              <div className="relative z-10 flex items-center justify-between gap-2 min-w-0">
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className={`w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0 transition-colors ${
                      isSelectedByMe
                        ? 'border-amber-400 bg-amber-400 text-black'
                        : 'border-slate-600 bg-slate-800'
                    }`}
                  >
                    {isSelectedByMe && <CheckCircle className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>

                  <span className={`text-xs sm:text-sm font-semibold truncate ${
                    isSelectedByMe ? 'text-amber-200 font-bold' : 'text-slate-200'
                  }`}>
                    {opt.text}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 flex-shrink-0 text-xs">
                  <span className="font-extrabold text-amber-300">{percentage}%</span>
                  <span className="text-[10px] text-slate-400">({optionVotesCount})</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Rodapé da Enquete: Total de Votos & Data */}
      <div className="flex items-center justify-between text-[11px] text-slate-400 mt-3 pt-2.5 border-t border-slate-800/80">
        <div className="flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5 text-amber-400" />
          <span>
            {totalVotes} {totalVotes === 1 ? 'voto registrado' : 'votos registrados'}
          </span>
        </div>

        <div>
          {hasVoted && (
            <span className="text-emerald-400 font-bold flex items-center gap-1">
              <span>✓</span> Voto confirmado
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
