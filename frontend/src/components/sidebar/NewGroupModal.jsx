import React, { useState, useEffect } from 'react';
import { useChat } from '../../context/ChatContext';
import { apiRequest } from '../../lib/api';
import { Users, X, Check, Image as ImageIcon } from 'lucide-react';

export function NewGroupModal({ isOpen, onClose }) {
  const { createGroup } = useChat();
  const [groupName, setGroupName] = useState('');
  const [description, setDescription] = useState('');
  const [availableUsers, setAvailableUsers] = useState([]);
  const [selectedUserIds, setSelectedUserIds] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setGroupName('');
      setDescription('');
      setSelectedUserIds(new Set());
      return;
    }

    async function loadContacts() {
      try {
        setLoading(true);
        const res = await apiRequest('/users/search?q=a');
        if (res.success && res.users) {
          setAvailableUsers(res.users);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    loadContacts();
  }, [isOpen]);

  const toggleUser = (id) => {
    setSelectedUserIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!groupName.trim()) return;

    try {
      setCreating(true);
      await createGroup({
        name: groupName.trim(),
        description: description.trim() || undefined,
        memberIds: Array.from(selectedUserIds)
      });
      onClose();
    } catch (err) {
      console.error('Erro ao criar grupo:', err);
    } finally {
      setCreating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fadeIn">
      <div className="glass-modal w-full max-w-md rounded-2xl p-6 shadow-2xl border border-slate-700/60 flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center border border-purple-500/30">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Criar Novo Grupo</h3>
              <p className="text-xs text-slate-400">Reúna amigos ou sua equipe</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-background-surface transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleCreate} className="flex flex-col flex-1 overflow-hidden mt-4">
          <div className="space-y-3 mb-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Nome do Grupo *</label>
              <input
                type="text"
                required
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="Ex: Squad de Desenvolvimento 🚀"
                className="w-full px-4 py-2.5 rounded-xl bg-background-surface border border-slate-700 text-slate-100 placeholder-slate-500 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Descrição (opcional)</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ex: Assuntos gerais, arquitetura e lançamentos"
                className="w-full px-4 py-2 rounded-xl bg-background-surface border border-slate-700 text-slate-100 placeholder-slate-500 text-sm focus:border-brand-500 transition-all"
              />
            </div>
          </div>

          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-300">Selecionar Participantes</span>
            <span className="text-xs text-brand-400">{selectedUserIds.size} selecionado(s)</span>
          </div>

          {/* Lista de Participantes com Checkbox */}
          <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 min-h-[140px] max-h-[220px]">
            {loading ? (
              <div className="text-center py-6 text-xs text-slate-400">Carregando contatos...</div>
            ) : availableUsers.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-400">Nenhum contato disponível.</div>
            ) : (
              availableUsers.map((u) => {
                const isSelected = selectedUserIds.has(u.id);
                return (
                  <div
                    key={u.id}
                    onClick={() => toggleUser(u.id)}
                    className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-all border ${
                      isSelected
                        ? 'bg-brand-600/20 border-brand-500/50'
                        : 'bg-background-surface/50 border-transparent hover:bg-background-surface'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <img
                        src={u.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${u.id}`}
                        alt={u.display_name}
                        className="w-8 h-8 rounded-full object-cover border border-slate-700"
                      />
                      <div>
                        <span className="text-xs font-semibold text-slate-200 block">{u.display_name}</span>
                        <span className="text-[10px] text-slate-400">@{u.username}</span>
                      </div>
                    </div>
                    <div
                      className={`w-5 h-5 rounded-lg flex items-center justify-center border transition-all ${
                        isSelected
                          ? 'bg-brand-500 border-brand-500 text-white'
                          : 'border-slate-600 bg-background-surface'
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5" />}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-400 hover:text-white hover:bg-background-surface transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={creating || !groupName.trim()}
              className="px-5 py-2 text-xs font-semibold rounded-xl bg-brand-600 hover:bg-brand-500 text-white shadow-lg shadow-brand-500/25 transition-all disabled:opacity-50 flex items-center gap-1.5"
            >
              {creating ? 'Criando...' : 'Criar Grupo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
