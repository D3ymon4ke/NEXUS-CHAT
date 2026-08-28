import React, { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Check,
  CheckCheck,
  MoreVertical,
  Reply,
  Copy,
  Pin,
  Edit2,
  Trash2,
  Smile,
  FileText,
  Download,
  Play,
  Pause,
  Ban
} from 'lucide-react';
import { FormattedText } from './FormattedText';
import { PollCard } from '../polls/PollCard';
import { CoffeeInviteCard } from './CoffeeInviteCard';
import { GhostMessageCard } from './GhostMessageCard';
import { NexusBurstCard } from './NexusBurstCard';

const POPULAR_REACTIONS = ['👍', '❤️', '🔥', '😂', '🎉', '👏'];

import { getFrameAsset, getFrameStyle } from '../../lib/shopCatalog';

const BUBBLE_STYLES = {
  bubble_cyber_violet: 'bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 text-white shadow-lg shadow-purple-500/20',
  bubble_royal_gold: 'bg-gradient-to-r from-amber-600 via-yellow-600 to-amber-700 text-amber-50 shadow-lg shadow-amber-500/25 border border-amber-400/40',
  bubble_matrix_emerald: 'bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-lg shadow-emerald-500/20 border border-emerald-400/30',
  bubble_rose_velvet: 'bg-gradient-to-r from-pink-600 to-rose-600 text-white shadow-lg shadow-pink-500/20'
};

const NAME_STYLES = {
  name_rainbow_glow: 'bg-gradient-to-r from-red-400 via-amber-300 via-green-300 to-sky-400 bg-clip-text text-transparent font-extrabold',
  name_golden_glow: 'text-amber-300 font-extrabold drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]',
  name_electric_cyan: 'text-cyan-400 font-extrabold drop-shadow-[0_0_8px_rgba(34,211,238,0.6)]'
};

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

export function MessageBubble({
  message,
  isOwn,
  showSenderInfo = true,
  onReply,
  onEdit,
  onDelete,
  onPin,
  onReact,
  onImageClick,
  onOpenProfile
}) {
  const [showMenu, setShowMenu] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  const sender = message.sender || {};
  const isDeleted = Boolean(message.is_deleted);
  const badgeInfo = BADGE_LABELS[sender.equipped_badge];
  const nameStyle = NAME_STYLES[sender.equipped_name_color] || 'text-brand-400 font-bold';
  const animatedFrameUrl = getFrameAsset(sender.equipped_frame);
  const frameClass = getFrameStyle(sender.equipped_frame) || (!animatedFrameUrl ? 'border border-slate-700' : '');

  const isAdmin = sender.role === 'admin' || sender.username?.toLowerCase() === 'damon';
  const isModerator = sender.role === 'moderator';

  const customBubble = isDeleted
    ? 'bg-slate-900/60 border border-slate-800 text-slate-400'
    : isOwn
    ? (BUBBLE_STYLES[sender.equipped_bubble] || 'bubble-sent text-white')
    : 'bubble-received text-slate-100';

  const formattedTime = message.created_at
    ? format(new Date(message.created_at), 'HH:mm', { locale: ptBR })
    : '';

  const handleCopy = () => {
    if (message.content && !isDeleted) {
      navigator.clipboard.writeText(message.content);
      setShowMenu(false);
    }
  };

  // Agrupar reações por emoji
  const reactionsMap = (message.reactions || []).reduce((acc, r) => {
    acc[r.emoji] = (acc[r.emoji] || 0) + 1;
    return acc;
  }, {});

  return (
    <div
      className={`group relative flex my-1.5 transition-all w-full max-w-full min-w-0 ${
        isOwn ? 'justify-end' : 'justify-start items-end gap-1.5 sm:gap-2'
      }`}
    >
      {/* Bolinha da Imagem do Usuário (Visível em grupos e conversas com mais de 2 pessoas) */}
      {!isOwn && showSenderInfo && (
        <div
          onClick={() => onOpenProfile && onOpenProfile(sender)}
          className="relative inline-flex items-center justify-center cursor-pointer flex-shrink-0 group-hover:scale-105 transition-transform mb-1 w-7 h-7 sm:w-8 sm:h-8"
          title={`Ver perfil de ${sender.display_name || sender.username}`}
        >
          <img
            src={sender.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${sender.id || 'nexus'}`}
            alt={sender.display_name || 'avatar'}
            className={`w-full h-full rounded-full object-cover shadow bg-slate-900 ${frameClass}`}
          />
          {animatedFrameUrl && (
            <img
              src={animatedFrameUrl}
              alt="Moldura"
              className="absolute -inset-[22%] w-[144%] h-[144%] max-w-none pointer-events-none object-contain z-10 select-none"
            />
          )}
        </div>
      )}

      <div className={`flex flex-col min-w-0 ${isOwn ? 'items-end' : 'items-start'} max-w-[88%] sm:max-w-[75%]`}>
        {/* Nome do Remetente e Badges de Cargo (Admin / Mod / Títulos Nomeados / Badges) */}
        {!isOwn && showSenderInfo && !isDeleted && (
          <div
            onClick={() => onOpenProfile && onOpenProfile(sender)}
            className="flex flex-wrap items-center gap-1 sm:gap-1.5 mb-1 ml-1 cursor-pointer hover:opacity-85 transition-opacity max-w-full min-w-0"
            title="Ver perfil do membro"
          >
            <span className={`text-[11px] truncate max-w-[120px] sm:max-w-none ${nameStyle}`}>
              {sender.display_name || sender.username}
            </span>

            {/* Badge de Admin Damon com Efeito Glow */}
            {isAdmin && (
              <span className="px-1.5 sm:px-2 py-0.2 rounded-full bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 text-white text-[8px] sm:text-[9px] font-extrabold border border-amber-400/80 shadow-[0_0_10px_rgba(239,68,68,0.6)] animate-pulse flex items-center gap-0.5 flex-shrink-0">
                <span>👑</span>
                <span>ADMIN</span>
              </span>
            )}

            {/* Título Customizado Nomeado (ex: Coordenador, BETA TESTER, etc) */}
            {sender.custom_title && (
              <span className="px-1.5 sm:px-2 py-0.2 rounded-full bg-gradient-to-r from-cyan-500/25 to-blue-600/25 text-cyan-300 text-[8px] sm:text-[9px] font-extrabold border border-cyan-400/50 shadow-[0_0_8px_rgba(6,182,212,0.4)] flex items-center gap-0.5 flex-shrink-0 truncate max-w-[100px] sm:max-w-none">
                <span>⭐</span>
                <span className="truncate">{sender.custom_title}</span>
              </span>
            )}

            {/* Badge de Moderador */}
            {isModerator && !isAdmin && !sender.custom_title && (
              <span className="px-1.5 sm:px-2 py-0.2 rounded-full bg-indigo-600/30 text-indigo-300 text-[8px] sm:text-[9px] font-bold border border-indigo-500/40 flex items-center gap-0.5 flex-shrink-0">
                <span>🛡️</span>
                <span>MOD</span>
              </span>
            )}

            {/* Badge da Loja / Condecoração */}
            {badgeInfo && (
              <span className={`text-[8px] sm:text-[9px] px-1.5 py-0.2 rounded-full border flex items-center gap-0.5 flex-shrink-0 ${badgeInfo.color || 'bg-amber-500/20 text-amber-300 border-amber-500/30'}`}>
                <span>{badgeInfo.icon}</span>
                <span className="hidden xs:inline">{badgeInfo.label}</span>
              </span>
            )}
          </div>
        )}

        <div className="relative flex items-center w-full min-w-0 max-w-full">
        {/* Menu Flutuante de Ações no Hover (Desabilitado se mensagem excluída) */}
        {!isDeleted && (
          <div
            className={`absolute top-0 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity z-20 flex items-center bg-background-surface/95 border border-slate-700/80 rounded-full px-1.5 py-0.5 shadow-lg backdrop-blur max-w-[calc(100vw-2rem)] ${
              showMenu || showEmojiPicker ? '!opacity-100 !z-40' : ''
            } ${
              isOwn ? 'right-0 -translate-x-full mr-2' : 'left-0 translate-x-full ml-2'
            }`}
          >
            {/* Reação Rápida */}
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowEmojiPicker(!showEmojiPicker);
                  setShowMenu(false);
                }}
                title="Reagir"
                className="p-1 text-slate-400 hover:text-yellow-400 rounded-full hover:bg-slate-700/60 transition-colors"
              >
                <Smile className="w-3.5 h-3.5" />
              </button>

              {showEmojiPicker && (
                <>
                  <div
                    className="fixed inset-0 z-30"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowEmojiPicker(false);
                    }}
                  />
                  <div className="absolute top-full mt-1.5 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-background-dark/95 border border-slate-700 px-2 py-1 rounded-full shadow-xl z-40 animate-fadeIn backdrop-blur">
                    {POPULAR_REACTIONS.map((emoji) => (
                      <button
                        key={emoji}
                        onClick={(e) => {
                          e.stopPropagation();
                          onReact(message.id, emoji);
                          setShowEmojiPicker(false);
                        }}
                        className="hover:scale-125 transition-transform text-sm p-0.5"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            <button
              onClick={() => onReply(message)}
              title="Responder"
              className="p-1 text-slate-400 hover:text-slate-200 rounded-full hover:bg-slate-700/60 transition-colors"
            >
              <Reply className="w-3.5 h-3.5" />
            </button>

            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMenu(!showMenu);
                  setShowEmojiPicker(false);
                }}
                title="Mais opções"
                className="p-1 text-slate-400 hover:text-slate-200 rounded-full hover:bg-slate-700/60 transition-colors"
              >
                <MoreVertical className="w-3.5 h-3.5" />
              </button>

              {showMenu && (
                <>
                  <div
                    className="fixed inset-0 z-30"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowMenu(false);
                    }}
                  />
                  <div
                    className={`absolute top-full mt-1.5 w-36 bg-background-surface/95 border border-slate-700/80 rounded-xl shadow-2xl py-1 text-xs z-40 backdrop-blur-md animate-fadeIn ${
                      isOwn ? 'right-0' : 'left-0'
                    }`}
                  >
                    <button
                      onClick={handleCopy}
                      className="w-full px-3 py-1.5 text-left text-slate-200 hover:bg-background-hover flex items-center gap-2"
                    >
                      <Copy className="w-3.5 h-3.5 text-slate-400" /> Copiar Texto
                    </button>
                    <button
                      onClick={() => {
                        onPin(message.id, !message.is_pinned);
                        setShowMenu(false);
                      }}
                      className="w-full px-3 py-1.5 text-left text-slate-200 hover:bg-background-hover flex items-center gap-2"
                    >
                      <Pin className="w-3.5 h-3.5 text-slate-400" />
                      {message.is_pinned ? 'Desafixar' : 'Fixar'}
                    </button>
                    {isOwn && (
                      <>
                        <button
                          onClick={() => {
                            onEdit(message);
                            setShowMenu(false);
                          }}
                          className="w-full px-3 py-1.5 text-left text-slate-200 hover:bg-background-hover flex items-center gap-2"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-slate-400" /> Editar
                        </button>
                        <button
                          onClick={() => {
                            onDelete(message.id);
                            setShowMenu(false);
                          }}
                          className="w-full px-3 py-1.5 text-left text-red-400 hover:bg-red-500/10 flex items-center gap-2"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Excluir
                        </button>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Corpo do Balão da Mensagem */}
        <div className={`relative px-3.5 py-2 rounded-2xl shadow-sm transition-all ${customBubble}`}>
          {/* Citação da Resposta (Reply Quote) */}
          {!isDeleted && message.reply_to && (
            <div
              className={`mb-1.5 p-2 rounded-lg border-l-2 text-xs flex flex-col ${
                isOwn
                  ? 'bg-black/20 border-white/60 text-white/90'
                  : 'bg-background-dark/50 border-brand-500 text-slate-300'
              }`}
            >
              <span className="font-semibold text-[11px] text-brand-300">
                {message.reply_to.sender?.display_name || 'Usuário'}
              </span>
              <span className="truncate text-[11px] opacity-80">
                {message.reply_to.content || 'Anexo'}
              </span>
            </div>
          )}

          {/* Anexos de Mídia (Ocultados se mensagem excluída) */}
          {!isDeleted && message.attachments && message.attachments.length > 0 && (
            <div className="space-y-1.5 mb-1.5">
              {message.attachments.map((att, idx) => {
                if (att.file_type === 'image' || att.file_url?.match(/\.(jpeg|jpg|gif|png|webp|svg)/i) || att.file_url?.startsWith('data:image')) {
                  return (
                    <img
                      key={idx}
                      src={att.file_url}
                      alt={att.file_name || 'Imagem'}
                      onClick={() => onImageClick && onImageClick(att.file_url)}
                      className="max-h-60 rounded-xl object-cover cursor-pointer hover:opacity-95 transition-opacity"
                    />
                  );
                }

                if (att.file_type === 'audio' || att.file_url?.match(/\.(mp3|wav|ogg|webm)/i) || att.file_url?.startsWith('data:audio')) {
                  return (
                    <div
                      key={idx}
                      className="flex items-center gap-3 p-2 rounded-xl bg-black/20 border border-white/10 my-1"
                    >
                      <audio controls className="h-8 max-w-[200px]">
                        <source src={att.file_url} />
                        Seu navegador não suporta áudio.
                      </audio>
                    </div>
                  );
                }

                return (
                  <a
                    key={idx}
                    href={att.file_url}
                    download={att.file_name}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2.5 p-2 rounded-xl bg-black/20 hover:bg-black/30 border border-white/10 transition-colors"
                  >
                    <div className="p-2 rounded-lg bg-white/10">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold truncate">{att.file_name || 'Arquivo'}</p>
                      <span className="text-[10px] opacity-75">
                        {att.file_size ? `${(att.file_size / 1024).toFixed(1)} KB` : 'Download'}
                      </span>
                    </div>
                    <Download className="w-4 h-4 opacity-80" />
                  </a>
                );
              })}
            </div>
          )}

          {/* Conteúdo de Texto, Enquete, Convite para Café, Modo Fantasma ou Estado Excluído */}
          {isDeleted ? (
            <div className="flex items-center gap-1.5 text-xs text-slate-400 italic py-0.5">
              <Ban className="w-3.5 h-3.5 opacity-70" />
              <span>Esta mensagem foi excluída</span>
            </div>
          ) : message.type === 'ghost' || (message.content && message.content.includes('"ghost_message"')) ? (
            <GhostMessageCard message={message} isOwn={isOwn} />
          ) : message.type === 'nexus_burst' || (message.content && message.content.includes('"nexus_burst"')) ? (
            <NexusBurstCard message={message} isOwn={isOwn} />
          ) : message.type === 'coffee_invite' || (message.content && message.content.includes('"coffee_invite"')) ? (
            <CoffeeInviteCard message={message} isOwn={isOwn} />
          ) : message.type === 'poll' ? (
            <PollCard message={message} />
          ) : (
            message.content && (
              <div className="text-sm">
                <FormattedText text={message.content} isOwn={isOwn} />
              </div>
            )
          )}

          {/* Rodapé do Balão: Timestamp + Status + Indicador de Editada */}
          <div className="flex items-center justify-end gap-1 mt-1 text-[10px] opacity-75 select-none float-right ml-2 -mb-0.5">
            {!isDeleted && message.is_pinned && (
              <Pin className="w-2.5 h-2.5 fill-current rotate-45 mr-0.5" />
            )}
            {!isDeleted && message.is_edited && (
              <span className="italic mr-0.5 text-amber-300/90 font-medium">(editada)</span>
            )}
            <span>{formattedTime}</span>

            {/* Ícone de status de leitura para mensagens enviadas */}
            {isOwn && !isDeleted && (
              <span className="ml-0.5">
                {message.status === 'read' ? (
                  <CheckCheck className="w-3.5 h-3.5 text-sky-300" />
                ) : message.status === 'delivered' ? (
                  <CheckCheck className="w-3.5 h-3.5" />
                ) : (
                  <Check className="w-3 h-3" />
                )}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Reações com Emojis */}
      {!isDeleted && Object.keys(reactionsMap).length > 0 && (
        <div
          className={`flex flex-wrap gap-1 mt-1 z-10 ${
            isOwn ? 'justify-end mr-1' : 'justify-start ml-1'
          }`}
        >
          {Object.entries(reactionsMap).map(([emoji, count]) => (
            <button
              key={emoji}
              onClick={() => onReact(message.id, emoji)}
              className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-background-surface/90 border border-slate-700/80 text-xs hover:border-brand-500 hover:scale-105 transition-all shadow"
            >
              <span>{emoji}</span>
              <span className="text-[10px] font-semibold text-slate-300">{count}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  </div>
  );
}
