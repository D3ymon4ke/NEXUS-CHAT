import React, { useState, useRef, useEffect } from 'react';
import { useChat } from '../../context/ChatContext';
import { ANIMATED_STICKERS } from '../../lib/animatedStickers';
import {
  Send,
  Paperclip,
  Smile,
  X,
  Image as ImageIcon,
  FileText,
  Reply,
  Loader2,
  Edit2,
  Check,
  Sparkles,
  Flame
} from 'lucide-react';

const EMOJI_CATEGORIES = [
  { name: 'Populares', emojis: ['😀', '😂', '😍', '🔥', '🚀', '👍', '🎉', '❤️', '👏', '✨', '😎', '💯'] },
  { name: 'Expressões', emojis: ['😇', '🥳', '🤔', '🙌', '🤝', '💪', '👀', '💡', '⚡', '🌟', '🎯', '🏆'] },
  { name: 'Símbolos', emojis: ['✅', '❌', '⚠️', '💎', '📌', '🔔', '💬', '📢', '💻', '📱', '🔒', '🔑'] }
];

export function MessageInput() {
  const { sendMessage, editMessage, emitTyping, replyingTo, setReplyingTo, editingMessage, setEditingMessage } = useChat();
  const [content, setContent] = useState('');
  const [attachments, setAttachments] = useState([]); // Array<{ file_name, file_url, file_type, file_size }>
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [activeEmojiTab, setActiveEmojiTab] = useState('emojis'); // 'emojis' | 'stickers'
  const [uploading, setUploading] = useState(false);

  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);
  const typingTimerRef = useRef(null);

  // Preencher conteúdo ao entrar em modo de edição
  useEffect(() => {
    if (editingMessage) {
      setContent(editingMessage.content || '');
      setReplyingTo(null);
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    }
  }, [editingMessage]);

  // Ajuste automático de altura do textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [content]);

  // Suporte a colar imagens com Ctrl+V
  useEffect(() => {
    const handlePaste = (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            readAndAttachImage(file);
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  const handleInputChange = (e) => {
    setContent(e.target.value);
    emitTyping(true);

    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      emitTyping(false);
    }, 2000);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const readAndAttachImage = (file) => {
    setUploading(true);
    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      const base64Url = loadEvent.target?.result;
      if (base64Url) {
        setAttachments(prev => [
          ...prev,
          {
            file_name: file.name || 'imagem.png',
            file_url: base64Url,
            file_type: 'image',
            file_size: file.size
          }
        ]);
      }
      setUploading(false);
    };
    reader.onerror = () => setUploading(false);
    reader.readAsDataURL(file);
  };

  const handleSend = async () => {
    if ((!content.trim() && attachments.length === 0) || uploading) return;

    const messageContent = content.trim();
    const messageAttachments = [...attachments];

    setContent('');
    setAttachments([]);
    setShowEmojiPicker(false);
    emitTyping(false);

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    if (editingMessage) {
      await editMessage(editingMessage.id, messageContent);
      return;
    }

    await sendMessage({
      content: messageContent,
      type: messageAttachments.length > 0 ? (messageAttachments[0].file_type || 'image') : 'text',
      attachments: messageAttachments,
      replyToId: replyingTo?.id || null
    });
  };

  const handleSendSticker = async (sticker) => {
    setShowEmojiPicker(false);
    await sendMessage({
      content: '',
      type: 'image',
      attachments: [
        {
          file_name: `${sticker.name}.webp`,
          file_url: sticker.url,
          file_type: 'image',
          file_size: 0
        }
      ],
      replyToId: replyingTo?.id || null
    });
  };

  const handleFileInputChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    files.forEach(file => {
      if (file.type.startsWith('image/')) {
        readAndAttachImage(file);
      } else {
        // Arquivo genérico
        const reader = new FileReader();
        reader.onload = (ev) => {
          setAttachments(prev => [
            ...prev,
            {
              file_name: file.name,
              file_url: ev.target?.result,
              file_type: 'file',
              file_size: file.size
            }
          ]);
        };
        reader.readAsDataURL(file);
      }
    });

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeAttachment = (index) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const addEmoji = (emoji) => {
    setContent(prev => prev + emoji);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  return (
    <div className="relative border-t border-slate-800 bg-background-surface/90 backdrop-blur-md p-3">
      {/* Banner de Edição de Mensagem */}
      {editingMessage && (
        <div className="mb-2 px-3 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-between text-xs animate-fadeIn">
          <div className="flex items-center gap-2 min-w-0">
            <Edit2 className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <span className="font-bold text-amber-300">Editando mensagem:</span>
            <span className="text-slate-300 truncate">{editingMessage.content}</span>
          </div>
          <button
            onClick={() => {
              setEditingMessage(null);
              setContent('');
            }}
            className="p-1 text-slate-400 hover:text-white rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Banner de Resposta (Reply Quote) */}
      {!editingMessage && replyingTo && (
        <div className="mb-2 px-3 py-1.5 rounded-xl bg-brand-500/10 border border-brand-500/30 flex items-center justify-between text-xs animate-fadeIn">
          <div className="flex items-center gap-2 min-w-0">
            <Reply className="w-3.5 h-3.5 text-brand-400 flex-shrink-0" />
            <span className="font-semibold text-brand-300">
              Respondendo a {replyingTo.sender?.display_name || 'Usuário'}:
            </span>
            <span className="text-slate-400 truncate">{replyingTo.content || 'Anexo'}</span>
          </div>
          <button
            onClick={() => setReplyingTo(null)}
            className="p-1 text-slate-400 hover:text-white rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Pré-visualização de Imagens e Anexos Selecionados */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2.5 p-2 bg-background-dark/80 rounded-2xl border border-slate-700/80 animate-fadeIn">
          {attachments.map((att, idx) => (
            <div
              key={idx}
              className="relative group p-1 rounded-xl bg-slate-900 border border-slate-700 flex items-center gap-2"
            >
              {att.file_type === 'image' ? (
                <img
                  src={att.file_url}
                  alt={att.file_name}
                  className="w-16 h-16 rounded-lg object-cover border border-brand-500/40"
                />
              ) : (
                <div className="flex items-center gap-2 px-2 py-1">
                  <FileText className="w-5 h-5 text-brand-400" />
                  <span className="text-xs text-slate-200 truncate max-w-[100px]">{att.file_name}</span>
                </div>
              )}
              <button
                type="button"
                onClick={() => removeAttachment(idx)}
                className="absolute -top-1.5 -right-1.5 p-1 rounded-full bg-rose-600 text-white hover:bg-rose-500 shadow-md transition-transform group-hover:scale-110"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
          <div className="flex items-center text-[11px] text-slate-400 pl-2">
            <span>Escreva sua mensagem abaixo e pressione Enter para enviar junto com a imagem</span>
          </div>
        </div>
      )}

      {/* Caixa de Texto e Controles */}
      <div className="flex items-end gap-2">
        {/* Anexar Arquivo ou Imagem */}
        {!editingMessage && (
          <div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileInputChange}
              accept="image/*,.pdf,.doc,.docx,.txt"
              multiple
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="p-2.5 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-background-hover transition-colors"
              title="Anexar imagem ou arquivo"
            >
              {uploading ? <Loader2 className="w-5 h-5 animate-spin text-brand-400" /> : <Paperclip className="w-5 h-5" />}
            </button>
          </div>
        )}

        {/* Input Textarea */}
        <div className="flex-1 relative bg-background-dark rounded-2xl border border-slate-700/80 focus-within:border-brand-500 transition-all flex items-end">
          <textarea
            ref={textareaRef}
            rows={1}
            value={content}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={
              editingMessage
                ? "Edite sua mensagem..."
                : attachments.length > 0
                ? "Adicione uma legenda para a imagem... (Enter para enviar)"
                : "Digite uma mensagem... (Cole com Ctrl+V ou Enter para enviar)"
            }
            className="w-full bg-transparent px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none resize-none max-h-32 leading-relaxed"
          />

          {/* Emoji & Animated Stickers Picker */}
          <div className="pb-2.5 pr-2 relative">
            <button
              type="button"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="p-1 text-slate-400 hover:text-yellow-400 transition-colors"
              title="Emojis e Figurinhas Animadas"
            >
              <Smile className="w-5 h-5" />
            </button>

            {showEmojiPicker && (
              <div className="absolute bottom-full right-0 mb-3 w-72 bg-background-surface/95 border border-slate-700 rounded-2xl shadow-2xl p-3 z-30 backdrop-blur-md animate-fadeIn">
                {/* Abas Emojis vs Figurinhas Animadas */}
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
                  <div className="flex gap-1 bg-background-dark p-0.5 rounded-xl border border-slate-800 text-xs">
                    <button
                      type="button"
                      onClick={() => setActiveEmojiTab('emojis')}
                      className={`px-2.5 py-1 rounded-lg font-bold transition-colors ${
                        activeEmojiTab === 'emojis' ? 'bg-brand-600 text-white' : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Emojis
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveEmojiTab('stickers')}
                      className={`px-2.5 py-1 rounded-lg font-bold transition-colors flex items-center gap-1 ${
                        activeEmojiTab === 'stickers' ? 'bg-gradient-to-r from-amber-600 to-rose-600 text-white' : 'text-amber-400/80 hover:text-amber-300'
                      }`}
                    >
                      <Sparkles className="w-3 h-3" /> Figurinhas Animadas
                    </button>
                  </div>
                  <button onClick={() => setShowEmojiPicker(false)} className="text-slate-400 hover:text-white p-1">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* ABA 1: EMOJIS PADRÃO */}
                {activeEmojiTab === 'emojis' && (
                  <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                    {EMOJI_CATEGORIES.map(cat => (
                      <div key={cat.name}>
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                          {cat.name}
                        </span>
                        <div className="grid grid-cols-6 gap-1">
                          {cat.emojis.map(e => (
                            <button
                              key={e}
                              type="button"
                              onClick={() => addEmoji(e)}
                              className="text-base p-1 rounded-lg hover:bg-slate-700/60 transition-transform hover:scale-125 flex items-center justify-center"
                            >
                              {e}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* ABA 2: FIGURINHAS ANIMADAS (ANIMATED STICKERS) */}
                {activeEmojiTab === 'stickers' && (
                  <div className="grid grid-cols-3 gap-2 max-h-52 overflow-y-auto p-1">
                    {ANIMATED_STICKERS.map(sticker => (
                      <button
                        key={sticker.id}
                        type="button"
                        onClick={() => handleSendSticker(sticker)}
                        title={sticker.name}
                        className="p-2 rounded-xl bg-background-dark/60 hover:bg-amber-500/10 border border-slate-800 hover:border-amber-500/40 transition-all flex flex-col items-center justify-center gap-1 group hover:scale-105"
                      >
                        <img src={sticker.url} alt={sticker.name} className="w-10 h-10 object-contain drop-shadow" />
                        <span className="text-[9px] text-slate-400 truncate max-w-full font-medium">{sticker.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Botão Enviar / Salvar Edição */}
        <button
          type="button"
          onClick={handleSend}
          disabled={(!content.trim() && attachments.length === 0) || uploading}
          className={`p-3 rounded-2xl text-white shadow-lg transition-all flex items-center justify-center ${
            editingMessage
              ? 'bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black shadow-amber-500/20'
              : content.trim() || attachments.length > 0
              ? 'bg-brand-600 hover:bg-brand-500 shadow-brand-500/25 hover:scale-105'
              : 'bg-slate-800 text-slate-500 cursor-not-allowed'
          }`}
          title={editingMessage ? "Salvar alteração" : "Enviar mensagem"}
        >
          {editingMessage ? <Check className="w-5 h-5" /> : <Send className="w-5 h-5" />}
        </button>
      </div>
    </div>
  );
}
