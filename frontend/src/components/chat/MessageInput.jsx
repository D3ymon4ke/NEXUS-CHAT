import React, { useState, useRef, useEffect } from 'react';
import { useChat } from '../../context/ChatContext';
import { apiRequest } from '../../lib/api';
import {
  Send,
  Paperclip,
  Smile,
  X,
  Image as ImageIcon,
  FileText,
  Mic,
  Reply,
  Loader2,
  Edit2,
  Check
} from 'lucide-react';

const EMOJI_CATEGORIES = [
  { name: 'Populares', emojis: ['😀', '😂', '😍', '🔥', '🚀', '👍', '🎉', '❤️', '👏', '✨', '😎', '💯'] },
  { name: 'Expressões', emojis: ['😇', '🥳', '🤔', '🙌', '🤝', '💪', '👀', '💡', '⚡', '🌟', '🎯', '🏆'] },
  { name: 'Símbolos', emojis: ['✅', '❌', '⚠️', '💎', '📌', '🔔', '💬', '📢', '💻', '📱', '🔒', '🔑'] }
];

export function MessageInput() {
  const { sendMessage, editMessage, emitTyping, replyingTo, setReplyingTo, editingMessage, setEditingMessage } = useChat();
  const [content, setContent] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

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

  const handleInputChange = (e) => {
    setContent(e.target.value);
    emitTyping(true);

    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      emitTyping(false);
    }, 2000);
  };

  const wrapSelectedText = (before, after = before) => {
    if (!textareaRef.current) return;
    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    const selected = content.substring(start, end);

    const replacement = selected ? `${before}${selected}${after}` : `${before}texto${after}`;
    const newContent = content.substring(0, start) + replacement + content.substring(end);
    setContent(newContent);

    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        const cursor = selected ? start + replacement.length : start + before.length;
        textareaRef.current.setSelectionRange(cursor, cursor + (selected ? 0 : 5));
      }
    }, 0);
  };

  const handleKeyDown = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
      e.preventDefault();
      wrapSelectedText('**');
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'i') {
      e.preventDefault();
      wrapSelectedText('*');
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      wrapSelectedText('`');
      return;
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
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

    // Se estiver em modo de edição
    if (editingMessage) {
      await editMessage(editingMessage.id, messageContent);
      return;
    }

    // Envio padrão de nova mensagem
    await sendMessage({
      content: messageContent,
      type: messageAttachments.length > 0 ? (messageAttachments[0].type || 'file') : 'text',
      attachments: messageAttachments,
      replyToId: replyingTo?.id || null
    });
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    try {
      setUploading(true);
      for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);

        const res = await apiRequest('/upload', {
          method: 'POST',
          body: formData
        });

        if (res.success && res.file) {
          setAttachments(prev => [...prev, res.file]);
        }
      }
    } catch (err) {
      console.error('Erro no upload de arquivo:', err);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
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

      {/* Pré-visualização de Anexos */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {attachments.map((att, idx) => (
            <div
              key={idx}
              className="relative group p-1.5 rounded-xl bg-background-dark border border-slate-700 flex items-center gap-2 text-xs"
            >
              {att.file_type === 'image' ? (
                <img src={att.file_url} alt="anexo" className="w-8 h-8 rounded-lg object-cover" />
              ) : (
                <FileText className="w-5 h-5 text-brand-400" />
              )}
              <span className="truncate max-w-[120px] text-slate-200">{att.file_name}</span>
              <button
                onClick={() => removeAttachment(idx)}
                className="p-0.5 rounded-full bg-slate-800 text-slate-400 hover:text-red-400"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Caixa de Texto e Controles */}
      <div className="flex items-end gap-2">
        {/* Anexar Arquivo */}
        {!editingMessage && (
          <div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              multiple
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="p-2.5 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-background-hover transition-colors"
              title="Anexar arquivo"
            >
              {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Paperclip className="w-5 h-5" />}
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
            placeholder={editingMessage ? "Edite sua mensagem..." : "Digite uma mensagem... (Enter para enviar)"}
            className="w-full bg-transparent px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none resize-none max-h-32 leading-relaxed"
          />

          {/* Emoji Picker Button */}
          <div className="pb-2.5 pr-2 relative">
            <button
              type="button"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="p-1 text-slate-400 hover:text-yellow-400 transition-colors"
              title="Inserir emoji"
            >
              <Smile className="w-5 h-5" />
            </button>

            {showEmojiPicker && (
              <div className="absolute bottom-full right-0 mb-3 w-64 bg-background-surface/95 border border-slate-700 rounded-2xl shadow-2xl p-3 z-30 backdrop-blur animate-fadeIn">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
                  <span className="text-xs font-bold text-slate-300">Emojis</span>
                  <button onClick={() => setShowEmojiPicker(false)} className="text-slate-400 hover:text-white">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto">
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
