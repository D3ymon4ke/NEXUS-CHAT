import React, { useState, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getFrameAsset, getFrameStyle } from '../../lib/shopCatalog';
import {
  Users,
  ArrowLeftRight,
  UserPlus,
  LogOut,
  X,
  Check,
  Trash2,
  Shield,
  Search,
  Sparkles,
  ChevronRight,
  Crown
} from 'lucide-react';
import { sounds } from '../../lib/sound';
import { haptics } from '../../lib/haptics';

const NAME_STYLES = {
  name_rainbow_glow: 'bg-gradient-to-r from-red-400 via-amber-300 via-green-300 to-sky-400 bg-clip-text text-transparent font-extrabold',
  name_golden_glow: 'text-amber-300 font-extrabold drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]',
  name_electric_cyan: 'text-cyan-400 font-extrabold drop-shadow-[0_0_8px_rgba(34,211,238,0.6)]'
};

export function AccountSwitcherModal({ isOpen, onClose, onOpenNewLogin }) {
  const {
    user,
    savedAccounts = [],
    switchToAccount,
    removeSavedAccount,
    logout,
    isAdmin,
    allProfiles = [],
    impersonateUser
  } = useAuth();

  const [searchTerm, setSearchTerm] = useState('');
  const [showGhostSearch, setShowGhostSearch] = useState(false);
  const [ghostFilter, setGhostFilter] = useState('');

  if (!isOpen) return null;

  // Contas salvas exceto a que está ativa no momento
  const otherSavedAccounts = savedAccounts.filter((a) => a && a.id !== user?.id);

  // Perfis da plataforma para o Modo Fantasma do Admin
  const filteredGhostProfiles = (allProfiles || [])
    .filter((p) => {
      if (!p || p.id === user?.id) return false;
      if (!ghostFilter.trim()) return true;
      const term = ghostFilter.toLowerCase().trim();
      return (
        (p.display_name || '').toLowerCase().includes(term) ||
        (p.username || '').toLowerCase().includes(term) ||
        (p.email || '').toLowerCase().includes(term)
      );
    })
    .slice(0, 15);

  const handleSelectAccount = async (target) => {
    sounds.playPop();
    haptics.success();
    await switchToAccount(target);
    onClose();
  };

  const handleRemoveAccount = (e, accId) => {
    e.stopPropagation();
    haptics.heavy();
    removeSavedAccount(accId);
  };

  const handleAddAccount = () => {
    sounds.playPop();
    haptics.selection();
    onClose();
    if (onOpenNewLogin) {
      onOpenNewLogin();
    }
  };

  const handleLogoutCurrent = async () => {
    sounds.playPop();
    haptics.selection();
    onClose();
    await logout();
  };

  const activeFrameAsset = getFrameAsset(user?.equipped_frame);
  const activeFrameStyle = getFrameStyle(user?.equipped_frame) || (!activeFrameAsset ? 'border border-slate-700' : '');
  const activeNameStyle = NAME_STYLES[user?.equipped_name_color] || 'text-white font-bold';

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-md animate-fadeIn select-none p-0 sm:p-4">
      <div
        className="w-full sm:max-w-md bg-slate-900/95 border-t sm:border border-slate-800/90 rounded-t-[2.5rem] sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92dvh] sm:max-h-[85vh] relative backdrop-blur-2xl animate-slideUp sm:animate-scaleIn"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Barra superior de puxar (Mobile Handle) */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-12 h-1.5 rounded-full bg-slate-700/80" />
        </div>

        {/* Glows Decorativos */}
        <div className="absolute -top-14 -right-14 w-44 h-44 bg-brand-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-14 -left-14 w-44 h-44 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />

        {/* Header do Modal */}
        <div className="p-4 sm:p-5 border-b border-slate-800/80 flex items-center justify-between relative z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-brand-500/20">
              <ArrowLeftRight className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-extrabold text-white flex items-center gap-1.5">
                <span>Alternar Conta</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand-500/20 text-brand-300 font-bold border border-brand-500/30">
                  {savedAccounts.length} {savedAccounts.length === 1 ? 'salva' : 'salvas'}
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">Troca instantânea de usuário com 1 toque</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-800 border border-slate-700/50 transition active:scale-95"
            title="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Conteúdo Rolável */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 relative z-10 overscroll-contain">
          {/* 1. CONTA ATUALMENTE CONECTADA */}
          <div>
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-2">
              Conectado Agora
            </span>

            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-brand-950/50 via-slate-800/60 to-indigo-950/40 border border-brand-500/40 shadow-lg flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="relative flex-shrink-0">
                  <img
                    src={user?.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${user?.id}`}
                    alt={user?.display_name}
                    className={`w-12 h-12 rounded-full object-cover shadow ${activeFrameStyle}`}
                  />
                  {activeFrameAsset && (
                    <img
                      src={activeFrameAsset}
                      alt="Moldura"
                      className="absolute -inset-[22%] w-[144%] h-[144%] max-w-none pointer-events-none object-contain z-10 select-none drop-shadow"
                    />
                  )}
                  <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-slate-900 ring-2 ring-emerald-500/30" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className={`text-sm font-extrabold truncate ${activeNameStyle}`}>
                      {user?.display_name || user?.username || 'Minha Conta'}
                    </span>
                    {isAdmin && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-red-500/20 text-red-400 font-extrabold border border-red-500/30">
                        ADMIN
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-slate-400 block truncate">@{user?.username || 'usuario'}</span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 flex-shrink-0">
                <span className="text-[10px] px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30 flex items-center gap-1">
                  <Check className="w-3 h-3" /> Ativa
                </span>
              </div>
            </div>
          </div>

          {/* 2. OUTRAS CONTAS SALVAS NO APARELHO */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                Contas Salvas neste Aparelho
              </span>
              <span className="text-[10px] text-slate-500">Toque para entrar instantaneamente</span>
            </div>

            {otherSavedAccounts.length === 0 ? (
              <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800 text-center text-xs text-slate-400 space-y-1">
                <p className="font-semibold text-slate-300">Nenhuma outra conta salva</p>
                <p className="text-[11px] text-slate-500">
                  Adicione outra conta para alternar com 1 toque a qualquer momento.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {otherSavedAccounts.map((acc) => {
                  const frameAsset = getFrameAsset(acc.equipped_frame);
                  const frameStyle = getFrameStyle(acc.equipped_frame) || (!frameAsset ? 'border border-slate-700' : '');
                  const nameStyle = NAME_STYLES[acc.equipped_name_color] || 'text-white font-bold';
                  const isAccAdmin = acc.role === 'admin' || acc.username?.toLowerCase() === 'damon';

                  return (
                    <div
                      key={acc.id}
                      onClick={() => handleSelectAccount(acc)}
                      className="w-full p-3 rounded-2xl bg-background-surface/80 hover:bg-background-surface border border-slate-800/90 hover:border-brand-500/50 flex items-center justify-between gap-3 transition-all cursor-pointer group active:scale-[0.99] shadow-sm"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="relative flex-shrink-0">
                          <img
                            src={acc.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${acc.id}`}
                            alt={acc.display_name}
                            className={`w-10 h-10 rounded-full object-cover shadow ${frameStyle}`}
                          />
                          {frameAsset && (
                            <img
                              src={frameAsset}
                              alt="Moldura"
                              className="absolute -inset-[22%] w-[144%] h-[144%] max-w-none pointer-events-none object-contain z-10 select-none drop-shadow"
                            />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className={`text-xs sm:text-sm truncate group-hover:text-brand-300 transition-colors ${nameStyle}`}>
                              {acc.display_name || acc.username}
                            </span>
                            {isAccAdmin && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-red-500/20 text-red-400 font-extrabold border border-red-500/30">
                                ADMIN
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-slate-400 block truncate">@{acc.username}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => handleSelectAccount(acc)}
                          className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white font-extrabold text-xs shadow-md shadow-brand-500/20 active:scale-95 transition-all flex items-center gap-1"
                        >
                          <span>Entrar</span>
                          <span className="text-amber-300">⚡</span>
                        </button>

                        <button
                          type="button"
                          onClick={(e) => handleRemoveAccount(e, acc.id)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800/80 transition"
                          title="Remover conta salva deste dispositivo"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 3. MODO FANTASMA DO ADMIN (Visível para o Damon / Admin) */}
          {isAdmin && (
            <div className="pt-2 border-t border-slate-800/80">
              <button
                type="button"
                onClick={() => setShowGhostSearch(!showGhostSearch)}
                className="w-full flex items-center justify-between p-3 rounded-2xl bg-purple-950/40 hover:bg-purple-950/60 border border-purple-500/40 text-purple-200 text-xs font-bold transition shadow-sm"
              >
                <div className="flex items-center gap-2">
                  <span className="text-base">🎭</span>
                  <span>Modo Fantasma • Personificar Qualquer Usuário</span>
                </div>
                <ChevronRight className={`w-4 h-4 transition-transform ${showGhostSearch ? 'rotate-90' : ''}`} />
              </button>

              {showGhostSearch && (
                <div className="mt-2.5 p-3 rounded-2xl bg-slate-950/80 border border-purple-500/30 space-y-2.5 animate-fadeIn">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={ghostFilter}
                      onChange={(e) => setGhostFilter(e.target.value)}
                      placeholder="Pesquisar membro da plataforma..."
                      className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-400"
                    />
                  </div>

                  <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                    {filteredGhostProfiles.map((p) => (
                      <div
                        key={p.id}
                        onClick={async () => {
                          sounds.playReceive();
                          haptics.heavy();
                          await impersonateUser(p);
                          onClose();
                        }}
                        className="p-2 rounded-xl bg-slate-900/60 hover:bg-purple-900/30 border border-slate-800 hover:border-purple-500/50 flex items-center justify-between gap-2 cursor-pointer transition text-xs"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <img
                            src={p.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${p.id}`}
                            alt=""
                            className="w-7 h-7 rounded-full object-cover border border-slate-700"
                          />
                          <div className="min-w-0">
                            <span className="font-bold text-white block truncate">{p.display_name || p.username}</span>
                            <span className="text-[10px] text-slate-400 block truncate">@{p.username}</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          className="px-2 py-1 rounded-lg bg-purple-600/30 text-purple-200 border border-purple-500/40 text-[10px] font-extrabold hover:bg-purple-600 hover:text-white transition"
                        >
                          Entrar ⚡
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer com Botões de Ação */}
        <div className="p-4 sm:p-5 border-t border-slate-800/80 bg-slate-950/60 space-y-2 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {/* Adicionar Outra Conta */}
          <button
            type="button"
            onClick={handleAddAccount}
            className="w-full py-3 rounded-2xl bg-gradient-to-r from-brand-600 via-indigo-600 to-purple-600 hover:from-brand-500 text-white font-extrabold text-xs shadow-lg shadow-brand-500/20 flex items-center justify-center gap-2 active:scale-98 transition-all"
          >
            <UserPlus className="w-4 h-4" />
            <span>Adicionar / Entrar com Outra Conta</span>
          </button>

          {/* Sair da Conta Atual */}
          <button
            type="button"
            onClick={handleLogoutCurrent}
            className="w-full py-2.5 rounded-2xl bg-slate-800/50 hover:bg-rose-500/15 border border-slate-700/60 hover:border-rose-500/40 text-slate-300 hover:text-rose-300 font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-98"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Desconectar da Conta Atual</span>
          </button>
        </div>
      </div>
    </div>
  );
}
