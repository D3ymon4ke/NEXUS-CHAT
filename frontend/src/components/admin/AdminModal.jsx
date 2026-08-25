import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useChat } from '../../context/ChatContext';
import { apiRequest } from '../../lib/api';
import { supabase, isSupabaseConfigured } from '../../lib/supabaseClient';
import { SHOP_CATALOG } from '../../lib/shopCatalog';
import { sounds } from '../../lib/sound';
import confetti from 'canvas-confetti';
import {
  ShieldAlert,
  Users,
  Coins,
  Radio,
  Search,
  CheckCircle,
  AlertTriangle,
  UserX,
  UserCheck,
  PlusCircle,
  X,
  Activity,
  Send,
  MessageSquare,
  Sparkles,
  Trash2,
  ShoppingBag,
  Plus,
  Layers,
  Image as ImageIcon,
  Palette,
  Shield,
  Check
} from 'lucide-react';

const BELMONT_ID = '00000000-0000-0000-0000-000000000001';

export function AdminModal({ isOpen, onClose }) {
  const { user } = useAuth();
  const { loadConversations } = useChat();

  const [activeTab, setActiveTab] = useState('stats'); // 'stats' | 'users' | 'cleanup' | 'shop' | 'broadcast'
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [shopItems, setShopItems] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState({ text: '', type: '' });

  // Substate Conceder Moedas
  const [selectedUserForCoins, setSelectedUserForCoins] = useState(null);
  const [customCoinsAmount, setCustomCoinsAmount] = useState('100');

  // Substate Transmissão
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');

  // Substate Criar Item na Loja
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState('frames');
  const [newItemDesc, setNewItemDesc] = useState('');
  const [newItemPrice, setNewItemPrice] = useState(200);
  const [newItemIcon, setNewItemIcon] = useState('✨');
  const [newItemCss, setNewItemCss] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    loadAdminData();
    loadShopItems();
  }, [isOpen]);

  const loadAdminData = async () => {
    try {
      setLoading(true);
      if (isSupabaseConfigured && supabase) {
        const [
          { count: userCount, data: usersList },
          { count: messageCount },
          { data: profilesCoins }
        ] = await Promise.all([
          supabase.from('profiles').select('*', { count: 'exact' }),
          supabase.from('messages').select('*', { count: 'exact', head: true }),
          supabase.from('profiles').select('nexus_coins')
        ]);

        const totalCoins = (profilesCoins || []).reduce((s, p) => s + (p.nexus_coins || 0), 0);

        setStats({
          totalUsers: userCount || 0,
          totalMessages: messageCount || 0,
          totalCoinsInEconomy: totalCoins,
          activeConversations: 1,
          serverUptime: '99.9%',
          vpsStatus: 'ONLINE (VPS Belmont Core)'
        });

        setUsers(usersList || []);
      }
    } catch (err) {
      console.error('Erro ao carregar dados admin:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadShopItems = async () => {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data } = await supabase.from('shop_items').select('*').order('created_at', { ascending: false });
        setShopItems(data || []);
      } catch (err) {
        console.error('Erro ao carregar itens da loja:', err);
      }
    }
  };

  // 1. Limpeza de Mensagens
  const handleClearBelmontChat = async () => {
    if (!window.confirm('Tem certeza que deseja apagar TODAS as mensagens da sala BELMONT CONFERENCE?')) return;

    try {
      setActionLoading(true);
      if (isSupabaseConfigured && supabase) {
        await supabase.from('messages').delete().eq('conversation_id', BELMONT_ID);
      }

      sounds.playPop();
      setFeedback({ text: 'Todas as mensagens da Belmont Conference foram limpas com sucesso!', type: 'success' });
      loadAdminData();
      if (loadConversations) loadConversations();
    } catch (err) {
      setFeedback({ text: 'Erro ao limpar mensagens da Belmont Conference.', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleClearAllMessages = async () => {
    if (!window.confirm('ATENÇÃO: Deseja apagar o histórico de TODAS as mensagens de todos os chats?')) return;

    try {
      setActionLoading(true);
      if (isSupabaseConfigured && supabase) {
        await supabase.from('messages').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      }

      sounds.playPop();
      setFeedback({ text: 'Histórico global de mensagens reiniciado com sucesso!', type: 'success' });
      loadAdminData();
      if (loadConversations) loadConversations();
    } catch (err) {
      setFeedback({ text: 'Erro ao realizar limpeza geral.', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  // 2. Conceder Moedas
  const handleGiveCoins = async (targetUserId, amount) => {
    try {
      setActionLoading(true);
      const parsedAmount = parseInt(amount, 10);
      if (isNaN(parsedAmount) || parsedAmount <= 0) return;

      if (isSupabaseConfigured && supabase) {
        const { data: targetProfile } = await supabase.from('profiles').select('nexus_coins, username').eq('id', targetUserId).single();
        const newBalance = (targetProfile?.nexus_coins || 0) + parsedAmount;

        await supabase.from('profiles').update({ nexus_coins: newBalance }).eq('id', targetUserId);
        await supabase.from('nexus_transactions').insert({
          user_id: targetUserId,
          amount: parsedAmount,
          type: 'admin_grant',
          description: `Concedido por Admin Damon (+${parsedAmount} Nexus Coins)`
        });
      }

      sounds.playPop();
      confetti({ particleCount: 50, spread: 50, origin: { y: 0.6 } });
      setFeedback({ text: `+${parsedAmount} Nexus Coins concedidas com sucesso!`, type: 'success' });
      setSelectedUserForCoins(null);
      loadAdminData();
    } catch (err) {
      setFeedback({ text: 'Erro ao conceder moedas.', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  // 3. Cadastrar Novo Item na Loja
  const handleCreateShopItem = async (e) => {
    e.preventDefault();
    if (!newItemName.trim()) return;

    try {
      setActionLoading(true);
      const id = `item_${Date.now()}`;

      if (isSupabaseConfigured && supabase) {
        await supabase.from('shop_items').insert({
          id,
          name: newItemName,
          category: newItemCategory,
          description: newItemDesc || 'Item oficial da Loja Nexus',
          price: parseInt(newItemPrice, 10) || 100,
          icon: newItemIcon || '✨',
          css_class: newItemCss || 'border-2 border-amber-400 shadow-md',
          is_active: true
        });
      }

      sounds.playPop();
      confetti({ particleCount: 60, spread: 60, origin: { y: 0.6 } });
      setFeedback({ text: `Item "${newItemName}" adicionado à Loja Nexus com sucesso!`, type: 'success' });

      setNewItemName('');
      setNewItemDesc('');
      setNewItemPrice(200);
      setNewItemCss('');
      loadShopItems();
    } catch (err) {
      setFeedback({ text: 'Erro ao criar item na loja.', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteShopItem = async (itemId) => {
    if (!window.confirm('Deseja excluir este item da loja?')) return;
    try {
      if (isSupabaseConfigured && supabase) {
        await supabase.from('shop_items').delete().eq('id', itemId);
      }
      setFeedback({ text: 'Item removido da loja.', type: 'success' });
      loadShopItems();
    } catch (err) {
      setFeedback({ text: 'Erro ao excluir item.', type: 'error' });
    }
  };

  // 4. Transmissão Oficial
  const handleSendBroadcast = async (e) => {
    e.preventDefault();
    if (!broadcastMessage.trim()) return;

    try {
      setActionLoading(true);
      const broadcastContent = `📢 **COMUNICADO OFICIAL DAMON**\n\n${broadcastTitle ? `### ${broadcastTitle}\n` : ''}${broadcastMessage}`;

      if (isSupabaseConfigured && supabase && user) {
        await supabase.from('messages').insert({
          conversation_id: BELMONT_ID,
          sender_id: user.id,
          content: broadcastContent,
          type: 'text'
        });
      }

      sounds.playPop();
      confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
      setFeedback({ text: 'Transmissão oficial enviada para a Belmont Conference!', type: 'success' });
      setBroadcastTitle('');
      setBroadcastMessage('');
    } catch (err) {
      setFeedback({ text: 'Erro ao enviar transmissão.', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  if (!isOpen) return null;

  const filteredUsers = users.filter(u =>
    (u.display_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.username || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.email || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn select-none">
      <div className="glass-modal w-full max-w-3xl rounded-3xl p-6 shadow-2xl border border-rose-500/40 flex flex-col max-h-[90vh] overflow-hidden relative">
        {/* Glow de Fundo */}
        <div className="absolute -top-24 -right-24 w-60 h-60 bg-rose-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-60 h-60 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Topbar */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-rose-600 to-red-800 text-white flex items-center justify-center shadow-lg shadow-rose-500/25 border border-rose-400/50">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-extrabold text-white">PAINEL SUPREMO DE ADMINISTRAÇÃO</h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 font-extrabold uppercase">
                  Damon Access
                </span>
              </div>
              <p className="text-xs text-slate-400">Controle total de usuários, limpeza de chats e gerenciamento da Loja</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-background-surface transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback Alert */}
        {feedback.text && (
          <div
            className={`my-3 p-3 rounded-2xl text-xs font-semibold flex items-center justify-between animate-fadeIn ${
              feedback.type === 'success'
                ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
                : 'bg-rose-500/15 border border-rose-500/30 text-rose-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <span>{feedback.type === 'success' ? '✨' : '⚠️'}</span>
              <span>{feedback.text}</span>
            </div>
            <button onClick={() => setFeedback({ text: '', type: '' })} className="opacity-75 hover:opacity-100">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Abas do Painel */}
        <div className="flex bg-background-surface/80 p-1 rounded-2xl border border-slate-800 my-3 overflow-x-auto">
          {[
            { id: 'stats', label: 'Estatísticas', icon: Activity },
            { id: 'users', label: 'Usuários & Coins', icon: Users },
            { id: 'cleanup', label: '🧹 Limpeza de Chat', icon: Trash2 },
            { id: 'shop', label: '🛍️ Gerenciar Loja', icon: ShoppingBag },
            { id: 'broadcast', label: 'Transmissão Belmont', icon: Radio }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setFeedback({ text: '', type: '' });
                }}
                className={`flex-1 min-w-[120px] py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                  isActive
                    ? 'bg-gradient-to-r from-rose-600 to-red-700 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* CONTEÚDO DAS ABAS */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-4 min-h-[280px]">
          {/* ABA 1: ESTATÍSTICAS */}
          {activeTab === 'stats' && stats && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
                  <div className="text-xs text-slate-400 mb-1 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-brand-400" /> Total de Usuários
                  </div>
                  <div className="text-2xl font-extrabold text-white">{stats.totalUsers}</div>
                </div>
                <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
                  <div className="text-xs text-slate-400 mb-1 flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-cyan-400" /> Mensagens Trocadas
                  </div>
                  <div className="text-2xl font-extrabold text-white">{stats.totalMessages}</div>
                </div>
                <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
                  <div className="text-xs text-slate-400 mb-1 flex items-center gap-1.5">
                    <Coins className="w-3.5 h-3.5 text-amber-400" /> Moedas em Circulação
                  </div>
                  <div className="text-2xl font-extrabold text-amber-300">{stats.totalCoinsInEconomy}</div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 to-emerald-950/30 border border-emerald-500/30 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle className="w-4 h-4" /> Servidor & VPS Conectados
                  </div>
                  <div className="text-xs text-slate-300 mt-1">{stats.vpsStatus}</div>
                </div>
                <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold">
                  Uptime: {stats.serverUptime}
                </span>
              </div>
            </div>
          )}

          {/* ABA 2: USUÁRIOS & CONCEDER MOEDAS */}
          {activeTab === 'users' && (
            <div className="space-y-3">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar usuário por nome ou username..."
                  className="w-full pl-9 pr-4 py-2 rounded-xl bg-background-dark border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {filteredUsers.map((u) => (
                  <div
                    key={u.id}
                    className="p-3 rounded-2xl bg-background-surface/80 border border-slate-800 flex items-center justify-between hover:border-slate-700 transition-all"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={u.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${u.id}`}
                        alt="avatar"
                        className="w-9 h-9 rounded-xl object-cover border border-slate-700"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white truncate">{u.display_name || u.username}</span>
                          <span className="text-[10px] text-slate-400">@{u.username}</span>
                          {u.username === 'damon' && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold">
                              👑 ADMIN
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] text-amber-300 font-semibold mt-0.5">
                          <img src="/nexus-coin.jpg" alt="Moeda" className="w-3.5 h-3.5 rounded-full" />
                          <span>{u.nexus_coins || 0} Coins</span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => setSelectedUserForCoins(u)}
                      className="px-3 py-1.5 rounded-xl bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/40 text-xs font-bold flex items-center gap-1 transition-all"
                    >
                      <PlusCircle className="w-3.5 h-3.5" /> Dar Moedas
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ABA 3: LIMPEZA DE CHAT (NOVO) */}
          {activeTab === 'cleanup' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-amber-950/20 border border-amber-500/30">
                <div className="flex items-center gap-2 text-sm font-bold text-amber-300 mb-1">
                  <AlertTriangle className="w-4 h-4" /> Central de Limpeza e Manutenção
                </div>
                <p className="text-xs text-slate-400">
                  Ferramentas exclusivas do administrador para limpar histórico de mensagens e manter o chat leve e organizado.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-4 rounded-2xl bg-background-surface/80 border border-slate-800 flex flex-col justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                      <span>👑</span> Limpar Belmont Conference
                    </h4>
                    <p className="text-xs text-slate-400 mt-1">
                      Apaga todas as mensagens da sala principal oficial. A sala continua ativa e permanente para todos.
                    </p>
                  </div>
                  <button
                    onClick={handleClearBelmontChat}
                    disabled={actionLoading}
                    className="mt-4 w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg transition-all"
                  >
                    {actionLoading ? 'Limpando...' : '🧹 Limpar Mensagens da Belmont'}
                  </button>
                </div>

                <div className="p-4 rounded-2xl bg-background-surface/80 border border-slate-800 flex flex-col justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                      <span>⚠️</span> Limpeza Geral de Mensagens
                    </h4>
                    <p className="text-xs text-slate-400 mt-1">
                      Reinicia o histórico global de mensagens de todas as conversas do sistema.
                    </p>
                  </div>
                  <button
                    onClick={handleClearAllMessages}
                    disabled={actionLoading}
                    className="mt-4 w-full py-2.5 rounded-xl bg-slate-800 hover:bg-rose-900 text-rose-300 hover:text-white border border-rose-500/40 text-xs font-bold transition-all"
                  >
                    {actionLoading ? 'Processando...' : '☢️ Limpeza Completa Geral'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ABA 4: GERENCIAR LOJA (NOVO) */}
          {activeTab === 'shop' && (
            <div className="space-y-4">
              {/* Formulário de Criação de Item */}
              <form onSubmit={handleCreateShopItem} className="p-4 rounded-2xl bg-slate-900/90 border border-amber-500/30 space-y-3">
                <div className="flex items-center gap-2 text-xs font-extrabold text-amber-300">
                  <Plus className="w-4 h-4" /> Cadastrar Novo Item na Loja Nexus
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="sm:col-span-2">
                    <label className="text-[10px] text-slate-400 font-bold block mb-1">Nome do Item</label>
                    <input
                      type="text"
                      required
                      value={newItemName}
                      onChange={(e) => setNewItemName(e.target.value)}
                      placeholder="Ex: Fundo Cyber Vermelho, Moldura Dragão..."
                      className="w-full px-3 py-1.5 rounded-xl bg-background-dark border border-slate-700 text-xs text-white focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 font-bold block mb-1">Categoria</label>
                    <select
                      value={newItemCategory}
                      onChange={(e) => setNewItemCategory(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl bg-background-dark border border-slate-700 text-xs text-white focus:border-amber-500"
                    >
                      <option value="frames">Molduras</option>
                      <option value="wallpapers">Planos de Fundo</option>
                      <option value="bubbles">Balões de Chat</option>
                      <option value="badges">Badges & Títulos</option>
                      <option value="name_colors">Auras de Nome</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-400 font-bold block mb-1">Preço (Nexus Coins)</label>
                    <input
                      type="number"
                      required
                      min={10}
                      value={newItemPrice}
                      onChange={(e) => setNewItemPrice(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl bg-background-dark border border-slate-700 text-xs text-white focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 font-bold block mb-1">Ícone / Emoji</label>
                    <input
                      type="text"
                      value={newItemIcon}
                      onChange={(e) => setNewItemIcon(e.target.value)}
                      placeholder="👑, 🔥, ✨..."
                      className="w-full px-3 py-1.5 rounded-xl bg-background-dark border border-slate-700 text-xs text-white focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 font-bold block mb-1">Descrição Curta</label>
                    <input
                      type="text"
                      value={newItemDesc}
                      onChange={(e) => setNewItemDesc(e.target.value)}
                      placeholder="Efeito exclusivo..."
                      className="w-full px-3 py-1.5 rounded-xl bg-background-dark border border-slate-700 text-xs text-white focus:border-amber-500"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={actionLoading}
                  className="w-full py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-black font-extrabold text-xs shadow-md hover:scale-[1.01] transition-all flex items-center justify-center gap-1"
                >
                  <PlusCircle className="w-4 h-4" /> Publicar Item na Loja
                </button>
              </form>

              {/* Lista de Itens Customizados Cadastrados */}
              <div>
                <h4 className="text-xs font-bold text-slate-300 mb-2">Itens Publicados pelo Admin ({shopItems.length})</h4>
                {shopItems.length === 0 ? (
                  <div className="text-xs text-slate-500 py-3 text-center">Nenhum item personalizado cadastrado ainda.</div>
                ) : (
                  <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                    {shopItems.map((item) => (
                      <div key={item.id} className="p-2.5 rounded-xl bg-background-surface border border-slate-800 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{item.icon}</span>
                          <div>
                            <span className="font-bold text-white">{item.name}</span>
                            <span className="text-[10px] text-slate-400 ml-2">({item.category} • {item.price} coins)</span>
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteShopItem(item.id)}
                          className="p-1 rounded text-rose-400 hover:bg-rose-500/20"
                          title="Excluir item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ABA 5: TRANSMISSÃO BELMONT */}
          {activeTab === 'broadcast' && (
            <form onSubmit={handleSendBroadcast} className="space-y-3">
              <div className="p-3 rounded-2xl bg-brand-500/10 border border-brand-500/30 text-xs text-brand-300">
                Envie um comunicado oficial em destaque diretamente na sala <strong>BELMONT CONFERENCE</strong> para todos os membros.
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Título do Comunicado</label>
                <input
                  type="text"
                  value={broadcastTitle}
                  onChange={(e) => setBroadcastTitle(e.target.value)}
                  placeholder="Ex: Atualização do Sistema, Novas Regras..."
                  className="w-full px-3.5 py-2 rounded-xl bg-background-dark border border-slate-700 text-xs text-white focus:border-rose-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Mensagem</label>
                <textarea
                  rows={4}
                  required
                  value={broadcastMessage}
                  onChange={(e) => setBroadcastMessage(e.target.value)}
                  placeholder="Escreva a mensagem da transmissão..."
                  className="w-full px-3.5 py-2 rounded-xl bg-background-dark border border-slate-700 text-xs text-white focus:border-rose-500 resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={actionLoading}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 text-white font-extrabold text-xs shadow-lg transition-all flex items-center justify-center gap-1.5"
              >
                <Radio className="w-4 h-4 animate-pulse" /> Enviar Transmissão Oficial
              </button>
            </form>
          )}
        </div>

        {/* Modal Flutuante para Conceder Moedas */}
        {selectedUserForCoins && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
            <div className="glass-modal w-full max-w-sm rounded-3xl p-5 border border-amber-500/50 shadow-2xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Coins className="w-5 h-5 text-amber-400" />
                  <h3 className="text-sm font-bold text-white">Conceder Nexus Coins</h3>
                </div>
                <button onClick={() => setSelectedUserForCoins(null)} className="text-slate-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-slate-300">
                Para: <strong>{selectedUserForCoins.display_name || selectedUserForCoins.username}</strong> (@{selectedUserForCoins.username})
              </p>

              <div className="grid grid-cols-3 gap-2">
                {['100', '500', '1000'].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setCustomCoinsAmount(amt)}
                    className={`py-1.5 rounded-xl text-xs font-bold border transition-colors ${
                      customCoinsAmount === amt
                        ? 'bg-amber-500 text-black border-amber-400'
                        : 'bg-slate-800 text-slate-300 border-slate-700'
                    }`}
                  >
                    +{amt}
                  </button>
                ))}
              </div>

              <input
                type="number"
                value={customCoinsAmount}
                onChange={(e) => setCustomCoinsAmount(e.target.value)}
                placeholder="Quantidade customizada..."
                className="w-full px-3 py-2 rounded-xl bg-background-dark border border-slate-700 text-xs text-white"
              />

              <button
                type="button"
                onClick={() => handleGiveCoins(selectedUserForCoins.id, customCoinsAmount)}
                disabled={actionLoading}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-black font-extrabold text-xs shadow-lg"
              >
                Confirmar e Entregar Moedas
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
