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
  Pause
} from 'lucide-react';
import { FormattedText } from './FormattedText';

const POPULAR_REACTIONS = ['👍', '❤️', '🔥', '😂', '🎉', '👏'];

export function MessageBubble({
  message,
  isOwn,
  onReply,
  onEdit,
  onDelete,
  onPin,
  onReact,
  onImageClick
}) {
  const [showMenu, setShowMenu] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  const formattedTime = message.created_at
    ? format(new Date(message.created_at), 'HH:mm', { locale: ptBR })
    : '';

  const handleCopy = () => {
    if (message.content) {
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
      className={`group relative flex flex-col my-1.5 transition-all ${
        isOwn ? 'items-end' : 'items-start'
      }`}
      onMouseLeave={() => {
        setShowMenu(false);
        setShowEmojiPicker(false);
      }}
    >
      {/* Nome do Remetente em Grupos para mensagens recebidas */}
      {!isOwn && message.sender && (
        <span className="text-[11px] font-semibold text-brand-400 mb-0.5 ml-2">
          {message.sender.display_name || message.sender.username}
        </span>
      )}

      <div className="relative flex items-center max-w-[85%] sm:max-w-[70%]">
        {/* Menu Flutuante de Ações no Hover */}
        <div
          className={`absolute top-0 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity z-20 flex items-center bg-background-surface/95 border border-slate-700/80 rounded-full px-1.5 py-0.5 shadow-lg backdrop-blur ${
            isOwn ? 'right-0 -translate-x-full mr-2' : 'left-0 translate-x-full ml-2'
          }`}
        >
          {/* Reação Rápida */}
          <div className="relative">
            <button
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              title="Reagir"
              className="p-1 text-slate-400 hover:text-yellow-400 rounded-full hover:bg-slate-700/60 transition-colors"
            >
              <Smile className="w-3.5 h-3.5" />
            </button>

            {showEmojiPicker && (
              <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-background-dark/95 border border-slate-700 px-2 py-1 rounded-full shadow-xl z-30 animate-fadeIn">
                {POPULAR_REACTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => {
                      onReact(message.id, emoji);
                      setShowEmojiPicker(false);
                    }}
                    className="hover:scale-125 transition-transform text-sm p-0.5"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
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
              onClick={() => setShowMenu(!showMenu)}
              title="Mais opções"
              className="p-1 text-slate-400 hover:text-slate-200 rounded-full hover:bg-slate-700/60 transition-colors"
            >
              <MoreVertical className="w-3.5 h-3.5" />
            </button>

            {showMenu && (
              <div
                className={`absolute bottom-full mb-1 ${
                  isOwn ? 'right-0' : 'left-0'
                } w-36 bg-background-surface border border-slate-700 rounded-xl shadow-2xl py-1 z-30 text-xs animate-fadeIn`}
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
            )}
          </div>
        </div>

        {/* Corpo do Balão da Mensagem */}
        <div
          className={`relative px-3.5 py-2 rounded-2xl shadow-sm transition-all ${
            isOwn
              ? 'bubble-sent text-white'
              : 'bubble-received text-slate-100'
          } ${message.is_deleted ? 'italic opacity-60' : ''}`}
        >
          {/* Citação da Resposta (Reply Quote) */}
          {message.reply_to && (
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

          {/* Anexos de Imagem */}
          {message.attachments && message.attachments.length > 0 && (
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

                // Arquivos genéricos
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

          {/* Conteúdo de Texto com suporte a Markdown */}
          {message.content && (
            <div className="text-sm">
              <FormattedText text={message.content} isOwn={isOwn} />
            </div>
          )}

          {/* Rodapé do Balão: Timestamp + Status + Editada */}
          <div className="flex items-center justify-end gap-1 mt-1 text-[10px] opacity-75 select-none float-right ml-2 -mb-0.5">
            {message.is_pinned && (
              <Pin className="w-2.5 h-2.5 fill-current rotate-45 mr-0.5" />
            )}
            {message.is_edited && (
              <span className="italic mr-0.5">(editada)</span>
            )}
            <span>{formattedTime}</span>

            {/* Ícone de status de leitura para mensagens enviadas */}
            {isOwn && (
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

      {/* Badges de Reações com Emojis */}
      {Object.keys(reactionsMap).length > 0 && (
        <div className={`flex flex-wrap gap-1 mt-1 z-10 ${isOwn ? 'mr-1' : 'ml-1'}`}>
          {Object.entries(reactionsMap).map(([emoji, count]) => (
            <button
              key={emoji}
              onClick={() => onReact(message.id, emoji)}
              className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-background-surface/90 border border-slate-700/80 hover:border-brand-500 shadow-sm transition-all animate-fadeIn"
            >
              <span>{emoji}</span>
              {count > 1 && <span className="text-[10px] font-semibold text-slate-300">{count}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
