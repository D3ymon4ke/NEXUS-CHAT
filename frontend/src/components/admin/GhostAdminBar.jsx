import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Ghost, Users, ArrowRightLeft, LogOut, ChevronDown, Check } from 'lucide-react';
import { sounds } from '../../lib/sound';

export function GhostAdminBar() {
  const {
    user,
    realAdminUser,
    isImpersonating,
    impersonateUser,
    stopImpersonating,
    allProfiles
  } = useAuth();

  const [isOpenSwitcher, setIsOpenSwitcher] = useState(false);

  if (!isImpersonating || !user) return null;

  const handleSwitch = (profile) => {
    sounds.playPop();
    setIsOpenSwitcher(false);
    impersonateUser(profile);
  };

  const handleExit = () => {
    sounds.playPop();
    setIsOpenSwitcher(false);
    stopImpersonating();
  };

  return (
    <div className="fixed top-2 sm:top-3 left-1/2 -translate-x-1/2 z-[9999] w-[95%] max-w-2xl select-none animate-slideDown pointer-events-auto">
      <div className="relative rounded-2xl bg-gradient-to-r from-purple-950/95 via-slate-900/95 to-indigo-950/95 border border-purple-500/70 shadow-[0_10px_35px_rgba(168,85,247,0.35)] backdrop-blur-xl p-2 sm:p-2.5 flex items-center justify-between gap-2 sm:gap-3 ring-1 ring-purple-400/40">
        {/* Lado Esquerdo: Tag Modo Fantasma & Perfil Ativo */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-purple-500/20 text-purple-300 flex items-center justify-center border border-purple-500/50 flex-shrink-0 relative">
            <Ghost className="w-4 h-4 text-purple-300 animate-pulse" />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-purple-400 animate-ping" />
          </div>

          <div className="min-w-0 flex-1 flex flex-col sm:flex-row sm:items-center sm:gap-2">
            <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-purple-300 flex items-center gap-1">
              <span>🎭 Modo Fantasma</span>
              <span className="hidden sm:inline text-purple-500">•</span>
            </span>

            <div className="flex items-center gap-1.5 min-w-0">
              <img
                src={user.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.id}`}
                alt="Avatar"
                className="w-4 h-4 sm:w-5 sm:h-5 rounded-full object-cover border border-purple-400 flex-shrink-0"
              />
              <span className="text-xs font-bold text-white truncate max-w-[110px] sm:max-w-[150px]">
                {user.display_name || user.username}
              </span>
              <span className="text-[10px] text-purple-300/80 truncate hidden xs:inline">
                (@{user.username})
              </span>
            </div>
          </div>
        </div>

        {/* Lado Direito: Alternador Rápido de Contas & Botão Sair */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
          {/* Dropdown de Troca de Conta */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsOpenSwitcher((prev) => !prev)}
              className="px-2 sm:px-3 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-700/90 text-purple-200 border border-purple-500/40 text-[11px] font-extrabold flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
              title="Trocar para outra conta instantaneamente"
            >
              <ArrowRightLeft className="w-3 h-3 text-purple-400" />
              <span className="hidden sm:inline">Trocar Conta</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {isOpenSwitcher && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsOpenSwitcher(false)}
                />
                <div className="absolute right-0 top-full mt-2 w-64 max-h-80 overflow-y-auto rounded-2xl bg-slate-900 border border-purple-500/50 shadow-2xl p-1.5 z-50 space-y-1 backdrop-blur-2xl animate-fadeIn">
                  <div className="px-2.5 py-1.5 text-[10px] font-extrabold text-purple-300 uppercase tracking-wider border-b border-slate-800 flex items-center justify-between">
                    <span>👑 Alternar Identidade</span>
                    <span className="text-[9px] text-slate-400">Total: {allProfiles?.length || 0}</span>
                  </div>

                  {/* Opção Voltar ao Admin Damon */}
                  {realAdminUser && (
                    <button
                      type="button"
                      onClick={handleExit}
                      className="w-full p-2 rounded-xl text-left flex items-center justify-between gap-2 transition hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <img
                          src={realAdminUser.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${realAdminUser.id}`}
                          alt="Admin"
                          className="w-6 h-6 rounded-full object-cover border border-rose-400"
                        />
                        <div className="min-w-0">
                          <div className="truncate text-white font-bold">{realAdminUser.display_name || realAdminUser.username} (Admin)</div>
                          <div className="text-[9px] text-rose-400">Restaurar conta original</div>
                        </div>
                      </div>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-rose-500/30 text-rose-200 uppercase font-extrabold">
                        Admin
                      </span>
                    </button>
                  )}

                  <div className="pt-1 px-2 text-[9px] font-bold text-slate-500 uppercase">
                    Outros Usuários Cadastrados:
                  </div>

                  {allProfiles
                    .filter((p) => p.id !== realAdminUser?.id)
                    .map((p) => {
                      const isCurrent = p.id === user.id;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => handleSwitch(p)}
                          className={`w-full p-2 rounded-xl text-left flex items-center justify-between gap-2 transition ${
                            isCurrent
                              ? 'bg-purple-600/30 border border-purple-500 text-white font-bold'
                              : 'hover:bg-slate-800 text-slate-200 border border-transparent'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <img
                              src={p.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${p.id}`}
                              alt="Avatar"
                              className="w-6 h-6 rounded-full object-cover border border-slate-700"
                            />
                            <div className="min-w-0">
                              <div className="truncate text-xs font-semibold">{p.display_name || p.username}</div>
                              <div className="text-[10px] text-slate-400 truncate">@{p.username}</div>
                            </div>
                          </div>
                          {isCurrent && <Check className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />}
                        </button>
                      );
                    })}
                </div>
              </>
            )}
          </div>

          {/* Botão Sair do Modo Fantasma */}
          <button
            type="button"
            onClick={handleExit}
            className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-rose-600/25 hover:bg-rose-600/40 text-rose-200 border border-rose-500/50 text-[11px] font-extrabold flex items-center gap-1 transition-all shadow-sm active:scale-95"
            title="Sair do Modo Fantasma e voltar ao Damon"
          >
            <LogOut className="w-3 h-3 text-rose-300" />
            <span className="hidden xs:inline">Voltar ao Admin</span>
          </button>
        </div>
      </div>
    </div>
  );
}
