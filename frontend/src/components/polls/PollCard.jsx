import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase, isSupabaseConfigured } from '../../lib/supabaseClient';
import { sounds } from '../../lib/sound';
import confetti from 'canvas-confetti';
import {
  BarChart3,
  CheckCircle2,
  Clock,
  Lock,
  Sparkles,
  Users,
  Vote
} from 'lucide-react';

export function PollCard({ message }) {
  const { user } = useAuth();
  const [poll, setPoll] = useState(null);
  const [votes, setVotes] = useState([]); // Array<{ id, user_id, option_id }>
  const [timeLeft, setTimeLeft] = useState('');
  const [isExpired, setIsExpired] = useState(false);
  const [voting, setVoting] = useState(false);

  useEffect(() => {
    try {
      if (typeof message.content === 'string') {
        const parsed = JSON.parse(message.content);
        setPoll(parsed);
      } else if (typeof message.content === 'object') {
        setPoll(message.content);
      }
    } catch (e) {
      console.warn('Erro ao parsear dados da enquete:', e);
    }
  }, [message.content]);

  // Carregar votos da enquete no Supabase
  useEffect(() => {
    if (!poll?.id || !isSupabaseConfigured || !supabase) return;

    loadVotes();

    // Escutar votos em tempo real
    const channel = supabase
      .channel(`realtime:poll_votes:${poll.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'poll_votes', filter: `poll_id=eq.${poll.id}` },
        () => {
          loadVotes();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [poll?.id]);

  const loadVotes = async () => {
    if (!poll?.id || !isSupabaseConfigured || !supabase) return;
    try {
      const { data } = await supabase
        .from('poll_votes')
        .select('*')
        .eq('poll_id', poll.id);

      if (data) setVotes(data);
    } catch (err) {
      console.warn('Erro ao buscar votos da enquete:', err);
    }
  };

  // Timer de Contagem Regressiva
  useEffect(() => {
    if (!poll?.expires_at) {
      setTimeLeft('Enquete Permanente');
      setIsExpired(false);
      return;
    }

    const updateTimer = () => {
      const diff = new Date(poll.expires_at).getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft('Enquete Encerrada');
        setIsExpired(true);
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const secs = Math.floor((diff % (1000 * 60)) / 1000);

      if (hours > 24) {
        const days = Math.floor(hours / 24);
        setTimeLeft(`Termina em ${days}d ${hours % 24}h`);
      } else if (hours > 0) {
        setTimeLeft(`Termina em ${hours}h ${mins}m`);
      } else {
        setTimeLeft(`Termina em ${mins}m ${secs}s`);
      }
      setIsExpired(false);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [poll?.expires_at]);

  if (!poll) return null;

  const totalVotes = votes.length;
  const userVotedOptionIds = votes.filter(v => v.user_id === user?.id).map(v => v.option_id);

  const handleVote = async (optionId) => {
    if (isExpired || voting || !user) return;

    try {
      setVoting(true);
      const hasVotedThis = userVotedOptionIds.includes(optionId);

      if (hasVotedThis) {
        // Remover voto
        if (isSupabaseConfigured && supabase && poll.id) {
          await supabase
            .from('poll_votes')
            .delete()
            .eq('poll_id', poll.id)
            .eq('user_id', user.id)
            .eq('option_id', optionId);
        }
        setVotes(prev => prev.filter(v => !(v.user_id === user.id && v.option_id === optionId)));
        sounds.playPop();
      } else {
        // Se não permite múltipla escolha, remove votos anteriores
        if (!poll.allow_multiple && userVotedOptionIds.length > 0) {
          if (isSupabaseConfigured && supabase && poll.id) {
            await supabase
              .from('poll_votes')
              .delete()
              .eq('poll_id', poll.id)
              .eq('user_id', user.id);
          }
          setVotes(prev => prev.filter(v => v.user_id !== user.id));
        }

        // Inserir novo voto
        if (isSupabaseConfigured && supabase && poll.id) {
          await supabase
            .from('poll_votes')
            .insert({
              poll_id: poll.id,
              user_id: user.id,
              option_id: optionId
            });
        }

        setVotes(prev => [...prev, { id: `vote-${Date.now()}`, poll_id: poll.id, user_id: user.id, option_id: optionId }]);
        sounds.playPop();
        confetti({ particleCount: 40, spread: 50, origin: { y: 0.7 } });
      }
    } catch (err) {
      console.error('Erro ao registrar voto:', err);
    } finally {
      setVoting(false);
    }
  };

  return (
    <div className="w-full max-w-full sm:max-w-md p-3 sm:p-4 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-slate-900/95 via-slate-900/90 to-indigo-950/60 border border-brand-500/40 shadow-2xl space-y-3 sm:space-y-3.5 select-none animate-fadeIn min-w-0 box-border">
      {/* Topo da Enquete: Ícone + Pergunta + Status */}
      <div>
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <div className="flex items-center gap-1.5 text-brand-300 font-extrabold text-xs uppercase tracking-wider">
            <BarChart3 className="w-4 h-4 text-brand-400" />
            <span>Enquete Oficial</span>
          </div>

          {/* Badge de Tempo / Status */}
          <div className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold flex items-center gap-1 border ${
            isExpired
              ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
              : 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse'
          }`}>
            {isExpired ? <Lock className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
            <span>{timeLeft}</span>
          </div>
        </div>

        <h3 className="text-sm font-extrabold text-white leading-snug">
          {poll.question}
        </h3>
      </div>

      {/* Opções de Voto com Barras de Progresso */}
      <div className="space-y-2">
        {poll.options.map((option) => {
          const optionVotes = votes.filter(v => v.option_id === option.id).length;
          const percentage = totalVotes > 0 ? Math.round((optionVotes / totalVotes) * 100) : 0;
          const isUserVoted = userVotedOptionIds.includes(option.id);

          return (
            <div
              key={option.id}
              onClick={() => handleVote(option.id)}
              className={`relative overflow-hidden p-3 rounded-2xl border transition-all cursor-pointer ${
                isExpired
                  ? 'cursor-default opacity-85 border-slate-800 bg-background-dark/60'
                  : isUserVoted
                  ? 'border-brand-500 bg-brand-600/20 shadow-md shadow-brand-500/10'
                  : 'border-slate-800 bg-background-dark/80 hover:border-slate-700 hover:bg-background-dark'
              }`}
            >
              {/* Barra de Progresso de Fundo */}
              <div
                className={`absolute left-0 top-0 bottom-0 transition-all duration-500 pointer-events-none ${
                  isUserVoted
                    ? 'bg-gradient-to-r from-brand-600/40 via-indigo-600/30 to-brand-500/20'
                    : 'bg-slate-700/20'
                }`}
                style={{ width: `${percentage}%` }}
              />

              {/* Conteúdo da Opção */}
              <div className="relative z-10 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0 transition-colors ${
                    isUserVoted
                      ? 'bg-brand-500 border-brand-400 text-white'
                      : 'border-slate-600 bg-slate-900/60'
                  }`}>
                    {isUserVoted && <CheckCircle2 className="w-3 h-3 text-white" />}
                  </div>
                  <span className={`font-semibold truncate ${isUserVoted ? 'text-white font-extrabold' : 'text-slate-200'}`}>
                    {option.text}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 flex-shrink-0 text-[11px] font-extrabold">
                  <span className={isUserVoted ? 'text-brand-300' : 'text-slate-400'}>
                    {percentage}%
                  </span>
                  <span className="text-[10px] text-slate-500 font-normal">
                    ({optionVotes})
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Rodapé: Total de Votos & Criador */}
      <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
        <div className="flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5 text-slate-500" />
          <span>{totalVotes} {totalVotes === 1 ? 'voto' : 'votos'} no total</span>
          {poll.allow_multiple && (
            <span className="text-[10px] text-brand-400 font-semibold">• Múltipla escolha</span>
          )}
        </div>

        {poll.creator && (
          <span className="text-[10px] text-slate-500">
            por @{poll.creator.username || 'damon'}
          </span>
        )}
      </div>
    </div>
  );
}
