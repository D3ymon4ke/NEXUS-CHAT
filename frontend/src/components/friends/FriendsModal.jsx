import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase, isSupabaseConfigured } from '../../lib/supabaseClient';
import { sounds } from '../../lib/sound';
import confetti from 'canvas-confetti';
import {
  Users,
  UserPlus,
  UserCheck,
  UserX,
  Search,
  MessageSquare,
  X,
  Check,
  Clock,
  Sparkles
} from 'lucide-react';

export function FriendsModal({ isOpen, onClose, onStartChat, onOpenProfile }) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('friends'); // 'friends' | 'requests' | 'search'
  const [friendsList, setFriendsList] = useState([]);
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !user) return;
    loadFriendsData();

    if (isSupabaseConfigured && supabase) {
      const channel = supabase
        .channel('friends_modal_realtime')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'profiles' },
          (payload) => {
            if (payload.new) {
              setFriendsList((prev) =>
                prev.map((f) => (f.id === payload.new.id ? { ...f, ...payload.new } : f))
              );
              setAllUsers((prev) =>
                prev.map((u) => (u.id === payload.new.id ? { ...u, ...payload.new } : u))
              );
            }
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'friendships' },
          () => {
            loadFriendsData();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [isOpen, user?.id]);

  const loadFriendsData = async () => {
    if (!isSupabaseConfigured || !supabase || !user) return;
    try {
      setLoading(true);

      const [
        { data: accepted },
        { data: requests },
        { data: usersData }
      ] = await Promise.all([
        supabase
          .from('friendships')
          .select('user_id, friend_id, status')
          .eq('status', 'accepted')
          .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`),
        supabase
          .from('friendships')
          .select('*, requester:profiles!friendships_user_id_fkey(*)')
          .eq('friend_id', user.id)
          .eq('status', 'pending'),
        supabase
          .from('profiles')
          .select('*')
          .neq('id', user.id)
          .order('display_name', { ascending: true })
          .limit(100)
      ]);

      if (accepted && accepted.length > 0) {
        const friendIds = accepted
          .map((f) => (f.user_id === user.id ? f.friend_id : f.user_id))
          .filter(Boolean);

        if (friendIds.length > 0) {
          const { data: freshProfiles } = await supabase
            .from('profiles')
            .select('*')
            .in('id', friendIds)
            .order('display_name', { ascending: true });

          setFriendsList(freshProfiles || []);
        } else {
          setFriendsList([]);
        }
      } else {
        setFriendsList([]);
      }

      if (requests) {
        setIncomingRequests(requests);
      }

      if (usersData) {
        setAllUsers(usersData);
      }
    } catch (err) {
      console.error('Erro ao carregar amigos:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptRequest = async (requestId) => {
    if (!isSupabaseConfigured || !supabase) return;
    try {
      await supabase
        .from('friendships')
        .update({ status: 'accepted', updated_at: new Date().toISOString() })
        .eq('id', requestId);

      sounds.playPop();
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
      loadFriendsData();
    } catch (err) {
      console.error('Erro ao aceitar pedido:', err);
    }
  };

  const handleDeclineRequest = async (requestId) => {
    if (!isSupabaseConfigured || !supabase) return;
    try {
      await supabase.from('friendships').delete().eq('id', requestId);
      loadFriendsData();
    } catch (err) {
      console.error('Erro ao recusar pedido:', err);
    }
  };

  const handleSendRequest = async (targetUserId) => {
    if (!isSupabaseConfigured || !supabase || !user) return;
    try {
      await supabase.from('friendships').insert({
        user_id: user.id,
        friend_id: targetUserId,
        status: 'pending'
      });

      sounds.playPop();
      loadFriendsData();
    } catch (err) {
      console.error('Erro ao enviar pedido:', err);
    }
  };

  if (!isOpen || !user) return null;

  const filteredUsers = allUsers.filter(
    (u) =>
      (u.display_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.username || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn select-none">
      <div className="glass-modal w-full max-w-md rounded-3xl p-6 shadow-2xl border border-slate-700/80 flex flex-col max-h-[85vh] relative overflow-hidden">
        {/* Glow */}
        <div className="absolute -top-20 -right-20 w-48 h-48 bg-brand-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-48 h-48 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Topbar */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-brand-500/20 text-brand-400 flex items-center justify-center border border-brand-500/30">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white">Central de Amigos</h2>
              <p className="text-[11px] text-slate-400">Conecte-se com outros membros do Nexus</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-background-surface transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Abas */}
        <div className="flex bg-background-surface/80 p-1 rounded-2xl border border-slate-800 my-3.5">
          <button
            onClick={() => setActiveTab('friends')}
            className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition-all ${
              activeTab === 'friends' ? 'bg-brand-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Amigos ({friendsList.length})
          </button>
          <button
            onClick={() => setActiveTab('requests')}
            className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition-all relative ${
              activeTab === 'requests' ? 'bg-brand-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Pedidos ({incomingRequests.length})
            {incomingRequests.length > 0 && (
              <span className="w-2 h-2 rounded-full bg-rose-500 absolute top-1.5 right-2 animate-ping" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('search')}
            className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition-all ${
              activeTab === 'search' ? 'bg-brand-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Adicionar (+)
          </button>
        </div>

        {/* Conteúdo das Abas */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-2.5 min-h-[220px]">
          {/* ABA 1: AMIGOS ACEITOS */}
          {activeTab === 'friends' && (
            friendsList.length === 0 ? (
              <div className="text-center py-10 text-xs text-slate-400 space-y-2">
                <Users className="w-10 h-10 text-slate-600 mx-auto" />
                <p className="font-semibold text-slate-300">Você ainda não tem amigos adicionados</p>
                <p className="text-slate-500">Vá na aba "Adicionar" para encontrar novos membros!</p>
              </div>
            ) : (
              friendsList.map((f) => (
                <div
                  key={f.id}
                  className="p-3 rounded-2xl bg-background-surface/80 border border-slate-800 flex items-center justify-between hover:border-slate-700 transition-all"
                >
                  <div
                    onClick={() => onOpenProfile && onOpenProfile(f)}
                    className="flex items-center gap-3 min-w-0 cursor-pointer"
                  >
                    <img
                      src={f.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${f.id}`}
                      alt={f.display_name}
                      className="w-10 h-10 rounded-xl object-cover border border-slate-700"
                    />
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-white block truncate">{f.display_name || f.username}</span>
                      <span className="text-[10px] text-slate-400">@{f.username}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      onClose();
                      if (onStartChat) onStartChat(f);
                    }}
                    className="p-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold shadow"
                    title="Conversar"
                  >
                    <MessageSquare className="w-4 h-4" />
                  </button>
                </div>
              ))
            )
          )}

          {/* ABA 2: PEDIDOS RECEBIDOS */}
          {activeTab === 'requests' && (
            incomingRequests.length === 0 ? (
              <div className="text-center py-10 text-xs text-slate-400">
                Nenhum pedido de amizade pendente.
              </div>
            ) : (
              incomingRequests.map((req) => (
                <div
                  key={req.id}
                  className="p-3 rounded-2xl bg-background-surface/90 border border-amber-500/30 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={req.requester?.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${req.requester?.id}`}
                      alt="avatar"
                      className="w-10 h-10 rounded-xl object-cover"
                    />
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-white block truncate">
                        {req.requester?.display_name || req.requester?.username}
                      </span>
                      <span className="text-[10px] text-amber-400">Quer ser seu amigo</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleAcceptRequest(req.id)}
                      className="p-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white"
                      title="Aceitar"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeclineRequest(req.id)}
                      className="p-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white"
                      title="Recusar"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )
          )}

          {/* ABA 3: BUSCAR MEMBROS PARA ADICIONAR */}
          {activeTab === 'search' && (
            <div className="space-y-3">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Pesquisar membros..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-background-dark border border-slate-700 text-xs text-white placeholder-slate-500 focus:border-brand-500 focus:outline-none"
                />
              </div>

              <div className="space-y-2">
                {filteredUsers.map((u) => {
                  const isFriend = friendsList.some((f) => f.id === u.id);
                  return (
                    <div
                      key={u.id}
                      className="p-3 rounded-2xl bg-background-surface/80 border border-slate-800 flex items-center justify-between"
                    >
                      <div
                        onClick={() => onOpenProfile && onOpenProfile(u)}
                        className="flex items-center gap-3 min-w-0 cursor-pointer"
                      >
                        <img
                          src={u.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${u.id}`}
                          alt="avatar"
                          className="w-9 h-9 rounded-xl object-cover"
                        />
                        <div className="min-w-0">
                          <span className="text-xs font-bold text-white block truncate">{u.display_name || u.username}</span>
                          <span className="text-[10px] text-slate-400">@{u.username}</span>
                        </div>
                      </div>

                      {isFriend ? (
                        <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                          <UserCheck className="w-3.5 h-3.5" /> Amigo
                        </span>
                      ) : (
                        <button
                          onClick={() => handleSendRequest(u.id)}
                          className="px-3 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold flex items-center gap-1 shadow"
                        >
                          <UserPlus className="w-3.5 h-3.5" /> Adicionar
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
