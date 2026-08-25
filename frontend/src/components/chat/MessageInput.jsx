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
  Loader2
} from 'lucide-react';

const EMOJI_CATEGORIES = [
  { name: 'Populares', emojis: ['😀', '😂', '😍', '🔥', '🚀', '👍', '🎉', '❤️', '👏', '✨', '😎', '💯'] },
  { name: 'Expressões', emojis: ['😇', '🥳', '🤔', '🙌', '🤝', '💪', '👀', '💡', '⚡', '🌟', '🎯', '🏆'] },
  { name: 'Símbolos', emojis: ['✅', '❌', '⚠️', '💎', '📌', '🔔', '💬', '📢', '💻', '📱', '🔒', '🔑'] }
];

export function MessageInput() {
  const { sendMessage, emitTyping, replyingTo, setReplyingTo } = useChat();
  const [content, setContent] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);
  const typingTimerRef = useRef(null);

  // Ajuste automático de altura do textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [content]);

  // Digitação em tempo real
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
    // Atalhos de formatação Markdown
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

    await sendMessage({
      content: messageContent,
      type: messageAttachments.length > 0 ? (messageAttachments[0].type || 'file') : 'text',
      attachments: messageAttachments,
      replyToId: replyingTo?.id || null
    });
  };

  // Upload de arquivos
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
    if (textareaRef.current) textareaRef.current.focus();
  };

  return (
    <div className="relative border-t border-slate-800 bg-background-card/90 backdrop-blur p-3 sm:p-4">
      {/* Banner de Resposta Ativa */}
      {replyingTo && (
        <div className="mb-2 p-2 rounded-xl bg-background-surface/80 border border-brand-500/40 flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-1 rounded-md bg-brand-500/20 text-brand-400">
              <Reply className="w-4 h-4" />
            </div>
            <div className="min-w-0 text-xs">
              <span className="font-semibold text-brand-300 block">
                Respondendo a {replyingTo.sender?.display_name || 'Usuário'}
              </span>
              <span className="text-slate-400 truncate block">{replyingTo.content || 'Anexo'}</span>
            </div>
          </div>
          <button
            onClick={() => setReplyingTo(null)}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700/50 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Pré-visualização de Anexos */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2 p-2 bg-background-surface/50 rounded-xl border border-slate-700/50">
          {attachments.map((att, idx) => (
            <div key={idx} className="relative group flex items-center gap-2 p-1.5 bg-background-dark rounded-lg border border-slate-700 text-xs">
              {att.type === 'image' ? (
                <img src={att.url} alt="anexo" className="w-10 h-10 object-cover rounded" />
              ) : (
                <FileText className="w-6 h-6 text-brand-400 ml-1" />
              )}
              <span className="max-w-[120px] truncate text-slate-200 text-[11px]">{att.name}</span>
              <button
                onClick={() => removeAttachment(idx)}
                className="p-1 text-slate-400 hover:text-red-400 rounded-full"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Emoji Picker Popover */}
      {showEmojiPicker && (
        <div className="absolute bottom-full mb-3 left-4 w-72 bg-background-dark/95 border border-slate-700 rounded-2xl shadow-2xl p-3 z-40 backdrop-blur animate-fadeIn">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
            <span className="text-xs font-bold text-slate-300">Emojis</span>
            <button
              onClick={() => setShowEmojiPicker(false)}
              className="text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="max-h-48 overflow-y-auto space-y-2">
            {EMOJI_CATEGORIES.map((cat) => (
              <div key={cat.name}>
                <span className="text-[10px] uppercase font-semibold text-slate-500 block mb-1">
                  {cat.name}
                </span>
                <div className="grid grid-cols-6 gap-1">
                  {cat.emojis.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => addEmoji(emoji)}
                      className="text-xl p-1 hover:bg-background-surface rounded-lg hover:scale-125 transition-all text-center"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Barra de Entrada Principal */}
      <div className="flex items-end gap-2">
        {/* Botão de Anexo */}
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
          className="p-2.5 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-background-surface transition-colors flex-shrink-0"
          title="Anexar arquivo ou foto"
        >
          {uploading ? <Loader2 className="w-5 h-5 animate-spin text-brand-400" /> : <Paperclip className="w-5 h-5" />}
        </button>

        {/* Botão de Emoji */}
        <button
          type="button"
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          className="p-2.5 rounded-xl text-slate-400 hover:text-yellow-400 hover:bg-background-surface transition-colors flex-shrink-0"
          title="Inserir emoji"
        >
          <Smile className="w-5 h-5" />
        </button>

        {/* Textarea de Mensagem */}
        <div className="flex-1 bg-background-surface/80 rounded-2xl border border-slate-700/70 focus-within:border-brand-500 focus-within:ring-1 focus-within:ring-brand-500 transition-all flex items-center px-3 py-1.5">
          <textarea
            ref={textareaRef}
            rows={1}
            value={content}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Digite sua mensagem... (Enter para enviar)"
            className="w-full bg-transparent text-slate-100 placeholder-slate-500 text-sm resize-none max-h-32 focus:outline-none"
          />
        </div>

        {/* Botão Enviar */}
        <button
          type="button"
          onClick={handleSend}
          disabled={(!content.trim() && attachments.length === 0) || uploading}
          className={`p-3 rounded-2xl transition-all shadow-lg flex-shrink-0 ${
            content.trim() || attachments.length > 0
              ? 'bg-brand-600 hover:bg-brand-500 text-white shadow-brand-500/30 scale-105'
              : 'bg-background-surface text-slate-500 opacity-60 cursor-not-allowed'
          }`}
          title="Enviar mensagem"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
