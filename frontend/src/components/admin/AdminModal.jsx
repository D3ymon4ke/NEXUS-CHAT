import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useChat } from '../../context/ChatContext';
import { supabase, isSupabaseConfigured } from '../../lib/supabaseClient';
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
  Check,
  FileText,
  Tag,
  Edit2,
  Ghost,
  Eye,
  UserCheck2,
  Lock,
  Cpu,
  Server,
  Zap,
  Flame,
  Globe,
  Sliders,
  Crown,
  Award
} from 'lucide-react';

const BELMONT_ID = '00000000-0000-0000-0000-000000000001';
const BADGE_OPTIONS = ['PATCH', 'ATUALIZAÇÃO', 'NOVIDADE', 'EVENTO', 'CORREÇÃO', 'ANÚNCIO'];

export function AdminModal({ isOpen, onClose }) {
  const { user } = useAuth();
  const { loadConversations, clearMessages } = useChat();

  const [activeTab, setActiveTab] = useState('stats'); // 'stats' | 'chat_master' | 'users' | 'shop' | 'patches' | 'cleanup' | 'broadcast'
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [shopItems, setShopItems] = useState([]);
  const [patchNotesList, setPatchNotesList] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [shopSearchQuery, setShopSearchQuery] = useState('');
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

  // Substate Criar Patch Note
  const [patchTag, setPatchTag] = useState('ATUALIZAÇÃO');
  const [patchTitle, setPatchTitle] = useState('');
  const [patchVersion, setPatchVersion] = useState('v2.5.0');
  const [patchContent, setPatchContent] = useState('');
  const [patchIsPinned, setPatchIsPinned] = useState(false);
  const [patchBroadcastToBelmont, setPatchBroadcastToBelmont] = useState(true);

  // Substate Nomeação de Cargos & Condecoração de Usuários 👑
  const [promoUserId, setPromoUserId] = useState('');
  const [promoTitle, setPromoTitle] = useState('Coordenador');
  const [promoCustomTitle, setPromoCustomTitle] = useState('');
  const [promoBadge, setPromoBadge] = useState('badge_coordinator');
  const [promoRole, setPromoRole] = useState('moderator');
  const [promoBonusCoins, setPromoBonusCoins] = useState('250');
  const [promoMessage, setPromoMessage] = useState('Parabéns pela sua dedicação e contribuição exemplar na comunidade!');
  const [promoBroadcast, setPromoBroadcast] = useState(true);

  // Substate Chat Master
  const [allMasterConversations, setAllMasterConversations] = useState([]);
  const [selectedMasterConvId, setSelectedMasterConvId] = useState(BELMONT_ID);
  const [masterMessages, setMasterMessages] = useState([]);
  const [impersonatedUserId, setImpersonatedUserId] = useState(user?.id || '');
  const [masterInputText, setMasterInputText] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    loadAdminData();
    loadShopItems();
    loadPatchNotes();
    loadChatMasterData();
  }, [isOpen]);

  useEffect(() => {
    if (activeTab === 'chat_master' && selectedMasterConvId) {
      loadMasterConversationMessages(selectedMasterConvId);
    }
  }, [activeTab, selectedMasterConvId]);

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
        if (!impersonatedUserId && usersList?.length > 0) {
          setImpersonatedUserId(user?.id || usersList[0].id);
        }
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

  const loadPatchNotes = async () => {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data } = await supabase.from('patch_notes').select('*').order('created_at', { ascending: false });
        setPatchNotesList(data || []);
      } catch (err) {
        console.error('Erro ao carregar patch notes:', err);
      }
    }
  };

  const loadChatMasterData = async () => {
    if (!isSupabaseConfigured || !supabase) return;
    try {
      const { data: convs } = await supabase
        .from('conversations')
        .select('*, participants:conversation_participants(user:profiles(*))')
        .order('updated_at', { ascending: false });

      if (convs) setAllMasterConversations(convs);
    } catch (err) {
      console.warn('Erro ao carregar conversas master:', err);
    }
  };

  const handleSelectUserForChatMaster = async (targetUser) => {
    if (!targetUser || !user) return;
    try {
      const existingConv = allMasterConversations.find(
        (c) =>
          c.type === 'direct' &&
          c.participants?.some((p) => p.user?.id === targetUser.id)
      );

      if (existingConv) {
        setSelectedMasterConvId(existingConv.id);
        return;
      }

      if (isSupabaseConfigured && supabase) {
        const { data: newConv } = await supabase
          .from('conversations')
          .insert({ type: 'direct' })
          .select()
          .single();

        if (newConv) {
          await supabase.from('conversation_participants').insert([
            { conversation_id: newConv.id, user_id: user.id, role: 'member' },
            { conversation_id: newConv.id, user_id: targetUser.id, role: 'member' }
          ]);
          await loadChatMasterData();
          setSelectedMasterConvId(newConv.id);
        }
      }
    } catch (err) {
      console.error('Erro ao abrir conversa com usuário:', err);
    }
  };

  const handleAdminChangeUserAvatar = async (targetUserId, file) => {
    if (!file || !targetUserId) return;
    try {
      setActionLoading(true);
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const newUrl = ev.target?.result;
        if (newUrl && isSupabaseConfigured && supabase) {
          await supabase.from('profiles').update({ avatar_url: newUrl }).eq('id', targetUserId);
          setUsers(prev => prev.map(u => u.id === targetUserId ? { ...u, avatar_url: newUrl } : u));
          sounds.playPop();
          setFeedback({ text: 'Foto de perfil do usuário atualizada com sucesso!', type: 'success' });
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error('Erro ao atualizar foto pelo admin:', err);
      setFeedback({ text: 'Erro ao atualizar foto.', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const loadMasterConversationMessages = async (convId) => {
    if (!isSupabaseConfigured || !supabase || !convId) return;
    try {
      const { data: msgs } = await supabase
        .from('messages')
        .select('*, sender:profiles(*)')
        .eq('conversation_id', convId)
        .order('created_at', { ascending: true })
        .limit(50);

      if (msgs) setMasterMessages(msgs);
    } catch (err) {
      console.error('Erro ao carregar mensagens master:', err);
    }
  };

  const handleSendMasterMessage = async (e) => {
    e.preventDefault();
    if (!masterInputText.trim() || !selectedMasterConvId || !impersonatedUserId) return;

    try {
      setActionLoading(true);
      if (isSupabaseConfigured && supabase) {
        await supabase.from('messages').insert({
          conversation_id: selectedMasterConvId,
          sender_id: impersonatedUserId,
          content: masterInputText.trim(),
          type: 'text'
        });
      }

      sounds.playPop();
      setMasterInputText('');
      loadMasterConversationMessages(selectedMasterConvId);
      setFeedback({ text: 'Mensagem enviada com sucesso personificando o usuário selecionado!', type: 'success' });
    } catch (err) {
      setFeedback({ text: 'Erro ao enviar mensagem como personificador.', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleClearBelmontChat = async () => {
    if (!window.confirm('Tem certeza que deseja apagar TODAS as mensagens da sala BELMONT CONFERENCE?')) return;

    try {
      setActionLoading(true);
      if (isSupabaseConfigured && supabase) {
        await supabase.from('messages').delete().eq('conversation_id', BELMONT_ID);
      }

      if (clearMessages) clearMessages();
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

      if (clearMessages) clearMessages();
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

  const handleUpdateItemPrice = async (itemId, newPrice) => {
    const parsed = parseInt(newPrice, 10);
    if (isNaN(parsed) || parsed < 0) return;

    try {
      if (isSupabaseConfigured && supabase) {
        await supabase.from('shop_items').update({ price: parsed }).eq('id', itemId);
      }
      setFeedback({ text: 'Preço do item atualizado com sucesso!', type: 'success' });
      loadShopItems();
    } catch (err) {
      console.error('Erro ao atualizar preço:', err);
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

  const handleCreatePatchNote = async (e) => {
    e.preventDefault();
    if (!patchTitle.trim() || !patchContent.trim()) return;

    try {
      setActionLoading(true);
      if (isSupabaseConfigured && supabase) {
        // 1. Inserir na tabela de patch notes
        await supabase.from('patch_notes').insert({
          tag: patchTag,
          title: patchTitle,
          version: patchVersion || 'v2.5.0',
          content: patchContent,
          author_name: user?.display_name || 'Damon',
          is_pinned: patchIsPinned
        });

        // 2. Se marcado para emitir aviso no Belmont Conference, envia mensagem automática na sala geral
        if (patchBroadcastToBelmont) {
          const announcementText = `📢 **[ATUALIZAÇÃO OFICIAL • ${patchTag}] ${patchTitle} (${patchVersion || 'v2.5.0'})**\n\n${patchContent}\n\n*— Publicado por ${user?.display_name || 'Admin Damon'} no Painel*`;
          await supabase.from('messages').insert({
            conversation_id: BELMONT_ID,
            sender_id: user?.id,
            content: announcementText,
            type: 'text'
          });
        }
      }

      sounds.playPop();
      confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
      setFeedback({
        text: patchBroadcastToBelmont
          ? 'Nota publicada e aviso transmitido no Belmont Conference!'
          : 'Nota de Atualização publicada com sucesso!',
        type: 'success'
      });
      setPatchTitle('');
      setPatchContent('');
      setPatchIsPinned(false);
      loadPatchNotes();
      if (loadConversations) loadConversations();
    } catch (err) {
      setFeedback({ text: 'Erro ao publicar patch note.', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeletePatchNote = async (patchId) => {
    if (!window.confirm('Deseja excluir esta nota de atualização?')) return;
    try {
      if (isSupabaseConfigured && supabase) {
        await supabase.from('patch_notes').delete().eq('id', patchId);
      }
      setFeedback({ text: 'Nota de atualização excluída.', type: 'success' });
      loadPatchNotes();
    } catch (err) {
      console.error('Erro ao excluir patch note:', err);
    }
  };

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

  const PROMOTION_PRESETS = [
    {
      title: 'Coordenador',
      badge: 'badge_coordinator',
      role: 'moderator',
      icon: '⭐',
      label: '⭐ Coordenador Geral',
      desc: 'Liderança comunitária e apoio geral',
      coins: '250'
    },
    {
      title: 'Moderador',
      badge: 'badge_moderator',
      role: 'moderator',
      icon: '🛡️',
      label: '🛡️ Moderador Oficial',
      desc: 'Gestão de salas e moderação de membros',
      coins: '200'
    },
    {
      title: 'BETA TESTER',
      badge: 'badge_beta_tester',
      role: 'member',
      icon: '🧪',
      label: '🧪 BETA TESTER VIP',
      desc: 'Acesso prioritário a recursos experimentais',
      coins: '150'
    },
    {
      title: 'Embaixador',
      badge: 'badge_ambassador',
      role: 'member',
      icon: '🌟',
      label: '🌟 Embaixador da Comunidade',
      desc: 'Representante oficial e acolhimento',
      coins: '150'
    },
    {
      title: 'Pioneiro',
      badge: 'badge_early_adopter',
      role: 'member',
      icon: '⚡',
      label: '⚡ Pioneiro Nexus',
      desc: 'Membro fundador da primeira geração',
      coins: '100'
    },
    {
      title: 'VIP Honorário',
      badge: 'badge_vip_honor',
      role: 'member',
      icon: '💎',
      label: '💎 Membro Honorário',
      desc: 'Título de prestígio e mérito especial',
      coins: '300'
    },
    {
      title: 'custom',
      badge: 'badge_coordinator',
      role: 'member',
      icon: '✍️',
      label: '✍️ Título Personalizado...',
      desc: 'Digite qualquer título exclusivo desejado',
      coins: '100'
    }
  ];

  const handleBestowPromotion = async (e) => {
    e.preventDefault();
    if (!promoUserId) {
      setFeedback({ text: 'Selecione um usuário para condecorar.', type: 'error' });
      return;
    }

    const effectiveTitle = promoTitle === 'custom' ? promoCustomTitle.trim() : promoTitle;
    if (!effectiveTitle) {
      setFeedback({ text: 'Digite o nome do cargo/título a ser concedido.', type: 'error' });
      return;
    }

    try {
      setActionLoading(true);
      const targetUser = users.find(u => u.id === promoUserId);
      if (!targetUser) return;

      const bonus = parseInt(promoBonusCoins, 10) || 0;
      const newCoins = (targetUser.nexus_coins || 0) + bonus;

      const pendingReward = {
        title: effectiveTitle,
        badge: promoBadge,
        bonus: bonus,
        message: promoMessage.trim(),
        adminName: user?.display_name || user?.username || 'Damon',
        grantedAt: new Date().toISOString()
      };

      if (isSupabaseConfigured && supabase) {
        const { error: updErr } = await supabase
          .from('profiles')
          .update({
            custom_title: effectiveTitle,
            equipped_badge: promoBadge,
            role: promoRole,
            nexus_coins: newCoins,
            title_reward_pending: JSON.stringify(pendingReward)
          })
          .eq('id', promoUserId);

        if (updErr) throw updErr;

        if (bonus > 0) {
          await supabase.from('nexus_transactions').insert({
            user_id: promoUserId,
            amount: bonus,
            type: 'promotion_reward',
            description: `Bônus por condecoração ao cargo de ${effectiveTitle} 👑`
          });
        }

        if (promoBroadcast) {
          const broadcastMsg = `👑 **CONDECORAÇÃO OFICIAL NEXUS**\n\n🎉 O membro **@${targetUser.username}** (${targetUser.display_name || targetUser.username}) foi condecorado pelo Administrador com o título de **⭐ ${effectiveTitle}**!\n\n💬 *"${promoMessage.trim()}"*`;
          await supabase.from('messages').insert({
            conversation_id: BELMONT_ID,
            sender_id: user.id,
            content: broadcastMsg,
            type: 'text'
          });
        }
      }

      sounds.playPop();
      confetti({ particleCount: 100, spread: 80, origin: { y: 0.6 } });
      setFeedback({
        text: `🎉 @${targetUser.username} foi condecorado como ${effectiveTitle}! Um popup de parabéns aparecerá para ele.`,
        type: 'success'
      });

      loadAdminData();
    } catch (err) {
      console.error('Erro ao condecorar usuário:', err);
      setFeedback({ text: 'Erro ao condecorar usuário.', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleRevokePromotion = async (userId) => {
    if (!window.confirm('Deseja revogar o título deste usuário?')) return;
    try {
      if (isSupabaseConfigured && supabase) {
        await supabase
          .from('profiles')
          .update({
            custom_title: null,
            role: 'member',
            title_reward_pending: null
          })
          .eq('id', userId);
      }
      setFeedback({ text: 'Título e condecoração revogados.', type: 'success' });
      loadAdminData();
    } catch (err) {
      console.error('Erro ao revogar título:', err);
    }
  };

  if (!isOpen || !user) return null;

  const filteredUsers = users.filter(u =>
    (u.display_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.username || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.email || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredShopItems = shopItems.filter(item =>
    item.name.toLowerCase().includes(shopSearchQuery.toLowerCase()) ||
    item.category.toLowerCase().includes(shopSearchQuery.toLowerCase())
  );

  const impersonatedUserObj = users.find(u => u.id === impersonatedUserId) || user;

  const navTabs = [
    { id: 'stats', label: 'Estatísticas', icon: Activity, badge: 'Live' },
    { id: 'promotions', label: 'Nomear Cargos', icon: Crown, badge: 'VIP' },
    { id: 'chat_master', label: 'Super DM Master', icon: Ghost, badge: 'Secreto' },
    { id: 'users', label: 'Usuários & Coins', icon: Users },
    { id: 'shop', label: 'Gerenciar Loja', icon: ShoppingBag },
    { id: 'patches', label: 'Patch Notes', icon: FileText },
    { id: 'cleanup', label: 'Limpeza de Chat', icon: Trash2 },
    { id: 'broadcast', label: 'Transmissão Belmont', icon: Radio }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-xl animate-fadeIn select-none">
      <div className="w-full max-w-5xl rounded-3xl p-6 shadow-2xl border border-rose-500/40 bg-gradient-to-b from-slate-900/95 via-background-darker/95 to-slate-950/95 flex flex-col max-h-[92vh] overflow-hidden relative backdrop-blur-2xl">
        {/* Glows Decorativos de Fundo */}
        <div className="absolute -top-32 -right-32 w-80 h-80 bg-rose-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Topbar com Identidade Visual Damon */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800/80">
          <div className="flex items-center gap-3.5">
            <div className="relative">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-600 via-red-600 to-amber-600 text-white flex items-center justify-center shadow-xl shadow-rose-600/30 border border-amber-400/50 animate-pulse">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-slate-900 shadow" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-extrabold text-white tracking-tight">
                  PAINEL SUPREMO DE ADMINISTRAÇÃO
                </h2>
                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-gradient-to-r from-rose-600/30 to-amber-600/30 text-rose-300 border border-rose-500/50 font-extrabold uppercase shadow-sm">
                  👑 Damon Access
                </span>
              </div>
              <p className="text-xs text-slate-400">Controle total de economia, super dms, catálogo e moderação</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-2xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition-all border border-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback Alert */}
        {feedback.text && (
          <div
            className={`my-3 p-3 rounded-2xl text-xs font-semibold flex items-center justify-between animate-fadeIn ${
              feedback.type === 'success'
                ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 shadow-lg shadow-emerald-500/10'
                : 'bg-rose-500/15 border border-rose-500/30 text-rose-300 shadow-lg shadow-rose-500/10'
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

        {/* Barra de Abas Estilizada com Pills Modernos */}
        <div className="flex bg-slate-900/80 p-1.5 rounded-2xl border border-slate-800/80 my-3.5 overflow-x-auto no-scrollbar gap-1">
          {navTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setFeedback({ text: '', type: '' });
                }}
                className={`py-2 px-3.5 text-xs font-bold rounded-xl transition-all flex items-center gap-2 whitespace-nowrap ${
                  isActive
                    ? 'bg-gradient-to-r from-rose-600 via-red-600 to-rose-700 text-white shadow-lg shadow-rose-600/30 border border-rose-400/40'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-extrabold uppercase ${
                    isActive ? 'bg-black/30 text-white' : 'bg-rose-500/20 text-rose-300'
                  }`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* CONTEÚDO DAS ABAS */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-4 min-h-[320px]">
          {/* ABA 1: ESTATÍSTICAS & STATUS */}
          {activeTab === 'stats' && stats && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div className="p-5 rounded-3xl bg-gradient-to-br from-slate-900 to-slate-900/60 border border-slate-800 shadow-xl relative overflow-hidden group hover:border-slate-700 transition-all">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total de Membros</span>
                    <div className="w-8 h-8 rounded-xl bg-brand-500/15 border border-brand-500/30 flex items-center justify-center text-brand-400">
                      <Users className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-3xl font-extrabold text-white">{stats.totalUsers}</div>
                  <p className="text-[11px] text-slate-500 mt-1">Usuários registrados no sistema</p>
                </div>

                <div className="p-5 rounded-3xl bg-gradient-to-br from-slate-900 to-slate-900/60 border border-slate-800 shadow-xl relative overflow-hidden group hover:border-slate-700 transition-all">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Mensagens Enviadas</span>
                    <div className="w-8 h-8 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                      <MessageSquare className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-3xl font-extrabold text-white">{stats.totalMessages}</div>
                  <p className="text-[11px] text-slate-500 mt-1">Volume global de mensagens</p>
                </div>

                <div className="p-5 rounded-3xl bg-gradient-to-br from-slate-900 to-slate-900/60 border border-slate-800 shadow-xl relative overflow-hidden group hover:border-slate-700 transition-all">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Nexus Coins Ativas</span>
                    <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                      <Coins className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-3xl font-extrabold text-amber-300 flex items-center gap-1.5">
                    <img src="/nexus-coin.jpg" alt="Moeda" className="w-6 h-6 rounded-full" />
                    <span>{stats.totalCoinsInEconomy}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">Saldo em circulação na economia</p>
                </div>
              </div>

              {/* Status do Servidor & VPS */}
              <div className="p-5 rounded-3xl bg-gradient-to-r from-slate-900 via-slate-900/80 to-emerald-950/40 border border-emerald-500/30 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/40">
                    <Server className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                      <CheckCircle className="w-4 h-4" /> Servidor & VPS Belmont Conectados
                    </div>
                    <div className="text-xs text-slate-300 mt-0.5">{stats.vpsStatus}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-3.5 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/40 shadow-sm">
                    Uptime: {stats.serverUptime}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ABA: NOMEAR CARGOS & CONDECORAÇÃO OFICIAL 👑 */}
          {activeTab === 'promotions' && (
            <div className="space-y-4">
              {/* Banner de Apresentação */}
              <div className="p-4 rounded-3xl bg-gradient-to-r from-amber-950/50 via-slate-900 to-yellow-950/50 border border-amber-500/40 flex items-center justify-between gap-3 shadow-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-300 flex items-center justify-center border border-amber-500/40">
                    <Crown className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-extrabold text-amber-300 uppercase tracking-wide">
                      Concessão de Cargos, Títulos & Badges de Honra
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Ao nomear um membro, um popup festivo com confetes e parabéns aparecerá na tela dele ao entrar!
                    </p>
                  </div>
                </div>
              </div>

              {/* Formulário de Condecoração */}
              <form onSubmit={handleBestowPromotion} className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-4">
                <h4 className="text-xs font-extrabold text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>1. Selecionar Membro & Cargo a ser Concedido</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* Escolha do Usuário */}
                  <div>
                    <label className="text-[10px] font-bold text-slate-300 uppercase block mb-1.5">
                      Membro a ser Condecorado:
                    </label>
                    <select
                      value={promoUserId}
                      onChange={(e) => setPromoUserId(e.target.value)}
                      required
                      className="w-full px-3.5 py-2.5 rounded-xl bg-background-dark border border-slate-700 text-xs text-white focus:border-amber-500 font-semibold"
                    >
                      <option value="">Selecione um usuário...</option>
                      {users.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.display_name || u.username} (@{u.username}) {u.custom_title ? `[${u.custom_title}]` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Bônus de Moedas */}
                  <div>
                    <label className="text-[10px] font-bold text-slate-300 uppercase block mb-1.5">
                      Bônus de Moedas de Reconhecimento:
                    </label>
                    <div className="flex gap-2">
                      {['100', '250', '500'].map((amt) => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => setPromoBonusCoins(amt)}
                          className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-colors ${
                            promoBonusCoins === amt
                              ? 'bg-amber-500 text-black border-amber-400 shadow'
                              : 'bg-background-dark text-slate-300 border-slate-700'
                          }`}
                        >
                          +{amt} 🪙
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Seleção de Presets de Títulos */}
                <div>
                  <label className="text-[10px] font-bold text-slate-300 uppercase block mb-1.5">
                    Escolha o Cargo / Título Oficial:
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {PROMOTION_PRESETS.map((preset) => {
                      const isSelected = promoTitle === preset.title;
                      return (
                        <button
                          key={preset.title}
                          type="button"
                          onClick={() => {
                            setPromoTitle(preset.title);
                            setPromoBadge(preset.badge);
                            setPromoRole(preset.role);
                            if (preset.coins) setPromoBonusCoins(preset.coins);
                          }}
                          className={`p-3 rounded-2xl text-left border transition-all ${
                            isSelected
                              ? 'bg-amber-500/20 border-amber-400 text-amber-200 shadow-lg shadow-amber-500/10 ring-1 ring-amber-400'
                              : 'bg-background-dark/80 border-slate-800 text-slate-300 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-2 font-bold text-xs">
                            <span>{preset.icon}</span>
                            <span>{preset.title === 'custom' ? 'Customizado' : preset.title}</span>
                          </div>
                          <p className="text-[10px] text-slate-400 mt-1">{preset.desc}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Campo se for Título Customizado */}
                {promoTitle === 'custom' && (
                  <div>
                    <label className="text-[10px] font-bold text-slate-300 uppercase block mb-1.5">
                      Nome do Título Customizado:
                    </label>
                    <input
                      type="text"
                      value={promoCustomTitle}
                      onChange={(e) => setPromoCustomTitle(e.target.value)}
                      placeholder="Ex: Mestre Supremo, Guardião, Diretor..."
                      required
                      className="w-full px-3.5 py-2 rounded-xl bg-background-dark border border-slate-700 text-xs text-white focus:border-amber-500 font-bold"
                    />
                  </div>
                )}

                {/* Mensagem Personalizada de Condecoração */}
                <div>
                  <label className="text-[10px] font-bold text-slate-300 uppercase block mb-1.5">
                    Mensagem de Condecoração (Aparecerá no Popup de Parabéns):
                  </label>
                  <textarea
                    rows={2}
                    value={promoMessage}
                    onChange={(e) => setPromoMessage(e.target.value)}
                    placeholder="Escreva a mensagem congratulatória..."
                    className="w-full px-3.5 py-2 rounded-xl bg-background-dark border border-slate-700 text-xs text-white focus:border-amber-500 resize-none"
                  />
                </div>

                {/* Opção de Anúncio no Belmont Conference */}
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="promoBroadcast"
                    checked={promoBroadcast}
                    onChange={(e) => setPromoBroadcast(e.target.checked)}
                    className="rounded border-slate-700 text-amber-500 focus:ring-amber-400"
                  />
                  <label htmlFor="promoBroadcast" className="text-xs text-slate-300 cursor-pointer">
                    Emitir anúncio de condecoração no Belmont Conference para todos os membros
                  </label>
                </div>

                {/* Botão de Envio */}
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs shadow-xl shadow-amber-500/20 transition-all flex items-center justify-center gap-2"
                >
                  <Award className="w-4 h-4" />
                  <span>Conceder Cargo & Emitir Popup de Parabéns 🎉</span>
                </button>
              </form>

              {/* Tabela de Usuários Condecorados com Cargos Atuais */}
              <div className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-3">
                <h4 className="text-xs font-extrabold text-white flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Crown className="w-4 h-4 text-amber-400" />
                    <span>Membros Atualmente Condecorados</span>
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {users.filter(u => u.custom_title || u.role === 'moderator').length} condecorados
                  </span>
                </h4>

                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {users.filter(u => u.custom_title || u.role === 'moderator' || u.role === 'admin').map((u) => (
                    <div
                      key={u.id}
                      className="p-3 rounded-2xl bg-background-dark border border-slate-800 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <img
                          src={u.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${u.id}`}
                          alt="avatar"
                          className="w-8 h-8 rounded-full object-cover border border-slate-700"
                        />
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-white">{u.display_name || u.username}</span>
                            <span className="text-[10px] text-slate-400">@{u.username}</span>
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {u.custom_title && (
                              <span className="text-[9px] px-2 py-0.2 rounded-full bg-amber-500/20 text-amber-300 font-extrabold border border-amber-500/30">
                                ⭐ {u.custom_title}
                              </span>
                            )}
                            {u.role === 'moderator' && !u.custom_title && (
                              <span className="text-[9px] px-2 py-0.2 rounded-full bg-indigo-500/20 text-indigo-300 font-extrabold border border-indigo-500/30">
                                🛡️ Moderador
                              </span>
                            )}
                            {u.role === 'admin' && (
                              <span className="text-[9px] px-2 py-0.2 rounded-full bg-rose-500/20 text-rose-300 font-extrabold border border-rose-500/30">
                                👑 Admin Damon
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {u.username !== 'damon' && (u.custom_title || u.role === 'moderator') && (
                        <button
                          type="button"
                          onClick={() => handleRevokePromotion(u.id)}
                          className="px-2.5 py-1 rounded-xl text-[10px] font-bold text-rose-400 hover:text-white bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 transition-colors"
                        >
                          Revogar Cargo
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ABA 2: CHAT MASTER SECRETO (FANTASMA & PERSONIFICAÇÃO) */}
          {activeTab === 'chat_master' && (
            <div className="space-y-4">
              <div className="p-4 rounded-3xl bg-gradient-to-r from-purple-950/50 via-slate-900 to-indigo-950/50 border border-purple-500/40 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-purple-500/20 text-purple-300 flex items-center justify-center border border-purple-500/40">
                    <Ghost className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-extrabold text-purple-300 uppercase tracking-wide">
                      Super DM & Chat Master Fantasma Ativo
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Espione qualquer conversa e responda personificando qualquer usuário secretamente.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 bg-black/60 px-3.5 py-1.5 rounded-2xl border border-purple-500/40 text-xs">
                  <span className="text-[10px] text-slate-400">Identidade:</span>
                  <strong className="text-amber-300 font-bold">{impersonatedUserObj?.display_name || impersonatedUserObj?.username}</strong>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5">
                <div className="md:col-span-5 space-y-3">
                  <div className="p-4 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-2.5">
                    <label className="text-[10px] font-extrabold text-amber-300 uppercase block">
                      🎭 1. Responder como (Identidade):
                    </label>
                    <select
                      value={impersonatedUserId}
                      onChange={(e) => setImpersonatedUserId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-background-dark border border-slate-700 text-xs text-white focus:border-purple-500 font-semibold"
                    >
                      {users.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.display_name || u.username} (@{u.username}) {u.username === 'damon' ? '👑' : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="p-4 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-extrabold text-slate-300 uppercase block">
                        💬 2. Escolha o Alvo (Conversa ou Usuário):
                      </label>
                      <button
                        type="button"
                        onClick={loadChatMasterData}
                        className="text-[10px] text-purple-400 hover:text-purple-300 font-semibold"
                      >
                        🔄 Atualizar
                      </button>
                    </div>

                    <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
                      <div className="text-[9px] font-extrabold text-slate-400 uppercase px-1 pt-1">Salas & Grupos</div>
                      {allMasterConversations
                        .filter(c => c.type === 'group' || c.id === BELMONT_ID || c.is_permanent)
                        .map((conv) => {
                          const isBelmont = conv.id === BELMONT_ID || conv.is_permanent;
                          const isSelected = selectedMasterConvId === conv.id;

                          return (
                            <div
                              key={conv.id}
                              onClick={() => setSelectedMasterConvId(conv.id)}
                              className={`p-2.5 rounded-2xl border text-xs cursor-pointer transition-all ${
                                isSelected
                                  ? 'bg-purple-600/30 border-purple-500 text-white font-bold shadow-md'
                                  : 'bg-background-dark/80 border-slate-800 text-slate-300 hover:border-slate-700'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="truncate">{isBelmont ? '👑 BELMONT CONFERENCE' : conv.name || 'Sala Geral'}</span>
                                <span className="text-[9px] text-amber-400 uppercase font-extrabold">{isBelmont ? 'OFICIAL' : 'GRUPO'}</span>
                              </div>
                            </div>
                          );
                        })}

                      <div className="text-[9px] font-extrabold text-slate-400 uppercase px-1 pt-2">👥 Usuários (Chat Privado Direto)</div>
                      {users
                        .filter(u => u.id !== user?.id)
                        .map((targetU) => {
                          const existingConv = allMasterConversations.find(
                            c => c.type === 'direct' && c.participants?.some(p => p.user?.id === targetU.id)
                          );
                          const isSelected = existingConv && selectedMasterConvId === existingConv.id;

                          return (
                            <div
                              key={targetU.id}
                              onClick={() => handleSelectUserForChatMaster(targetU)}
                              className={`p-2 rounded-2xl border text-xs cursor-pointer transition-all flex items-center justify-between gap-2 ${
                                isSelected
                                  ? 'bg-purple-600/30 border-purple-500 text-white font-bold shadow-md'
                                  : 'bg-background-dark/80 border-slate-800 text-slate-300 hover:border-slate-700'
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <img
                                  src={targetU.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${targetU.id}`}
                                  alt="Avatar"
                                  className="w-6 h-6 rounded-lg object-cover border border-slate-700 flex-shrink-0"
                                />
                                <span className="truncate text-[11px] font-semibold">{targetU.display_name || targetU.username}</span>
                              </div>
                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 font-bold">
                                {existingConv ? 'Chat Aberto' : 'Iniciar'}
                              </span>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                </div>

                <div className="md:col-span-7 flex flex-col h-[340px] rounded-3xl bg-slate-900/90 border border-slate-800 overflow-hidden shadow-xl">
                  <div className="p-3 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-200">
                      Visualizador de Mensagens ({masterMessages.length} msgs)
                    </span>
                    <button
                      type="button"
                      onClick={() => loadMasterConversationMessages(selectedMasterConvId)}
                      className="text-[10px] text-purple-400 hover:text-purple-300 font-semibold"
                    >
                      🔄 Atualizar
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-3.5 space-y-2 text-xs">
                    {masterMessages.length === 0 ? (
                      <div className="text-center py-12 text-slate-500 text-xs">
                        Nenhuma mensagem encontrada nesta conversa.
                      </div>
                    ) : (
                      masterMessages.map((m) => (
                        <div key={m.id} className="p-2.5 rounded-2xl bg-background-dark/80 border border-slate-800 space-y-0.5">
                          <div className="flex items-center justify-between text-[10px] text-slate-400">
                            <strong className="text-amber-300">{m.sender?.display_name || m.sender?.username || 'Usuário'}</strong>
                            <span>{new Date(m.created_at).toLocaleTimeString('pt-BR')}</span>
                          </div>
                          <p className="text-slate-200">{m.content}</p>
                        </div>
                      ))
                    )}
                  </div>

                  <form onSubmit={handleSendMasterMessage} className="p-2.5 bg-slate-950 border-t border-slate-800 flex gap-2">
                    <input
                      type="text"
                      value={masterInputText}
                      onChange={(e) => setMasterInputText(e.target.value)}
                      placeholder={`Enviar como ${impersonatedUserObj?.display_name || 'Usuário'}...`}
                      className="flex-1 px-3.5 py-2 rounded-xl bg-background-dark border border-slate-700 text-xs text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none"
                    />
                    <button
                      type="submit"
                      disabled={actionLoading || !masterInputText.trim()}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 text-white font-extrabold text-xs flex items-center gap-1 shadow-lg"
                    >
                      <Send className="w-3.5 h-3.5" /> Enviar
                    </button>
                  </form>
                </div>
              </div>
            </div>
          )}

          {/* ABA 3: USUÁRIOS & CONCEDER MOEDAS */}
          {activeTab === 'users' && (
            <div className="space-y-3.5">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar usuário por nome, username ou email..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-background-dark border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 shadow-inner"
                />
              </div>

              <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                {filteredUsers.map((u) => (
                  <div
                    key={u.id}
                    className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center justify-between hover:border-slate-700 transition-all shadow"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={u.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${u.id}`}
                        alt="avatar"
                        className="w-10 h-10 rounded-2xl object-cover border border-slate-700 shadow"
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

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <label
                        className="px-3 py-2 rounded-xl bg-purple-600/20 text-purple-300 hover:bg-purple-600/30 border border-purple-500/40 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95"
                        title="Trocar a foto de perfil deste usuário"
                      >
                        <Upload className="w-3.5 h-3.5" /> Mudar Foto
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleAdminChangeUserAvatar(u.id, file);
                          }}
                        />
                      </label>

                      <button
                        onClick={() => setSelectedUserForCoins(u)}
                        className="px-3.5 py-2 rounded-xl bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/40 text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
                      >
                        <PlusCircle className="w-3.5 h-3.5" /> Conceder Moedas
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ABA 4: GERENCIAR LOJA */}
          {activeTab === 'shop' && (
            <div className="space-y-4">
              <form onSubmit={handleCreateShopItem} className="p-5 rounded-3xl bg-slate-900/90 border border-amber-500/30 space-y-3.5 shadow-xl">
                <div className="flex items-center gap-2 text-xs font-extrabold text-amber-300 uppercase tracking-wide">
                  <Plus className="w-4 h-4" /> Cadastrar Novo Item no Catálogo
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div className="sm:col-span-2">
                    <label className="text-[10px] text-slate-400 font-bold block mb-1">Nome do Item</label>
                    <input
                      type="text"
                      required
                      value={newItemName}
                      onChange={(e) => setNewItemName(e.target.value)}
                      placeholder="Ex: Fundo Cyber Vermelho, Moldura Dragão..."
                      className="w-full px-3.5 py-2 rounded-xl bg-background-dark border border-slate-700 text-xs text-white focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 font-bold block mb-1">Categoria</label>
                    <select
                      value={newItemCategory}
                      onChange={(e) => setNewItemCategory(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-background-dark border border-slate-700 text-xs text-white focus:border-amber-500"
                    >
                      <option value="frames">Molduras</option>
                      <option value="wallpapers">Planos de Fundo</option>
                      <option value="bubbles">Balões de Chat</option>
                      <option value="badges">Badges & Títulos</option>
                      <option value="name_colors">Auras de Nome</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="text-[10px] text-slate-400 font-bold block mb-1">Preço (Coins)</label>
                    <input
                      type="number"
                      required
                      min={10}
                      value={newItemPrice}
                      onChange={(e) => setNewItemPrice(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-background-dark border border-slate-700 text-xs text-white focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 font-bold block mb-1">Ícone / Emoji</label>
                    <input
                      type="text"
                      value={newItemIcon}
                      onChange={(e) => setNewItemIcon(e.target.value)}
                      placeholder="👑, 🔥, ✨..."
                      className="w-full px-3.5 py-2 rounded-xl bg-background-dark border border-slate-700 text-xs text-white focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 font-bold block mb-1">Descrição</label>
                    <input
                      type="text"
                      value={newItemDesc}
                      onChange={(e) => setNewItemDesc(e.target.value)}
                      placeholder="Efeito visual exclusivo..."
                      className="w-full px-3.5 py-2 rounded-xl bg-background-dark border border-slate-700 text-xs text-white focus:border-amber-500"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={actionLoading}
                  className="w-full py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 text-black font-extrabold text-xs shadow-xl shadow-amber-500/20 hover:scale-[1.01] transition-all flex items-center justify-center gap-1.5"
                >
                  <PlusCircle className="w-4 h-4" /> Publicar Novo Item na Loja
                </button>
              </form>

              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <h4 className="text-xs font-bold text-slate-300">
                    Catálogo Completo da Loja ({shopItems.length} itens registrados)
                  </h4>
                  <input
                    type="text"
                    value={shopSearchQuery}
                    onChange={(e) => setShopSearchQuery(e.target.value)}
                    placeholder="Filtrar itens..."
                    className="px-3 py-1.5 rounded-xl bg-background-dark border border-slate-700 text-xs text-white w-44"
                  />
                </div>

                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                  {filteredShopItems.map((item) => (
                    <div key={item.id} className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center justify-between text-xs hover:border-slate-700 transition-all shadow">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-2xl flex-shrink-0">{item.icon}</span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white truncate">{item.name}</span>
                            <span className="text-[10px] px-2 py-0.2 rounded-full bg-amber-500/20 text-amber-300 font-semibold uppercase">
                              {item.category}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400 block truncate">{item.description}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <div className="flex items-center gap-1 bg-slate-950 px-2.5 py-1.5 rounded-xl border border-slate-700 shadow-inner">
                          <img src="/nexus-coin.jpg" alt="Moeda" className="w-3.5 h-3.5 rounded-full" />
                          <input
                            type="number"
                            defaultValue={item.price}
                            onBlur={(e) => handleUpdateItemPrice(item.id, e.target.value)}
                            className="w-14 bg-transparent text-amber-300 font-bold text-xs focus:outline-none"
                            title="Clique e altere o valor para atualizar o preço"
                          />
                        </div>

                        <button
                          onClick={() => handleDeleteShopItem(item.id)}
                          className="p-2 rounded-xl text-rose-400 hover:bg-rose-500/20 transition-colors"
                          title="Excluir item da loja"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ABA 5: GERENCIAR PATCH NOTES */}
          {activeTab === 'patches' && (
            <div className="space-y-4">
              <form onSubmit={handleCreatePatchNote} className="p-5 rounded-3xl bg-slate-900/90 border border-brand-500/30 space-y-3.5 shadow-xl">
                <div className="flex items-center gap-2 text-xs font-extrabold text-brand-300 uppercase tracking-wide">
                  <FileText className="w-4 h-4" /> Publicar Nova Nota de Atualização / Patch Note
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="text-[10px] text-slate-400 font-bold block mb-1">Tag / Categoria</label>
                    <select
                      value={patchTag}
                      onChange={(e) => setPatchTag(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-background-dark border border-slate-700 text-xs text-white focus:border-brand-500"
                    >
                      {BADGE_OPTIONS.map((tag) => (
                        <option key={tag} value={tag}>{tag}</option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-[10px] text-slate-400 font-bold block mb-1">Título da Atualização</label>
                    <input
                      type="text"
                      required
                      value={patchTitle}
                      onChange={(e) => setPatchTitle(e.target.value)}
                      placeholder="Ex: Versão 2.5 - Nova Loja, Emojis e Wallpapers..."
                      className="w-full px-3.5 py-2 rounded-xl bg-background-dark border border-slate-700 text-xs text-white focus:border-brand-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="text-[10px] text-slate-400 font-bold block mb-1">Versão (Ex: v2.5.0)</label>
                    <input
                      type="text"
                      value={patchVersion}
                      onChange={(e) => setPatchVersion(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-background-dark border border-slate-700 text-xs text-white focus:border-brand-500"
                    />
                  </div>

                  <div className="sm:col-span-2 flex flex-wrap items-center gap-4 pt-3">
                    <label className="flex items-center gap-2 text-xs text-amber-300 font-semibold cursor-pointer">
                      <input
                        type="checkbox"
                        checked={patchIsPinned}
                        onChange={(e) => setPatchIsPinned(e.target.checked)}
                        className="rounded border-slate-700 bg-background-dark text-amber-500 focus:ring-0"
                      />
                      <span>Fixar no topo 📌</span>
                    </label>

                    <label className="flex items-center gap-2 text-xs text-emerald-400 font-bold cursor-pointer">
                      <input
                        type="checkbox"
                        checked={patchBroadcastToBelmont}
                        onChange={(e) => setPatchBroadcastToBelmont(e.target.checked)}
                        className="rounded border-slate-700 bg-background-dark text-emerald-500 focus:ring-0"
                      />
                      <span>📢 Emitir aviso no Belmont Conference</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 font-bold block mb-1">Conteúdo / Mudanças</label>
                  <textarea
                    rows={3}
                    required
                    value={patchContent}
                    onChange={(e) => setPatchContent(e.target.value)}
                    placeholder="Descreva as novidades, melhorias e correções desta versão..."
                    className="w-full px-3.5 py-2 rounded-xl bg-background-dark border border-slate-700 text-xs text-white focus:border-brand-500 resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={actionLoading}
                  className="w-full py-2.5 rounded-2xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 text-white font-extrabold text-xs shadow-lg transition-all flex items-center justify-center gap-1.5"
                >
                  <Send className="w-4 h-4" /> Publicar Patch Note na Página Inicial
                </button>
              </form>

              <div>
                <h4 className="text-xs font-bold text-slate-300 mb-2">Patch Notes Publicadas ({patchNotesList.length})</h4>
                <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                  {patchNotesList.map((patch) => (
                    <div key={patch.id} className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center justify-between text-xs shadow">
                      <div className="min-w-0 pr-2">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.2 rounded-full bg-amber-500/20 text-amber-300 font-bold text-[10px]">
                            {patch.tag}
                          </span>
                          <span className="font-bold text-white truncate">{patch.title}</span>
                          <span className="text-[10px] text-slate-500">{patch.version}</span>
                        </div>
                        <p className="text-[11px] text-slate-400 truncate mt-0.5">{patch.content}</p>
                      </div>
                      <button
                        onClick={() => handleDeletePatchNote(patch.id)}
                        className="p-2 rounded-xl text-rose-400 hover:bg-rose-500/20 flex-shrink-0"
                        title="Excluir patch note"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ABA 6: LIMPEZA DE CHAT */}
          {activeTab === 'cleanup' && (
            <div className="space-y-4">
              <div className="p-4 rounded-3xl bg-amber-950/20 border border-amber-500/30">
                <div className="flex items-center gap-2 text-sm font-bold text-amber-300 mb-1">
                  <AlertTriangle className="w-4 h-4" /> Central de Limpeza e Manutenção
                </div>
                <p className="text-xs text-slate-400">
                  Ferramentas exclusivas do administrador para limpar histórico de mensagens e manter o chat leve e organizado.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between shadow-xl">
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <span>👑</span> Limpar Belmont Conference
                    </h4>
                    <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                      Apaga todas as mensagens da sala principal oficial. A sala continua ativa e permanente para todos.
                    </p>
                  </div>
                  <button
                    onClick={handleClearBelmontChat}
                    disabled={actionLoading}
                    className="mt-5 w-full py-3 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-600/30 transition-all"
                  >
                    {actionLoading ? 'Limpando...' : '🧹 Limpar Mensagens da Belmont'}
                  </button>
                </div>

                <div className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between shadow-xl">
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <span>⚠️</span> Limpeza Geral de Mensagens
                    </h4>
                    <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                      Reinicia o histórico global de mensagens de todas as conversas do sistema.
                    </p>
                  </div>
                  <button
                    onClick={handleClearAllMessages}
                    disabled={actionLoading}
                    className="mt-5 w-full py-3 rounded-2xl bg-slate-800 hover:bg-rose-900 text-rose-300 hover:text-white border border-rose-500/40 text-xs font-bold transition-all"
                  >
                    {actionLoading ? 'Processando...' : '☢️ Limpeza Completa Geral'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ABA 7: TRANSMISSÃO BELMONT */}
          {activeTab === 'broadcast' && (
            <form onSubmit={handleSendBroadcast} className="space-y-3.5 p-5 rounded-3xl bg-slate-900/90 border border-rose-500/30 shadow-xl">
              <div className="p-3.5 rounded-2xl bg-brand-500/10 border border-brand-500/30 text-xs text-brand-300">
                Envie um comunicado oficial em destaque diretamente na sala <strong>BELMONT CONFERENCE</strong> para todos os membros.
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Título do Comunicado</label>
                <input
                  type="text"
                  value={broadcastTitle}
                  onChange={(e) => setBroadcastTitle(e.target.value)}
                  placeholder="Ex: Atualização do Sistema, Novas Regras..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-background-dark border border-slate-700 text-xs text-white focus:border-rose-500"
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
                  className="w-full px-3.5 py-2.5 rounded-xl bg-background-dark border border-slate-700 text-xs text-white focus:border-rose-500 resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={actionLoading}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 text-white font-extrabold text-xs shadow-xl shadow-rose-600/30 transition-all flex items-center justify-center gap-2"
              >
                <Radio className="w-4 h-4 animate-pulse" /> Enviar Transmissão Oficial
              </button>
            </form>
          )}
        </div>

        {/* Modal Flutuante para Conceder Moedas */}
        {selectedUserForCoins && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn">
            <div className="w-full max-w-sm rounded-3xl p-6 border border-amber-500/50 bg-slate-900 shadow-2xl space-y-4">
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
                    className={`py-2 rounded-xl text-xs font-bold border transition-colors ${
                      customCoinsAmount === amt
                        ? 'bg-amber-500 text-black border-amber-400 shadow'
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
                className="w-full px-3.5 py-2 rounded-xl bg-background-dark border border-slate-700 text-xs text-white"
              />

              <button
                type="button"
                onClick={() => handleGiveCoins(selectedUserForCoins.id, customCoinsAmount)}
                disabled={actionLoading}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-black font-extrabold text-xs shadow-lg shadow-amber-500/20"
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
