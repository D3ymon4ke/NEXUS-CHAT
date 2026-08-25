import React, { useState, useEffect } from 'react';
import { useChat } from '../../context/ChatContext';
import { apiRequest } from '../../lib/api';
import { Search, UserPlus, X, MessageSquarePlus, Sparkles } from 'lucide-react';

export function NewChatModal({ isOpen, onClose }) {
  const { startDirectChat } = useChat();
  const [searchTerm, setSearchTerm] = useState('');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setSearchTerm('');
      setUsers([]);
      return;
    }

    // Carregar usuários iniciais
    fetchUsers('');
  }, [isOpen]);

  const fetchUsers = async (query) => {
    try {
      setLoading(true);
      const res = await apiRequest(`/users/search?q=${encodeURIComponent(query || 'a')}`);
      if (res.success && res.users) {
        setUsers(res.users);
      }
    } catch (err) {
      console.error('Erro ao pesquisar usuários:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchTerm(val);
    fetchUsers(val);
  };

  const handleSelectUser = async (targetUser) => {
    await startDirectChat(targetUser);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fadeIn">
      <div className="glass-modal w-full max-w-md rounded-2xl p-6 shadow-2xl border border-slate-700/60 flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-brand-500/20 text-brand-400 flex items-center justify-center border border-brand-500/30">
              <MessageSquarePlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Nova Conversa</h3>
              <p className="text-xs text-slate-400">Encontre alguém pelo nome ou @username</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-background-surface transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Input de Busca */}
        <div className="relative my-4">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            autoFocus
            value={searchTerm}
            onChange={handleSearchChange}
            placeholder="Buscar contatos ou usuários..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-background-surface border border-slate-700/70 text-slate-100 placeholder-slate-500 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all"
          />
        </div>

        {/* Lista de Usuários */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[220px]">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400 text-xs gap-2">
              <div className="w-6 h-6 border-2 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" />
              <span>Buscando contatos...</span>
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs">
              <p>Nenhum usuário encontrado com "{searchTerm}".</p>
            </div>
          ) : (
            users.map((u) => (
              <button
                key={u.id}
                onClick={() => handleSelectUser(u)}
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-background-surface/80 border border-transparent hover:border-slate-700/50 transition-all text-left group"
              >
                <div className="relative">
                  <img
                    src={u.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${u.id}`}
                    alt={u.display_name}
                    className="w-10 h-10 rounded-full object-cover border border-slate-700"
                  />
                  {u.is_online && (
                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-chat-online rounded-full border-2 border-background-card" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm text-slate-200 group-hover:text-brand-300 transition-colors truncate">
                      {u.display_name}
                    </span>
                    <span className="text-[11px] text-slate-400">@{u.username}</span>
                  </div>
                  <p className="text-xs text-slate-400 truncate">{u.bio || 'Disponível'}</p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
