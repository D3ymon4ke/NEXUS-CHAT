import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useChat } from '../../context/ChatContext';
import { supabase, isSupabaseConfigured } from '../../lib/supabaseClient';
import { sounds } from '../../lib/sound';
import { compressImageFile } from '../../lib/imageCompressor';
import { SHOP_CATALOG, registerDynamicFrames, getFrameAsset, getFrameStyle } from '../../lib/shopCatalog';
import { MarkdownRenderer } from '../common/MarkdownRenderer';
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
  Award,
  Upload,
  Gift,
  Link,
  Copy,
  RefreshCw,
  SlidersHorizontal,
  FolderUp,
  ExternalLink
} from 'lucide-react';

const BELMONT_ID = '00000000-0000-0000-0000-000000000001';
const BADGE_OPTIONS = ['PATCH', 'ATUALIZAÇÃO', 'NOVIDADE', 'EVENTO', 'CORREÇÃO', 'ANÚNCIO'];

export function AdminModal({ isOpen, onClose }) {
  const { user } = useAuth();
  const { loadConversations, clearMessages } = useChat();

  const [activeTab, setActiveTab] = useState('shop'); // 'stats' | 'shop' | 'promotions' | 'chat_master' | 'users' | 'patches' | 'cleanup' | 'broadcast'
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [shopItems, setShopItems] = useState([]);
  const [patchNotesList, setPatchNotesList] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [shopSearchQuery, setShopSearchQuery] = useState('');
  const [shopCategoryFilter, setShopCategoryFilter] = useState('frames'); // 'frames' | 'all' | 'wallpapers' | 'bubbles' | 'badges' | 'name_colors'
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState({ text: '', type: '' });

  // Substate Conceder Moedas
  const [selectedUserForCoins, setSelectedUserForCoins] = useState(null);
  const [customCoinsAmount, setCustomCoinsAmount] = useState('100');

  // Substate Transmissão
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');

  // Substate Criar/Editar Moldura & Itens na Loja
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState('frames');
  const [newItemDesc, setNewItemDesc] = useState('');
  const [newItemPrice, setNewItemPrice] = useState(250);
  const [newItemIcon, setNewItemIcon] = useState('✨');
  const [newItemCss, setNewItemCss] = useState('');
  const [editingItemId, setEditingItemId] = useState(null);

  // Substate Upload de Molduras & Live Simulator
  const [frameUploadType, setFrameUploadType] = useState('upload'); // 'upload' | 'url' | 'css'
  const [frameImageFile, setFrameImageFile] = useState(null);
  const [frameImagePreview, setFrameImagePreview] = useState('');
  const [frameImageUrl, setFrameImageUrl] = useState('');
  const [frameCssClass, setFrameCssClass] = useState('border-2 border-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.8)] animate-pulse');
  const [isDraggingFrame, setIsDraggingFrame] = useState(false);
  const [previewSimulatorSize, setPreviewSimulatorSize] = useState('lg'); // 'sm' | 'md' | 'lg' | 'xl'
  const [previewSimulatorAvatarIndex, setPreviewSimulatorAvatarIndex] = useState(0);

  // Substate Concessão de Moldura Direta
  const [grantModalItem, setGrantModalItem] = useState(null);
  const [grantTargetUserId, setGrantTargetUserId] = useState('all');

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
        if (data) registerDynamicFrames(data);
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
      const compressedBase64 = await compressImageFile(file, 512, 512, 0.88);

      if (compressedBase64 && isSupabaseConfigured && supabase) {
        const { data, error } = await supabase
          .from('profiles')
          .update({ avatar_url: compressedBase64 })
          .eq('id', targetUserId)
          .select();

        if (error) throw error;

        setUsers((prev) =>
          prev.map((u) => (u.id === targetUserId ? { ...u, avatar_url: compressedBase64 } : u))
        );
        sounds.playPop();
        setFeedback({ text: 'Foto de perfil do usuário atualizada e salva com sucesso!', type: 'success' });
      }
    } catch (err) {
      console.error('Erro ao atualizar foto pelo admin:', err);
      setFeedback({ text: 'Erro ao atualizar foto: ' + (err.message || ''), type: 'error' });
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

  const handleFrameFileSelect = (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setFeedback({ text: 'Por favor, selecione um arquivo de imagem válido (.gif, .png, .webp, .svg)', type: 'error' });
      return;
    }

    setFrameImageFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      setFrameImagePreview(e.target.result);
      if (!newItemName.trim()) {
        const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
        setNewItemName(cleanName.charAt(0).toUpperCase() + cleanName.slice(1));
      }
      if (file.type.includes('gif')) {
        setNewItemIcon('✨');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveShopItem = async (e) => {
    e.preventDefault();
    if (!newItemName.trim()) {
      setFeedback({ text: 'Por favor, informe o nome do item ou moldura.', type: 'error' });
      return;
    }

    try {
      setActionLoading(true);
      let finalImageUrl = null;

      if (newItemCategory === 'frames') {
        if (frameUploadType === 'upload') {
          if (frameImageFile) {
            // Tentar upload para o bucket chat-media do Supabase
            if (isSupabaseConfigured && supabase) {
              try {
                const ext = frameImageFile.name.split('.').pop() || 'png';
                const cleanFileName = `frames/${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;
                const { data: uploadData, error: uploadErr } = await supabase.storage
                  .from('chat-media')
                  .upload(cleanFileName, frameImageFile, {
                    contentType: frameImageFile.type || 'image/png',
                    upsert: true
                  });

                if (!uploadErr && uploadData) {
                  const { data: pubData } = supabase.storage
                    .from('chat-media')
                    .getPublicUrl(cleanFileName);
                  finalImageUrl = pubData?.publicUrl;
                }
              } catch (storageErr) {
                console.warn('Storage upload falhou, usando fallback em DataURL:', storageErr);
              }
            }

            if (!finalImageUrl) {
              finalImageUrl = frameImagePreview;
            }
          } else if (frameImagePreview) {
            finalImageUrl = frameImagePreview;
          }
        } else if (frameUploadType === 'url') {
          finalImageUrl = frameImageUrl.trim();
        }
      }

      const itemPayload = {
        name: newItemName.trim(),
        category: newItemCategory,
        description: newItemDesc.trim() || (newItemCategory === 'frames' ? 'Moldura animada exclusiva do Nexus Chat' : 'Item oficial da Loja Nexus'),
        price: Math.max(0, parseInt(newItemPrice, 10) || 0),
        icon: newItemIcon.trim() || '✨',
        css_class: frameUploadType === 'css' || newItemCategory !== 'frames' ? (newItemCss.trim() || frameCssClass.trim()) : null,
        image_url: finalImageUrl || (frameUploadType === 'url' ? frameImageUrl : null),
        is_active: true
      };

      if (editingItemId) {
        if (isSupabaseConfigured && supabase) {
          const { error } = await supabase
            .from('shop_items')
            .update(itemPayload)
            .eq('id', editingItemId);
          if (error) throw error;
        }

        setFeedback({ text: `Item "${newItemName}" atualizado com sucesso!`, type: 'success' });
      } else {
        const newId = newItemCategory === 'frames' ? `frame_${Date.now()}` : `item_${Date.now()}`;
        if (isSupabaseConfigured && supabase) {
          const { error } = await supabase
            .from('shop_items')
            .insert({ id: newId, ...itemPayload });
          if (error) throw error;
        }

        setFeedback({ text: `Moldura / Item "${newItemName}" publicado na Loja com sucesso!`, type: 'success' });
      }

      sounds.playPop();
      confetti({ particleCount: 60, spread: 60, origin: { y: 0.6 } });

      handleCancelEdit();
      loadShopItems();
    } catch (err) {
      console.error('Erro ao salvar item:', err);
      setFeedback({ text: 'Erro ao salvar item: ' + (err.message || ''), type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleStartEditItem = (item) => {
    setEditingItemId(item.id);
    setNewItemName(item.name || '');
    setNewItemCategory(item.category || 'frames');
    setNewItemDesc(item.description || '');
    setNewItemPrice(item.price ?? 200);
    setNewItemIcon(item.icon || '✨');
    setNewItemCss(item.css_class || item.cssClass || '');
    setFrameCssClass(item.css_class || item.cssClass || '');

    const img = item.image_url || item.imageUrl || item.image;
    if (img) {
      setFrameImagePreview(img);
      if (img.startsWith('http')) {
        setFrameUploadType('url');
        setFrameImageUrl(img);
      } else {
        setFrameUploadType('upload');
      }
    } else if (item.css_class || item.cssClass) {
      setFrameUploadType('css');
    }
  };

  const handleCancelEdit = () => {
    setEditingItemId(null);
    setNewItemName('');
    setNewItemDesc('');
    setNewItemPrice(250);
    setNewItemIcon('✨');
    setNewItemCss('');
    setFrameImageFile(null);
    setFrameImagePreview('');
    setFrameImageUrl('');
    setFrameCssClass('border-2 border-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.8)] animate-pulse');
  };

  const handleGrantItemToUsers = async () => {
    if (!grantModalItem) return;
    try {
      setActionLoading(true);
      const itemId = grantModalItem.id;

      if (isSupabaseConfigured && supabase) {
        if (grantTargetUserId === 'all') {
          // Conceder para todos os membros
          const { data: allProfiles, error: fetchErr } = await supabase.from('profiles').select('id, unlocked_items');
          if (fetchErr) throw fetchErr;

          const updates = (allProfiles || []).map(p => {
            const currentUnlocked = p.unlocked_items || [];
            if (!currentUnlocked.includes(itemId)) {
              return supabase.from('profiles').update({
                unlocked_items: [...currentUnlocked, itemId]
              }).eq('id', p.id);
            }
            return null;
          }).filter(Boolean);

          await Promise.all(updates);
          setFeedback({ text: `🎉 Moldura "${grantModalItem.name}" concedida com sucesso para TODOS os membros (${updates.length} contas atualizadas)!`, type: 'success' });
        } else {
          // Conceder para usuário específico
          const { data: targetProfile, error: fetchErr } = await supabase.from('profiles').select('unlocked_items, username, display_name').eq('id', grantTargetUserId).single();
          if (fetchErr) throw fetchErr;

          const currentUnlocked = targetProfile?.unlocked_items || [];
          if (!currentUnlocked.includes(itemId)) {
            await supabase.from('profiles').update({
              unlocked_items: [...currentUnlocked, itemId]
            }).eq('id', grantTargetUserId);
          }
          setFeedback({ text: `🎁 Moldura "${grantModalItem.name}" concedida para ${targetProfile?.display_name || targetProfile?.username || 'usuário'}!`, type: 'success' });
        }
      }

      sounds.playPop();
      confetti({ particleCount: 70, spread: 70, origin: { y: 0.6 } });
      setGrantModalItem(null);
      loadAdminData();
    } catch (err) {
      console.error('Erro ao conceder moldura:', err);
      setFeedback({ text: 'Erro ao conceder moldura: ' + (err.message || ''), type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleTestEquipOnAdmin = async (item) => {
    try {
      if (!user) return;
      const frameKey = item.id;
      if (isSupabaseConfigured && supabase) {
        await supabase.from('profiles').update({ equipped_frame: frameKey }).eq('id', user.id);
      }
      sounds.playPop();
      setFeedback({ text: `✨ Moldura "${item.name}" equipada no seu avatar para teste em tempo real!`, type: 'success' });
      loadAdminData();
    } catch (err) {
      console.error('Erro ao equipar moldura:', err);
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
      desc: 'Acesso prioritário a recursos experimentais + Moldura BETA TESTER',
      coins: '150',
      frame: 'frame_beta',
      frameName: 'Moldura Holográfica BETA TESTER 🧪'
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

      // Vincular moldura especial caso seja BETA TESTER
      const isBetaTester = effectiveTitle === 'BETA TESTER' || promoBadge === 'badge_beta_tester';
      const grantedFrame = isBetaTester ? 'frame_beta' : null;

      const currentUnlocked = targetUser.unlocked_items || ['frame_default', 'bubble_default', 'wallpaper_default'];
      const newUnlocked = grantedFrame && !currentUnlocked.includes(grantedFrame)
        ? [...currentUnlocked, grantedFrame]
        : currentUnlocked;

      const pendingReward = {
        title: effectiveTitle,
        badge: promoBadge,
        bonus: bonus,
        frame: grantedFrame,
        frameName: grantedFrame ? 'Moldura Exclusiva BETA TESTER 🧪' : null,
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
            unlocked_items: newUnlocked,
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
          const broadcastMsg = `👑 **CONDECORAÇÃO OFICIAL NEXUS**\n\n🎉 O membro **@${targetUser.username}** (${targetUser.display_name || targetUser.username}) foi condecorado pelo Administrador com o título de **⭐ ${effectiveTitle}**${grantedFrame ? ' e recebeu a Moldura Exclusiva BETA TESTER 🧪' : ''}!\n\n💬 *"${promoMessage.trim()}"*`;
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

  const [copiedBetaLink, setCopiedBetaLink] = useState(false);
  const handleCopyBetaLink = () => {
    const betaUrl = typeof window !== 'undefined' ? `${window.location.origin}/?beta=true` : 'https://nexus-chat.vercel.app/?beta=true';
    navigator.clipboard.writeText(betaUrl);
    sounds.playPop();
    setCopiedBetaLink(true);
    setFeedback({ text: 'Link oficial de registro para Testadores Beta copiado!', type: 'success' });
    setTimeout(() => setCopiedBetaLink(false), 2500);
  };

  const handleApproveBeta = async (targetUser) => {
    try {
      setActionLoading(true);
      const currentUnlocked = targetUser.unlocked_items || ['frame_default', 'bubble_default', 'wallpaper_default'];
      const newUnlocked = currentUnlocked.includes('frame_beta') ? currentUnlocked : [...currentUnlocked, 'frame_beta'];

      const pendingReward = {
        title: 'BETA TESTER',
        badge: 'badge_beta_tester',
        bonus: 150,
        frame: 'frame_beta',
        frameName: 'Moldura Exclusiva BETA TESTER 🧪',
        message: 'Sua inscrição para o Programa de Testadores Beta foi aprovada pelo Administrador Damon! Aproveite a moldura holográfica exclusiva e suas permissões VIP!',
        adminName: user?.display_name || user?.username || 'Damon',
        grantedAt: new Date().toISOString()
      };

      if (isSupabaseConfigured && supabase) {
        const { error: updErr } = await supabase
          .from('profiles')
          .update({
            beta_status: 'approved',
            beta_approved_at: new Date().toISOString(),
            custom_title: 'BETA TESTER',
            equipped_badge: 'badge_beta_tester',
            equipped_frame: 'frame_beta',
            unlocked_items: newUnlocked,
            nexus_coins: (targetUser.nexus_coins || 0) + 150,
            title_reward_pending: JSON.stringify(pendingReward)
          })
          .eq('id', targetUser.id);

        if (updErr) throw updErr;

        await supabase.from('nexus_transactions').insert({
          user_id: targetUser.id,
          amount: 150,
          type: 'beta_approval_bonus',
          description: 'Bônus de Boas-Vindas ao Programa Beta Tester 🧪'
        });

        const broadcastMsg = `🧪 **NOVO TESTADOR BETA OFICIAL!**\n\n🎉 O membro **@${targetUser.username}** (${targetUser.display_name || targetUser.username}) teve sua candidatura aprovada e agora é um **🧪 BETA TESTER VIP** com a Moldura Holográfica exclusiva!\n\n👑 *Aprovado por ${user?.display_name || 'Admin Damon'}*`;
        await supabase.from('messages').insert({
          conversation_id: BELMONT_ID,
          sender_id: user.id,
          content: broadcastMsg,
          type: 'text'
        });
      }

      sounds.playPop();
      confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
      setFeedback({ text: `🎉 @${targetUser.username} foi aprovado com sucesso como Testador Beta!`, type: 'success' });
      loadAdminData();
    } catch (err) {
      console.error('Erro ao aprovar testador beta:', err);
      setFeedback({ text: 'Erro ao aprovar: ' + (err.message || ''), type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectBeta = async (targetUser) => {
    if (!window.confirm(`Deseja recusar a candidatura de @${targetUser.username}?`)) return;
    try {
      setActionLoading(true);
      if (isSupabaseConfigured && supabase) {
        await supabase
          .from('profiles')
          .update({ beta_status: 'rejected' })
          .eq('id', targetUser.id);
      }
      setFeedback({ text: `Candidatura de @${targetUser.username} recusada.`, type: 'info' });
      loadAdminData();
    } catch (err) {
      setFeedback({ text: 'Erro ao recusar candidatura.', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  if (!isOpen || !user) return null;

  const filteredUsers = users.filter(u =>
    (u.display_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.username || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.email || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const SIMULATOR_AVATARS = [
    { label: 'Meu Avatar', src: user?.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${user?.id || 'admin'}` },
    { label: 'Cyber Ninja', src: 'https://api.dicebear.com/7.x/bottts/svg?seed=cyber-ninja' },
    { label: 'Belmont Real', src: 'https://api.dicebear.com/7.x/bottts/svg?seed=belmont-emperor' },
    { label: 'Garota Anime', src: 'https://api.dicebear.com/7.x/bottts/svg?seed=sakura' }
  ];

  const currentSimulatorAvatar = SIMULATOR_AVATARS[previewSimulatorAvatarIndex] || SIMULATOR_AVATARS[0];

  // Unificar catálogo completo (itens do banco + itens nativos com status)
  const allCombinedShopItems = [
    ...shopItems.map(item => ({ ...item, isCustom: true })),
    ...SHOP_CATALOG.filter(native => !shopItems.some(si => si.id === native.id)).map(native => ({
      id: native.id,
      name: native.name,
      category: native.category,
      description: native.description,
      price: native.price,
      icon: native.icon || '✨',
      css_class: native.cssClass || '',
      image_url: native.image || null,
      isCustom: false,
      is_active: true
    }))
  ];

  const filteredShopItems = allCombinedShopItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(shopSearchQuery.toLowerCase()) ||
      (item.description || '').toLowerCase().includes(shopSearchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(shopSearchQuery.toLowerCase());

    if (!matchesSearch) return false;
    if (shopCategoryFilter === 'all') return true;
    return item.category === shopCategoryFilter;
  });

  const impersonatedUserObj = users.find(u => u.id === impersonatedUserId) || user;

  const pendingBetaUsers = users.filter(u => u.beta_status === 'pending');
  const activeBetaUsers = users.filter(u => u.beta_status === 'approved' || u.custom_title === 'BETA TESTER' || u.equipped_badge === 'badge_beta_tester');

  const navTabs = [
    { id: 'shop', label: 'Molduras & Loja', icon: Sparkles, badge: 'Upload' },
    { id: 'beta_testers', label: 'Testadores Beta', icon: Award, badge: pendingBetaUsers.length > 0 ? `${pendingBetaUsers.length} ⏳` : 'Link' },
    { id: 'stats', label: 'Estatísticas', icon: Activity, badge: 'Live' },
    { id: 'promotions', label: 'Nomear Cargos', icon: Crown, badge: 'VIP' },
    { id: 'chat_master', label: 'Super DM Master', icon: Ghost, badge: 'Secreto' },
    { id: 'users', label: 'Usuários & Coins', icon: Users },
    { id: 'patches', label: 'Patch Notes', icon: FileText },
    { id: 'cleanup', label: 'Limpeza de Chat', icon: Trash2 },
    { id: 'broadcast', label: 'Transmissão Belmont', icon: Radio }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/85 backdrop-blur-xl animate-fadeIn select-none overflow-hidden box-border">
      <div className="w-full max-w-5xl rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 md:p-6 shadow-2xl border border-rose-500/40 bg-gradient-to-b from-slate-900/95 via-background-darker/95 to-slate-950/95 flex flex-col h-full max-h-[96vh] sm:max-h-[92vh] overflow-hidden relative backdrop-blur-2xl min-w-0 box-border">
        {/* Glows Decorativos de Fundo */}
        <div className="absolute -top-32 -right-32 w-80 h-80 bg-rose-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Topbar com Identidade Visual Damon Responsiva */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 sm:pb-4 border-b border-slate-800/80 gap-2.5 sm:gap-3 flex-shrink-0 min-w-0">
          <div className="flex items-center justify-between gap-2 min-w-0 w-full sm:w-auto">
            <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0 flex-1">
              <div className="relative flex-shrink-0">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-gradient-to-br from-rose-600 via-red-600 to-amber-600 text-white flex items-center justify-center shadow-lg shadow-rose-600/30 border border-amber-400/50 animate-pulse">
                  <ShieldAlert className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <span className="absolute -bottom-1 -right-1 w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-full bg-emerald-500 border-2 border-slate-900 shadow" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                  <h2 className="text-base sm:text-lg md:text-xl font-extrabold text-white tracking-tight truncate">
                    PAINEL SUPREMO
                  </h2>
                  <span className="text-[9px] sm:text-[10px] px-2 py-0.5 rounded-full bg-gradient-to-r from-rose-600/30 to-amber-600/30 text-rose-300 border border-rose-500/50 font-extrabold uppercase shadow-sm flex-shrink-0">
                    👑 Damon Access
                  </span>
                </div>
                <p className="text-[11px] sm:text-xs text-slate-400 truncate hidden xs:block">
                  Controle total de economia, super dms, catálogo e moderação
                </p>
              </div>
            </div>

            {/* Botão Fechar no Mobile */}
            <button
              onClick={onClose}
              className="sm:hidden p-1.5 rounded-xl text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-800 transition-all border border-slate-700/60 flex-shrink-0"
              title="Fechar painel"
              aria-label="Fechar painel"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Botão Fechar no Desktop */}
          <button
            onClick={onClose}
            className="hidden sm:flex p-2 rounded-2xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition-all border border-slate-800 flex-shrink-0"
            title="Fechar painel"
            aria-label="Fechar painel"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback Alert */}
        {feedback.text && (
          <div
            className={`my-2.5 p-2.5 sm:p-3 rounded-xl sm:rounded-2xl text-xs font-semibold flex items-center justify-between animate-fadeIn flex-shrink-0 ${
              feedback.type === 'success'
                ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 shadow-lg shadow-emerald-500/10'
                : 'bg-rose-500/15 border border-rose-500/30 text-rose-300 shadow-lg shadow-rose-500/10'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0 flex-1 mr-2">
              <span className="flex-shrink-0">{feedback.type === 'success' ? '✨' : '⚠️'}</span>
              <span className="truncate">{feedback.text}</span>
            </div>
            <button onClick={() => setFeedback({ text: '', type: '' })} className="opacity-75 hover:opacity-100 flex-shrink-0 p-1">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Barra de Abas Estilizada com Pills Modernos */}
        <div className="flex bg-slate-900/80 p-1 sm:p-1.5 rounded-xl sm:rounded-2xl border border-slate-800/80 my-2.5 sm:my-3.5 overflow-x-auto no-scrollbar gap-1 flex-shrink-0 w-full max-w-full box-border">
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
                className={`py-1.5 sm:py-2 px-2.5 sm:px-3.5 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap flex-shrink-0 ${
                  isActive
                    ? 'bg-gradient-to-r from-rose-600 via-red-600 to-rose-700 text-white shadow-lg shadow-rose-600/30 border border-rose-400/40'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-extrabold uppercase flex-shrink-0 ${
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
        <div className="flex-1 overflow-y-auto pr-1 space-y-3 sm:space-y-4 min-h-[220px] sm:min-h-[320px] min-w-0 w-full max-w-full box-border">
          {/* ABA 1: ESTATÍSTICAS & STATUS */}
          {activeTab === 'stats' && stats && (
            <div className="space-y-3 sm:space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3.5 w-full max-w-full">
                <div className="p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-slate-900 to-slate-900/60 border border-slate-800 shadow-xl relative overflow-hidden group hover:border-slate-700 transition-all min-w-0 box-border">
                  <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                    <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">Total de Membros</span>
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-brand-500/15 border border-brand-500/30 flex items-center justify-center text-brand-400 flex-shrink-0">
                      <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </div>
                  </div>
                  <div className="text-2xl sm:text-3xl font-extrabold text-white">{stats.totalUsers}</div>
                  <p className="text-[10px] sm:text-[11px] text-slate-500 mt-0.5 sm:mt-1 truncate">Usuários registrados no sistema</p>
                </div>

                <div className="p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-slate-900 to-slate-900/60 border border-slate-800 shadow-xl relative overflow-hidden group hover:border-slate-700 transition-all min-w-0 box-border">
                  <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                    <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">Mensagens Enviadas</span>
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 flex-shrink-0">
                      <MessageSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </div>
                  </div>
                  <div className="text-2xl sm:text-3xl font-extrabold text-white">{stats.totalMessages}</div>
                  <p className="text-[10px] sm:text-[11px] text-slate-500 mt-0.5 sm:mt-1 truncate">Volume global de mensagens</p>
                </div>

                <div className="p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-slate-900 to-slate-900/60 border border-slate-800 shadow-xl relative overflow-hidden group hover:border-slate-700 transition-all min-w-0 box-border">
                  <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                    <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">Nexus Coins Ativas</span>
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 flex-shrink-0">
                      <Coins className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </div>
                  </div>
                  <div className="text-2xl sm:text-3xl font-extrabold text-amber-300 flex items-center gap-1.5">
                    <img src="/nexus-coin.jpg" alt="Moeda" className="w-5 h-5 sm:w-6 sm:h-6 rounded-full flex-shrink-0" />
                    <span className="truncate">{stats.totalCoinsInEconomy}</span>
                  </div>
                  <p className="text-[10px] sm:text-[11px] text-slate-500 mt-0.5 sm:mt-1 truncate">Saldo em circulação na economia</p>
                </div>
              </div>

              {/* Status do Servidor & VPS */}
              <div className="p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl bg-gradient-to-r from-slate-900 via-slate-900/80 to-emerald-950/40 border border-emerald-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 shadow-xl min-w-0 box-border">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/40 flex-shrink-0">
                    <Server className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-emerald-400 flex items-center gap-1.5 truncate">
                      <CheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" /> <span className="truncate">Servidor & VPS Belmont</span>
                    </div>
                    <div className="text-[11px] sm:text-xs text-slate-300 mt-0.5 truncate">{stats.vpsStatus}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 w-full sm:w-auto justify-end">
                  <span className="px-3 py-1 rounded-xl bg-emerald-500/20 text-emerald-300 text-[11px] sm:text-xs font-bold border border-emerald-500/40 shadow-sm">
                    Uptime: {stats.serverUptime}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ABA: NOMEAR CARGOS & CONDECORAÇÃO OFICIAL 👑 */}
          {activeTab === 'promotions' && (
            <div className="space-y-3 sm:space-y-4 min-w-0">
              {/* Banner de Apresentação */}
              <div className="p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl bg-gradient-to-r from-amber-950/50 via-slate-900 to-yellow-950/50 border border-amber-500/40 flex items-center justify-between gap-3 shadow-xl min-w-0 box-border">
                <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-amber-500/20 text-amber-300 flex items-center justify-center border border-amber-500/40 flex-shrink-0">
                    <Crown className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-xs font-extrabold text-amber-300 uppercase tracking-wide truncate">
                      Concessão de Cargos, Títulos & Badges
                    </h3>
                    <p className="text-[10px] sm:text-[11px] text-slate-400 truncate">
                      Ao nomear um membro, um popup festivo aparecerá na tela dele!
                    </p>
                  </div>
                </div>
              </div>

              {/* Formulário de Condecoração */}
              <form onSubmit={handleBestowPromotion} className="p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl bg-slate-900/90 border border-slate-800 space-y-3 sm:space-y-4 min-w-0 box-border">
                <h4 className="text-xs font-extrabold text-white flex items-center gap-1.5 sm:gap-2 truncate">
                  <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400 flex-shrink-0" />
                  <span className="truncate">1. Selecionar Membro & Cargo a ser Concedido</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3.5">
                  {/* Escolha do Usuário */}
                  <div className="min-w-0">
                    <label className="text-[10px] font-bold text-slate-300 uppercase block mb-1">
                      Membro a ser Condecorado:
                    </label>
                    <select
                      value={promoUserId}
                      onChange={(e) => setPromoUserId(e.target.value)}
                      required
                      className="w-full px-3 py-2 rounded-xl bg-background-dark border border-slate-700 text-xs text-white focus:border-amber-500 font-semibold"
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
                  <div className="min-w-0">
                    <label className="text-[10px] font-bold text-slate-300 uppercase block mb-1">
                      Bônus de Moedas:
                    </label>
                    <div className="flex gap-1.5 sm:gap-2">
                      {['100', '250', '500'].map((amt) => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => setPromoBonusCoins(amt)}
                          className={`flex-1 py-1.5 sm:py-2 rounded-xl text-xs font-bold border transition-colors ${
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
                <div className="min-w-0">
                  <label className="text-[10px] font-bold text-slate-300 uppercase block mb-1">
                    Escolha o Cargo / Título Oficial:
                  </label>
                  <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-2">
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
                          className={`p-2.5 sm:p-3 rounded-xl sm:rounded-2xl text-left border transition-all min-w-0 ${
                            isSelected
                              ? 'bg-amber-500/20 border-amber-400 text-amber-200 shadow-md ring-1 ring-amber-400'
                              : 'bg-background-dark/80 border-slate-800 text-slate-300 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 font-bold text-xs truncate">
                            <span className="flex-shrink-0">{preset.icon}</span>
                            <span className="truncate">{preset.title === 'custom' ? 'Customizado' : preset.title}</span>
                          </div>
                          <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">{preset.desc}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Campo se for Título Customizado */}
                {promoTitle === 'custom' && (
                  <div className="min-w-0">
                    <label className="text-[10px] font-bold text-slate-300 uppercase block mb-1">
                      Nome do Título Customizado:
                    </label>
                    <input
                      type="text"
                      value={promoCustomTitle}
                      onChange={(e) => setPromoCustomTitle(e.target.value)}
                      placeholder="Ex: Mestre Supremo, Guardião, Diretor..."
                      required
                      className="w-full px-3 py-2 rounded-xl bg-background-dark border border-slate-700 text-xs text-white focus:border-amber-500 font-bold"
                    />
                  </div>
                )}

                {/* Mensagem Personalizada de Condecoração */}
                <div className="min-w-0">
                  <label className="text-[10px] font-bold text-slate-300 uppercase block mb-1">
                    Mensagem de Condecoração (Aparecerá no Popup):
                  </label>
                  <textarea
                    rows={2}
                    value={promoMessage}
                    onChange={(e) => setPromoMessage(e.target.value)}
                    placeholder="Escreva a mensagem congratulatória..."
                    className="w-full px-3 py-2 rounded-xl bg-background-dark border border-slate-700 text-xs text-white focus:border-amber-500 resize-none"
                  />
                </div>

                {/* Opção de Anúncio no Belmont Conference */}
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="promoBroadcast"
                    checked={promoBroadcast}
                    onChange={(e) => setPromoBroadcast(e.target.checked)}
                    className="rounded border-slate-700 text-amber-500 focus:ring-amber-400 flex-shrink-0"
                  />
                  <label htmlFor="promoBroadcast" className="text-[11px] sm:text-xs text-slate-300 cursor-pointer">
                    Emitir anúncio de condecoração no Belmont Conference
                  </label>
                </div>

                {/* Botão de Envio */}
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="w-full py-2.5 sm:py-3 rounded-xl sm:rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs shadow-lg transition-all flex items-center justify-center gap-1.5 active:scale-95"
                >
                  <Award className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">Conceder Cargo & Emitir Popup 🎉</span>
                </button>
              </form>

              {/* Tabela de Usuários Condecorados com Cargos Atuais */}
              <div className="p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl bg-slate-900/90 border border-slate-800 space-y-2.5 sm:space-y-3 min-w-0 box-border">
                <h4 className="text-xs font-extrabold text-white flex items-center justify-between">
                  <span className="flex items-center gap-1.5 sm:gap-2 truncate">
                    <Crown className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400 flex-shrink-0" />
                    <span className="truncate">Membros Condecorados</span>
                  </span>
                  <span className="text-[10px] text-slate-400 flex-shrink-0">
                    {users.filter(u => u.custom_title || u.role === 'moderator').length} condecorados
                  </span>
                </h4>

                <div className="space-y-1.5 sm:space-y-2 max-h-56 overflow-y-auto pr-1">
                  {users.filter(u => u.custom_title || u.role === 'moderator' || u.role === 'admin').map((u) => (
                    <div
                      key={u.id}
                      className="p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-background-dark border border-slate-800 flex items-center justify-between text-xs gap-2 min-w-0"
                    >
                      <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                        <img
                          src={u.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${u.id}`}
                          alt="avatar"
                          className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover border border-slate-700 flex-shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-white truncate">{u.display_name || u.username}</span>
                            <span className="text-[10px] text-slate-400 truncate">@{u.username}</span>
                          </div>
                          <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                            {u.custom_title && (
                              <span className="text-[8px] sm:text-[9px] px-1.5 sm:px-2 py-0.2 rounded-full bg-amber-500/20 text-amber-300 font-extrabold border border-amber-500/30 truncate">
                                ⭐ {u.custom_title}
                              </span>
                            )}
                            {u.role === 'moderator' && !u.custom_title && (
                              <span className="text-[8px] sm:text-[9px] px-1.5 sm:px-2 py-0.2 rounded-full bg-indigo-500/20 text-indigo-300 font-extrabold border border-indigo-500/30 flex-shrink-0">
                                🛡️ MOD
                              </span>
                            )}
                            {u.role === 'admin' && (
                              <span className="text-[8px] sm:text-[9px] px-1.5 sm:px-2 py-0.2 rounded-full bg-rose-500/20 text-rose-300 font-extrabold border border-rose-500/30 flex-shrink-0">
                                👑 ADMIN
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {u.username !== 'damon' && (u.custom_title || u.role === 'moderator') && (
                        <button
                          type="button"
                          onClick={() => handleRevokePromotion(u.id)}
                          className="px-2 sm:px-2.5 py-1 rounded-xl text-[10px] font-bold text-rose-400 hover:text-white bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 transition-colors flex-shrink-0"
                        >
                          Revogar
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ABA: GESTÃO DE TESTADORES BETA & LINK DE REGISTRO EXCLUSIVO */}
          {activeTab === 'beta_testers' && (
            <div className="space-y-3 sm:space-y-4 min-w-0">
              {/* Card 1: Gerador e Compartilhamento de Link de Inscrição */}
              <div className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-gradient-to-r from-cyan-950/50 via-slate-900 to-teal-950/40 border border-cyan-500/40 shadow-xl space-y-3 min-w-0 box-border">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-cyan-500 to-teal-600 flex items-center justify-center text-slate-950 text-xl font-black shadow-lg shadow-cyan-500/30 flex-shrink-0">
                      🧪
                    </div>
                    <div>
                      <h3 className="text-xs sm:text-sm font-extrabold text-white uppercase tracking-wide flex items-center gap-1.5">
                        Link de Convite Oficial para Testador Beta
                      </h3>
                      <p className="text-[10px] sm:text-[11px] text-slate-300">
                        Envie este link para novos membros se candidatarem como Testador Beta.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleCopyBetaLink}
                    className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 shadow-md active:scale-95 flex-shrink-0 ${
                      copiedBetaLink
                        ? 'bg-emerald-500 text-slate-950 shadow-emerald-500/30'
                        : 'bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 text-slate-950 shadow-cyan-500/30'
                    }`}
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>{copiedBetaLink ? 'Link Copiado! 🎉' : 'Copiar Link de Convite Beta'}</span>
                  </button>
                </div>

                {/* Exibição da URL */}
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-black/50 border border-cyan-500/20 text-xs font-mono text-cyan-300 break-all select-all">
                  <Link className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                  <span className="truncate">
                    {typeof window !== 'undefined' ? `${window.location.origin}/?beta=true` : 'https://nexus-chat.vercel.app/?beta=true'}
                  </span>
                </div>

                <div className="text-[10px] text-slate-400 bg-slate-950/60 p-2.5 rounded-xl border border-white/5 flex items-center gap-2">
                  <span className="text-amber-400 font-bold">ℹ️ Como funciona:</span>
                  <span>O usuário se cadastra pelo link acima e cai automaticamente na fila de aprovação abaixo. Assim que você confirmar, ele já ganha a <strong>Moldura BETA TESTER</strong> e o cargo VIP!</span>
                </div>
              </div>

              {/* Card 2: Inscrições Pendentes de Análise ({pendingBetaUsers.length}) */}
              <div className="p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl bg-slate-900/90 border border-slate-800 space-y-3 shadow-xl min-w-0 box-border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-amber-400 text-base">⏳</span>
                    <h4 className="text-xs sm:text-sm font-extrabold text-white uppercase tracking-wide">
                      Inscrições Pendentes para Aprovação ({pendingBetaUsers.length})
                    </h4>
                  </div>
                  <button
                    type="button"
                    onClick={loadAdminData}
                    className="text-[10px] text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" /> Atualizar Fila
                  </button>
                </div>

                {pendingBetaUsers.length === 0 ? (
                  <div className="p-6 text-center rounded-2xl bg-slate-950/60 border border-slate-800/80 text-slate-400 text-xs">
                    Nenhuma inscrição pendente no momento. Compartilhe o link de convite acima para receber novas inscrições!
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                    {pendingBetaUsers.map((u) => (
                      <div
                        key={u.id}
                        className="p-3 sm:p-3.5 rounded-2xl bg-slate-950/90 border border-amber-500/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <img
                            src={u.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${u.id}`}
                            alt={u.username}
                            className="w-10 h-10 rounded-full object-cover bg-slate-900 border border-slate-700 flex-shrink-0"
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-xs text-white truncate">{u.display_name || u.username}</span>
                              <span className="text-[10px] px-2 py-0.2 rounded-full bg-cyan-500/20 text-cyan-300 font-extrabold border border-cyan-500/30">
                                @{u.username}
                              </span>
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-bold">
                                Aguardando Aprovação
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-400 block truncate mt-0.5">
                              {u.email} • Inscrito em: {u.created_at ? new Date(u.created_at).toLocaleDateString('pt-BR') : 'Hoje'}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-shrink-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-slate-800">
                          <button
                            type="button"
                            onClick={() => handleRejectBeta(u)}
                            disabled={actionLoading}
                            className="px-2.5 py-1.5 rounded-xl text-[11px] font-bold text-rose-400 hover:text-white bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 transition-all flex-shrink-0"
                          >
                            Recusar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleApproveBeta(u)}
                            disabled={actionLoading}
                            className="px-3.5 py-1.5 rounded-xl text-[11px] font-black text-slate-950 bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-300 shadow-md shadow-emerald-500/20 transition-all flex items-center gap-1.5 flex-shrink-0 active:scale-95"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Aprovar como Beta Tester 🎉</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Card 3: Testadores Beta Aprovados & Ativos ({activeBetaUsers.length}) */}
              <div className="p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl bg-slate-900/90 border border-slate-800 space-y-3 shadow-xl min-w-0 box-border">
                <div className="flex items-center gap-2">
                  <span className="text-cyan-400 text-base">🧪</span>
                  <h4 className="text-xs sm:text-sm font-extrabold text-white uppercase tracking-wide">
                    Testadores Beta Ativos ({activeBetaUsers.length})
                  </h4>
                </div>

                {activeBetaUsers.length === 0 ? (
                  <div className="p-4 text-center text-slate-500 text-xs">
                    Nenhum testador beta ativo no momento.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-[260px] overflow-y-auto pr-1">
                    {activeBetaUsers.map((u) => (
                      <div
                        key={u.id}
                        className="p-3 rounded-2xl bg-slate-950/90 border border-cyan-500/30 flex items-center justify-between gap-2 shadow"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {/* Avatar com Moldura Beta sobreposta */}
                          <div className="relative w-9 h-9 flex-shrink-0 inline-flex items-center justify-center">
                            <img
                              src={u.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${u.id}`}
                              alt={u.username}
                              className="w-8 h-8 rounded-full object-cover bg-slate-900"
                            />
                            <img
                              src="/frames/beta.gif"
                              alt="Moldura Beta"
                              className="absolute -inset-[22%] w-[144%] h-[144%] max-w-none pointer-events-none object-contain z-10 select-none drop-shadow-md"
                            />
                          </div>

                          <div className="min-w-0 flex-1">
                            <span className="text-xs font-bold text-white truncate block">{u.display_name || u.username}</span>
                            <span className="text-[9px] font-extrabold text-cyan-300 uppercase block tracking-wider">
                              🧪 BETA TESTER
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRevokePromotion(u.id)}
                          className="p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors flex-shrink-0"
                          title="Revogar cargo de Beta Tester"
                        >
                          <UserX className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ABA 2: CHAT MASTER SECRETO (FANTASMA & PERSONIFICAÇÃO) */}
          {activeTab === 'chat_master' && (
            <div className="space-y-3 sm:space-y-4 min-w-0">
              <div className="p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl bg-gradient-to-r from-purple-950/50 via-slate-900 to-indigo-950/50 border border-purple-500/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xl min-w-0 box-border">
                <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-purple-500/20 text-purple-300 flex items-center justify-center border border-purple-500/40 flex-shrink-0">
                    <Ghost className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-xs font-extrabold text-purple-300 uppercase tracking-wide truncate">
                      Super DM & Chat Master Fantasma
                    </h3>
                    <p className="text-[10px] sm:text-[11px] text-slate-400 truncate">
                      Espione e responda personificando qualquer usuário.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 bg-black/60 px-3 py-1 rounded-xl border border-purple-500/40 text-[11px] flex-shrink-0">
                  <span className="text-[10px] text-slate-400">Identidade:</span>
                  <strong className="text-amber-300 font-bold truncate max-w-[120px]">{impersonatedUserObj?.display_name || impersonatedUserObj?.username}</strong>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 sm:gap-3.5 min-w-0">
                <div className="md:col-span-5 space-y-2.5 sm:space-y-3 min-w-0">
                  <div className="p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl bg-slate-900/90 border border-slate-800 space-y-2 min-w-0 box-border">
                    <label className="text-[10px] font-extrabold text-amber-300 uppercase block truncate">
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

                  <div className="p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl bg-slate-900/90 border border-slate-800 space-y-2 min-w-0 box-border">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-extrabold text-slate-300 uppercase block truncate">
                        💬 2. Escolha o Alvo:
                      </label>
                      <button
                        type="button"
                        onClick={loadChatMasterData}
                        className="text-[10px] text-purple-400 hover:text-purple-300 font-semibold flex-shrink-0"
                      >
                        🔄 Atualizar
                      </button>
                    </div>

                    <div className="space-y-1.5 max-h-[180px] sm:max-h-[220px] overflow-y-auto pr-1">
                      <div className="text-[9px] font-extrabold text-slate-400 uppercase px-1 pt-0.5">Salas & Grupos</div>
                      {allMasterConversations
                        .filter(c => c.type === 'group' || c.id === BELMONT_ID || c.is_permanent)
                        .map((conv) => {
                          const isBelmont = conv.id === BELMONT_ID || conv.is_permanent;
                          const isSelected = selectedMasterConvId === conv.id;

                          return (
                            <div
                              key={conv.id}
                              onClick={() => setSelectedMasterConvId(conv.id)}
                              className={`p-2 sm:p-2.5 rounded-xl sm:rounded-2xl border text-xs cursor-pointer transition-all min-w-0 ${
                                isSelected
                                  ? 'bg-purple-600/30 border-purple-500 text-white font-bold shadow-md'
                                  : 'bg-background-dark/80 border-slate-800 text-slate-300 hover:border-slate-700'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-1">
                                <span className="truncate">{isBelmont ? '👑 BELMONT CONFERENCE' : conv.name || 'Sala Geral'}</span>
                                <span className="text-[8px] sm:text-[9px] text-amber-400 uppercase font-extrabold flex-shrink-0">{isBelmont ? 'OFICIAL' : 'GRUPO'}</span>
                              </div>
                            </div>
                          );
                        })}

                      <div className="text-[9px] font-extrabold text-slate-400 uppercase px-1 pt-1.5">👥 Usuários (Chat Privado)</div>
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
                              className={`p-1.5 sm:p-2 rounded-xl sm:rounded-2xl border text-xs cursor-pointer transition-all flex items-center justify-between gap-2 min-w-0 ${
                                isSelected
                                  ? 'bg-purple-600/30 border-purple-500 text-white font-bold shadow-md'
                                  : 'bg-background-dark/80 border-slate-800 text-slate-300 hover:border-slate-700'
                              }`}
                            >
                              <div className="flex items-center gap-1.5 min-w-0">
                                <img
                                  src={targetU.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${targetU.id}`}
                                  alt="Avatar"
                                  className="w-5 h-5 sm:w-6 sm:h-6 rounded-lg object-cover border border-slate-700 flex-shrink-0"
                                />
                                <span className="truncate text-[11px] font-semibold">{targetU.display_name || targetU.username}</span>
                              </div>
                              <span className="text-[8px] sm:text-[9px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 font-bold flex-shrink-0">
                                {existingConv ? 'Aberto' : 'Iniciar'}
                              </span>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                </div>

                <div className="md:col-span-7 flex flex-col h-[280px] sm:h-[340px] rounded-2xl sm:rounded-3xl bg-slate-900/90 border border-slate-800 overflow-hidden shadow-xl min-w-0 box-border">
                  <div className="p-2.5 sm:p-3 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between text-xs flex-shrink-0">
                    <span className="font-bold text-slate-200 truncate">
                      Mensagens ({masterMessages.length})
                    </span>
                    <button
                      type="button"
                      onClick={() => loadMasterConversationMessages(selectedMasterConvId)}
                      className="text-[10px] text-purple-400 hover:text-purple-300 font-semibold flex-shrink-0"
                    >
                      🔄 Atualizar
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-2.5 sm:p-3.5 space-y-1.5 sm:space-y-2 text-xs min-w-0">
                    {masterMessages.length === 0 ? (
                      <div className="text-center py-10 sm:py-12 text-slate-500 text-xs">
                        Nenhuma mensagem encontrada nesta conversa.
                      </div>
                    ) : (
                      masterMessages.map((m) => (
                        <div key={m.id} className="p-2 sm:p-2.5 rounded-xl sm:rounded-2xl bg-background-dark/80 border border-slate-800 space-y-0.5 min-w-0">
                          <div className="flex items-center justify-between text-[10px] text-slate-400 gap-1">
                            <strong className="text-amber-300 truncate">{m.sender?.display_name || m.sender?.username || 'Usuário'}</strong>
                            <span className="flex-shrink-0">{new Date(m.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <p className="text-slate-200 break-words">{m.content}</p>
                        </div>
                      ))
                    )}
                  </div>

                  <form onSubmit={handleSendMasterMessage} className="p-2 sm:p-2.5 bg-slate-950 border-t border-slate-800 flex gap-1.5 sm:gap-2 flex-shrink-0 min-w-0">
                    <input
                      type="text"
                      value={masterInputText}
                      onChange={(e) => setMasterInputText(e.target.value)}
                      placeholder={`Enviar como ${impersonatedUserObj?.display_name || 'Usuário'}...`}
                      className="flex-1 min-w-0 px-3 py-1.5 sm:py-2 rounded-xl bg-background-dark border border-slate-700 text-xs text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none"
                    />
                    <button
                      type="submit"
                      disabled={actionLoading || !masterInputText.trim()}
                      className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 text-white font-extrabold text-xs flex items-center gap-1 shadow-lg flex-shrink-0 active:scale-95"
                    >
                      <Send className="w-3.5 h-3.5" /> <span className="hidden xs:inline">Enviar</span>
                    </button>
                  </form>
                </div>
              </div>
            </div>
          )}

          {/* ABA 3: USUÁRIOS & CONCEDER MOEDAS */}
          {activeTab === 'users' && (
            <div className="space-y-2.5 sm:space-y-3.5 min-w-0">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar usuário por nome, username ou email..."
                  className="w-full pl-9 pr-4 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl bg-background-dark border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 shadow-inner"
                />
              </div>

              <div className="space-y-2 max-h-[300px] sm:max-h-[320px] overflow-y-auto pr-1">
                {filteredUsers.map((u) => (
                  <div
                    key={u.id}
                    className="p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-col xs:flex-row xs:items-center justify-between gap-2.5 hover:border-slate-700 transition-all shadow min-w-0 box-border"
                  >
                    <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                      <img
                        src={u.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${u.id}`}
                        alt="avatar"
                        className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl object-cover border border-slate-700 shadow flex-shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-bold text-white truncate max-w-[130px] sm:max-w-none">{u.display_name || u.username}</span>
                          <span className="text-[10px] text-slate-400 truncate">@{u.username}</span>
                          {u.username === 'damon' && (
                            <span className="text-[8px] sm:text-[9px] px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold flex-shrink-0">
                              👑 ADMIN
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-[10px] sm:text-[11px] text-amber-300 font-semibold mt-0.5">
                          <img src="/nexus-coin.jpg" alt="Moeda" className="w-3.5 h-3.5 rounded-full flex-shrink-0" />
                          <span>{u.nexus_coins || 0} Coins</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0 w-full xs:w-auto justify-end">
                      <label
                        className="px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-purple-600/20 text-purple-300 hover:bg-purple-600/30 border border-purple-500/40 text-[11px] sm:text-xs font-bold flex items-center gap-1 transition-all cursor-pointer shadow-sm active:scale-95 flex-1 xs:flex-initial justify-center"
                        title="Trocar a foto de perfil deste usuário"
                      >
                        <Upload className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> <span className="truncate">Foto</span>
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
                        className="px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/40 text-[11px] sm:text-xs font-bold flex items-center gap-1 transition-all shadow-sm active:scale-95 flex-1 xs:flex-initial justify-center"
                      >
                        <PlusCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> <span className="truncate">Moedas</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ABA 1: GERENCIAR MOLDURAS & LOJA NEXUS */}
          {activeTab === 'shop' && (
            <div className="space-y-4 min-w-0">
              {/* Banner Informativo */}
              <div className="p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl bg-gradient-to-r from-amber-950/60 via-slate-900 to-yellow-950/60 border border-amber-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xl min-w-0 box-border">
                <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                  <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-br from-amber-500 to-yellow-600 text-black flex items-center justify-center font-extrabold shadow-lg shadow-amber-500/30 border border-yellow-300 flex-shrink-0">
                    <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 animate-pulse" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-xs sm:text-sm font-extrabold text-amber-300 uppercase tracking-wide truncate">
                        {editingItemId ? '✏️ Editando Moldura / Item' : '✨ Criador & Upload de Molduras'}
                      </h3>
                      <span className="text-[9px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-extrabold border border-amber-500/40">
                        HD / GIF
                      </span>
                    </div>
                    <p className="text-[10px] sm:text-[11px] text-slate-400 truncate">
                      Envie arquivos GIF animados ou PNGs transparentes e teste em tempo real no simulador!
                    </p>
                  </div>
                </div>

                {editingItemId && (
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all border border-slate-700 flex items-center gap-1.5 self-start sm:self-center flex-shrink-0"
                  >
                    <X className="w-3.5 h-3.5" /> Cancelar Edição
                  </button>
                )}
              </div>

              {/* Grid: Formulário de Upload & Criação (Esquerda) + Simulador em Tempo Real (Direita) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 sm:gap-4 min-w-0">
                {/* Coluna do Formulário (7 Colunas) */}
                <form
                  onSubmit={handleSaveShopItem}
                  className="lg:col-span-7 p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl bg-slate-900/90 border border-amber-500/30 space-y-3 sm:space-y-3.5 shadow-xl min-w-0 box-border flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    {/* Linha 1: Nome do Item & Categoria */}
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-2.5">
                      <div className="sm:col-span-7">
                        <label className="text-[10px] text-slate-400 font-bold block mb-1 uppercase tracking-wider">
                          Nome da Moldura / Item
                        </label>
                        <input
                          type="text"
                          required
                          value={newItemName}
                          onChange={(e) => setNewItemName(e.target.value)}
                          placeholder="Ex: Rosas Espectrais, Dragão Neon..."
                          className="w-full px-3 py-2 rounded-xl bg-background-dark border border-slate-700 text-xs text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none"
                        />
                      </div>

                      <div className="sm:col-span-5">
                        <label className="text-[10px] text-slate-400 font-bold block mb-1 uppercase tracking-wider">
                          Categoria
                        </label>
                        <select
                          value={newItemCategory}
                          onChange={(e) => {
                            setNewItemCategory(e.target.value);
                            if (e.target.value === 'frames') setNewItemIcon('✨');
                            else if (e.target.value === 'wallpapers') setNewItemIcon('🌐');
                            else if (e.target.value === 'bubbles') setNewItemIcon('💬');
                            else if (e.target.value === 'badges') setNewItemIcon('👑');
                            else if (e.target.value === 'name_colors') setNewItemIcon('🌈');
                          }}
                          className="w-full px-3 py-2 rounded-xl bg-background-dark border border-slate-700 text-xs text-white focus:border-amber-500 focus:outline-none"
                        >
                          <option value="frames">🖼️ Molduras de Avatar</option>
                          <option value="wallpapers">🌐 Planos de Fundo (Wallpapers)</option>
                          <option value="bubbles">💬 Balões de Chat</option>
                          <option value="badges">👑 Badges & Títulos</option>
                          <option value="name_colors">🌈 Auras de Nome</option>
                        </select>
                      </div>
                    </div>

                    {/* Linha 2: Se for Moldura, escolher o Tipo de Envio (Upload de Arquivo, URL ou CSS) */}
                    {newItemCategory === 'frames' && (
                      <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] font-extrabold text-amber-300 uppercase tracking-wide">
                            Tipo de Moldura
                          </label>
                          <div className="flex bg-slate-900 p-0.5 rounded-xl border border-slate-800 text-[10px]">
                            <button
                              type="button"
                              onClick={() => setFrameUploadType('upload')}
                              className={`px-2.5 py-1 rounded-lg font-bold transition-all flex items-center gap-1 ${
                                frameUploadType === 'upload'
                                  ? 'bg-amber-500 text-black shadow-md'
                                  : 'text-slate-400 hover:text-white'
                              }`}
                            >
                              <Upload className="w-3 h-3" /> Arquivo (Upload)
                            </button>
                            <button
                              type="button"
                              onClick={() => setFrameUploadType('url')}
                              className={`px-2.5 py-1 rounded-lg font-bold transition-all flex items-center gap-1 ${
                                frameUploadType === 'url'
                                  ? 'bg-amber-500 text-black shadow-md'
                                  : 'text-slate-400 hover:text-white'
                              }`}
                            >
                              <Link className="w-3 h-3" /> Link URL
                            </button>
                            <button
                              type="button"
                              onClick={() => setFrameUploadType('css')}
                              className={`px-2.5 py-1 rounded-lg font-bold transition-all flex items-center gap-1 ${
                                frameUploadType === 'css'
                                  ? 'bg-amber-500 text-black shadow-md'
                                  : 'text-slate-400 hover:text-white'
                              }`}
                            >
                              <Sparkles className="w-3 h-3" /> Borda CSS
                            </button>
                          </div>
                        </div>

                        {/* MODO 1: UPLOAD DE ARQUIVO (DRAG AND DROP) */}
                        {frameUploadType === 'upload' && (
                          <div
                            onDragOver={(e) => {
                              e.preventDefault();
                              setIsDraggingFrame(true);
                            }}
                            onDragLeave={() => setIsDraggingFrame(false)}
                            onDrop={(e) => {
                              e.preventDefault();
                              setIsDraggingFrame(false);
                              const file = e.dataTransfer.files?.[0];
                              if (file) handleFrameFileSelect(file);
                            }}
                            className={`border-2 border-dashed rounded-2xl p-3.5 sm:p-4 text-center transition-all cursor-pointer relative ${
                              isDraggingFrame
                                ? 'border-amber-400 bg-amber-500/15 scale-[1.01]'
                                : frameImagePreview
                                ? 'border-emerald-500/50 bg-emerald-950/20'
                                : 'border-slate-700 hover:border-amber-500/50 bg-slate-900/50'
                            }`}
                          >
                            <input
                              type="file"
                              accept="image/*,.gif,.png,.webp,.svg"
                              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleFrameFileSelect(file);
                              }}
                            />
                            {frameImagePreview ? (
                              <div className="flex items-center justify-center gap-3">
                                <div className="relative w-12 h-12 bg-slate-900 rounded-xl p-1 border border-slate-700 flex-shrink-0">
                                  <img
                                    src={frameImagePreview}
                                    alt="Preview"
                                    className="w-full h-full object-contain"
                                  />
                                </div>
                                <div className="text-left min-w-0 flex-1">
                                  <span className="text-xs font-bold text-emerald-300 block truncate">
                                    {frameImageFile ? frameImageFile.name : 'Imagem de Moldura Carregada'}
                                  </span>
                                  <span className="text-[10px] text-slate-400 block">
                                    {frameImageFile ? `${(frameImageFile.size / 1024).toFixed(1)} KB • Pronto para publicar` : 'Clique ou arraste outro arquivo para trocar'}
                                  </span>
                                </div>
                                <span className="text-[11px] px-2.5 py-1 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold flex-shrink-0">
                                  Trocar
                                </span>
                              </div>
                            ) : (
                              <div className="space-y-1.5 pointer-events-none">
                                <div className="w-10 h-10 rounded-2xl bg-amber-500/15 text-amber-400 flex items-center justify-center mx-auto border border-amber-500/30">
                                  <Upload className="w-5 h-5" />
                                </div>
                                <div className="text-xs font-bold text-slate-200">
                                  Arraste o arquivo de moldura ou <span className="text-amber-400 underline">clique para enviar</span>
                                </div>
                                <p className="text-[10px] text-slate-400">
                                  Suporta GIFs animados (.gif), PNGs transparentes (.png), WebP ou SVG
                                </p>
                              </div>
                            )}
                          </div>
                        )}

                        {/* MODO 2: URL EXTERNA */}
                        {frameUploadType === 'url' && (
                          <div>
                            <input
                              type="url"
                              value={frameImageUrl}
                              onChange={(e) => {
                                setFrameImageUrl(e.target.value);
                                setFrameImagePreview(e.target.value);
                              }}
                              placeholder="https://exemplo.com/moldura-animada.gif"
                              className="w-full px-3 py-2 rounded-xl bg-background-dark border border-slate-700 text-xs text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none"
                            />
                            <span className="text-[10px] text-slate-500 mt-1 block">
                              Cole o link direto da imagem ou GIF hospedado na web
                            </span>
                          </div>
                        )}

                        {/* MODO 3: BORDA CSS GLOW */}
                        {frameUploadType === 'css' && (
                          <div>
                            <input
                              type="text"
                              value={frameCssClass}
                              onChange={(e) => {
                                setFrameCssClass(e.target.value);
                                setNewItemCss(e.target.value);
                              }}
                              placeholder="border-2 border-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.9)] animate-pulse"
                              className="w-full px-3 py-2 rounded-xl bg-background-dark border border-slate-700 text-xs text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none font-mono text-[11px]"
                            />
                            <div className="flex gap-1.5 mt-1.5 flex-wrap">
                              <span className="text-[9px] text-slate-500">Sugestões:</span>
                              <button
                                type="button"
                                onClick={() => {
                                  const s = 'border-2 border-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.8)] animate-pulse';
                                  setFrameCssClass(s);
                                  setNewItemCss(s);
                                }}
                                className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800"
                              >
                                Cyber Ciano
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  const s = 'border-2 border-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.9)] ring-2 ring-amber-500/50';
                                  setFrameCssClass(s);
                                  setNewItemCss(s);
                                }}
                                className="text-[9px] px-1.5 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800"
                              >
                                Ouro Real
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  const s = 'border-2 border-purple-500 shadow-[0_0_16px_rgba(168,85,247,0.9)] ring-2 ring-indigo-500';
                                  setFrameCssClass(s);
                                  setNewItemCss(s);
                                }}
                                className="text-[9px] px-1.5 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800"
                              >
                                Galáxia Roxa
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Linha 3: Preço, Ícone e Descrição */}
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-2.5">
                      <div className="sm:col-span-4">
                        <label className="text-[10px] text-slate-400 font-bold block mb-1 uppercase tracking-wider">
                          Preço (Coins)
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            required
                            min={0}
                            value={newItemPrice}
                            onChange={(e) => setNewItemPrice(e.target.value)}
                            className="w-full pl-8 pr-3 py-2 rounded-xl bg-background-dark border border-slate-700 text-xs text-amber-300 font-bold focus:border-amber-500 focus:outline-none"
                          />
                          <img src="/nexus-coin.jpg" alt="Coins" className="w-4 h-4 rounded-full absolute left-2.5 top-1/2 -translate-y-1/2" />
                        </div>
                      </div>

                      <div className="sm:col-span-3">
                        <label className="text-[10px] text-slate-400 font-bold block mb-1 uppercase tracking-wider">
                          Ícone / Emoji
                        </label>
                        <input
                          type="text"
                          value={newItemIcon}
                          onChange={(e) => setNewItemIcon(e.target.value)}
                          placeholder="✨, 👑, 🔥..."
                          className="w-full px-3 py-2 rounded-xl bg-background-dark border border-slate-700 text-xs text-white text-center focus:border-amber-500 focus:outline-none"
                        />
                      </div>

                      <div className="sm:col-span-5">
                        <label className="text-[10px] text-slate-400 font-bold block mb-1 uppercase tracking-wider">
                          Descrição Rápida
                        </label>
                        <input
                          type="text"
                          value={newItemDesc}
                          onChange={(e) => setNewItemDesc(e.target.value)}
                          placeholder="Aura mística flutuante..."
                          className="w-full px-3 py-2 rounded-xl bg-background-dark border border-slate-700 text-xs text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Botão de Envio / Publicação */}
                  <div className="pt-2 flex items-center gap-2">
                    <button
                      type="submit"
                      disabled={actionLoading}
                      className="flex-1 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 hover:from-amber-400 hover:to-yellow-500 text-black font-extrabold text-xs sm:text-sm shadow-xl shadow-amber-500/20 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
                    >
                      {actionLoading ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" /> Enviando...
                        </>
                      ) : editingItemId ? (
                        <>
                          <CheckCircle className="w-4 h-4" /> Salvar Alterações
                        </>
                      ) : (
                        <>
                          <PlusCircle className="w-4 h-4" /> Publicar na Loja Nexus
                        </>
                      )}
                    </button>
                  </div>
                </form>

                {/* Coluna da Direita: Simulador de Avatar em Tempo Real (5 Colunas) */}
                <div className="lg:col-span-5 p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl bg-gradient-to-b from-slate-900/95 via-slate-950 to-black border border-amber-500/30 flex flex-col justify-between shadow-2xl min-w-0">
                  <div>
                    <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-3">
                      <div className="flex items-center gap-1.5">
                        <Eye className="w-4 h-4 text-amber-400" />
                        <h4 className="text-xs font-extrabold text-amber-300 uppercase tracking-wide">
                          Simulador ao Vivo
                        </h4>
                      </div>
                      {/* Seletor de Tamanho */}
                      <div className="flex bg-slate-900 p-0.5 rounded-lg border border-slate-800 text-[10px]">
                        {[
                          { id: 'sm', label: '32px' },
                          { id: 'md', label: '48px' },
                          { id: 'lg', label: '72px' },
                          { id: 'xl', label: '96px' }
                        ].map((sz) => (
                          <button
                            key={sz.id}
                            type="button"
                            onClick={() => setPreviewSimulatorSize(sz.id)}
                            className={`px-2 py-0.5 rounded font-bold transition-all ${
                              previewSimulatorSize === sz.id
                                ? 'bg-amber-500 text-black'
                                : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            {sz.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Área do Avatar com a Moldura Sobreposta */}
                    <div className="py-6 flex flex-col items-center justify-center relative">
                      {/* Glow de fundo */}
                      <div className="absolute w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

                      <div
                        className={`relative inline-flex items-center justify-center select-none transition-all duration-200 ${
                          previewSimulatorSize === 'sm'
                            ? 'w-10 h-10'
                            : previewSimulatorSize === 'md'
                            ? 'w-14 h-14'
                            : previewSimulatorSize === 'lg'
                            ? 'w-20 h-20'
                            : 'w-28 h-28'
                        }`}
                      >
                        {/* Imagem do Avatar */}
                        <img
                          src={currentSimulatorAvatar.src}
                          alt="Simulador"
                          className={`w-full h-full rounded-full object-cover bg-slate-900 shadow-xl ${
                            frameUploadType === 'css'
                              ? frameCssClass
                              : !frameImagePreview && !newItemCss
                              ? 'border-2 border-slate-700'
                              : newItemCss
                          }`}
                        />

                        {/* Moldura Animada de Upload / Imagem Sobreposta */}
                        {newItemCategory === 'frames' && frameUploadType !== 'css' && frameImagePreview && (
                          <img
                            src={frameImagePreview}
                            alt="Moldura Preview"
                            className="absolute -inset-[22%] w-[144%] h-[144%] max-w-none pointer-events-none object-contain z-10 select-none drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)]"
                          />
                        )}

                        {/* Badge de Status Online de Teste */}
                        <span className="absolute bottom-0 right-0 z-20 flex h-3 w-3">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-3 w-3 border-2 border-slate-950 bg-emerald-500" />
                        </span>
                      </div>

                      {/* Nome e Preço de Teste */}
                      <div className="mt-3 text-center">
                        <div className="text-xs font-extrabold text-white flex items-center justify-center gap-1.5">
                          <span>{newItemIcon}</span>
                          <span>{newItemName || 'Nome da Moldura'}</span>
                        </div>
                        <div className="text-[11px] text-amber-300 font-bold flex items-center justify-center gap-1 mt-0.5">
                          <img src="/nexus-coin.jpg" alt="Moeda" className="w-3.5 h-3.5 rounded-full" />
                          <span>{newItemPrice} Coins</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Alternar Avatar de Teste */}
                  <div className="pt-3 border-t border-slate-800/80">
                    <label className="text-[9px] font-bold text-slate-400 block mb-1.5 uppercase">
                      Testar com outro perfil:
                    </label>
                    <div className="grid grid-cols-4 gap-1.5">
                      {SIMULATOR_AVATARS.map((av, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setPreviewSimulatorAvatarIndex(idx)}
                          className={`p-1 rounded-xl border text-center transition-all ${
                            previewSimulatorAvatarIndex === idx
                              ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                              : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                          }`}
                        >
                          <img src={av.src} alt={av.label} className="w-6 h-6 rounded-full mx-auto object-cover mb-0.5" />
                          <span className="text-[8px] font-semibold block truncate">{av.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Seção 2: Galeria & Gerenciador Completo de Molduras Cadastradas */}
              <div className="p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl bg-slate-900/90 border border-slate-800 space-y-3 shadow-xl min-w-0 box-border">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-amber-400" />
                    <h4 className="text-xs sm:text-sm font-extrabold text-white uppercase tracking-wide">
                      Catálogo & Gerenciador ({filteredShopItems.length})
                    </h4>
                  </div>

                  {/* Filtros de Categoria e Busca */}
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex bg-slate-950 p-0.5 rounded-xl border border-slate-800 text-[10px]">
                      {[
                        { id: 'frames', label: 'Molduras' },
                        { id: 'wallpapers', label: 'Fundos' },
                        { id: 'bubbles', label: 'Balões' },
                        { id: 'badges', label: 'Badges' },
                        { id: 'all', label: 'Todos' }
                      ].map((cat) => (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setShopCategoryFilter(cat.id)}
                          className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                            shopCategoryFilter === cat.id
                              ? 'bg-amber-500 text-black'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          {cat.label}
                        </button>
                      ))}
                    </div>

                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={shopSearchQuery}
                        onChange={(e) => setShopSearchQuery(e.target.value)}
                        placeholder="Filtrar..."
                        className="pl-8 pr-3 py-1 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white w-36 focus:border-amber-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Grid de Cards de Molduras e Itens */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-[360px] overflow-y-auto pr-1">
                  {filteredShopItems.map((item) => {
                    const isFrame = item.category === 'frames';
                    const frameImg = item.image_url || getFrameAsset(item.id);
                    const frameCss = item.css_class || getFrameStyle(item.id);

                    return (
                      <div
                        key={item.id}
                        className={`p-3 rounded-2xl border transition-all flex flex-col justify-between gap-2.5 shadow-md ${
                          editingItemId === item.id
                            ? 'bg-amber-950/30 border-amber-500/60 ring-1 ring-amber-500/50'
                            : 'bg-slate-950/90 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-start gap-2.5">
                          {/* Preview Visual da Moldura no Avatar */}
                          <div className="relative w-11 h-11 flex-shrink-0 inline-flex items-center justify-center">
                            <img
                              src={user?.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=preview`}
                              alt={item.name}
                              className={`w-11 h-11 rounded-full object-cover bg-slate-900 ${
                                isFrame && frameCss ? frameCss : !frameImg ? 'border border-slate-700' : ''
                              }`}
                            />
                            {isFrame && frameImg && (
                              <img
                                src={frameImg}
                                alt={item.name}
                                className="absolute -inset-[22%] w-[144%] h-[144%] max-w-none pointer-events-none object-contain z-10 select-none drop-shadow-md"
                              />
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-white truncate">{item.name}</span>
                              {item.isCustom && (
                                <span className="text-[8px] px-1 py-0.2 rounded bg-purple-500/20 text-purple-300 font-extrabold border border-purple-500/30">
                                  CUSTOM
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-400 block truncate">{item.description}</span>
                            <div className="flex items-center gap-1.5 mt-1">
                              <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-amber-500/15 text-amber-300 font-bold uppercase">
                                {item.category}
                              </span>
                              <div className="flex items-center gap-1 text-[11px] text-amber-300 font-bold">
                                <img src="/nexus-coin.jpg" alt="Moeda" className="w-3 h-3 rounded-full" />
                                <span>{item.price}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Botões de Ação do Card */}
                        <div className="flex items-center gap-1 pt-1.5 border-t border-slate-800/80 justify-between">
                          <div className="flex items-center gap-1">
                            {isFrame && (
                              <button
                                type="button"
                                onClick={() => handleTestEquipOnAdmin(item)}
                                className="px-2 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/40 text-[10px] font-bold flex items-center gap-1 transition-all"
                                title="Equipar esta moldura no seu avatar para testar agora"
                              >
                                <Eye className="w-3 h-3" /> Testar
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => setGrantModalItem(item)}
                              className="px-2 py-1 rounded-lg bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 border border-purple-500/40 text-[10px] font-bold flex items-center gap-1 transition-all"
                              title="Conceder esta moldura para membros ou para toda a comunidade"
                            >
                              <Gift className="w-3 h-3" /> Conceder
                            </button>
                          </div>

                          <div className="flex items-center gap-1">
                            {item.isCustom && (
                              <button
                                type="button"
                                onClick={() => handleStartEditItem(item)}
                                className="p-1 rounded-lg text-amber-400 hover:bg-amber-500/20 transition-colors"
                                title="Editar item"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {item.isCustom && (
                              <button
                                type="button"
                                onClick={() => handleDeleteShopItem(item.id)}
                                className="p-1 rounded-lg text-rose-400 hover:bg-rose-500/20 transition-colors"
                                title="Excluir item do catálogo"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Modal / Popup de Concessão de Moldura Direta */}
              {grantModalItem && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
                  <div className="w-full max-w-md bg-slate-900 border border-amber-500/50 rounded-3xl p-5 shadow-2xl space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                      <div className="flex items-center gap-2">
                        <Gift className="w-5 h-5 text-amber-400" />
                        <h4 className="text-sm font-extrabold text-white">
                          Conceder Item: {grantModalItem.name}
                        </h4>
                      </div>
                      <button
                        onClick={() => setGrantModalItem(null)}
                        className="text-slate-400 hover:text-white"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="space-y-3">
                      <p className="text-xs text-slate-300">
                        Escolha quem receberá o item <strong>{grantModalItem.name}</strong> desbloqueado permanentemente na conta:
                      </p>

                      <div>
                        <label className="text-[10px] font-bold text-slate-400 block mb-1 uppercase">
                          Destinatário(s):
                        </label>
                        <select
                          value={grantTargetUserId}
                          onChange={(e) => setGrantTargetUserId(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-background-dark border border-slate-700 text-xs text-white font-semibold focus:border-amber-500"
                        >
                          <option value="all">🌟 TODOS OS MEMBROS (Comunidade Inteira)</option>
                          <optgroup label="Membro Específico">
                            {users.map((u) => (
                              <option key={u.id} value={u.id}>
                                {u.display_name || u.username} (@{u.username})
                              </option>
                            ))}
                          </optgroup>
                        </select>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setGrantModalItem(null)}
                        className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={handleGrantItemToUsers}
                        disabled={actionLoading}
                        className="flex-1 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 text-white text-xs font-extrabold shadow-lg transition-all flex items-center justify-center gap-1.5"
                      >
                        <Gift className="w-3.5 h-3.5" /> Confirmar Envio
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ABA 5: GERENCIAR PATCH NOTES */}
          {activeTab === 'patches' && (
            <div className="space-y-3 sm:space-y-4 min-w-0">
              <form onSubmit={handleCreatePatchNote} className="p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl bg-slate-900/90 border border-brand-500/30 space-y-2.5 sm:space-y-3.5 shadow-xl min-w-0 box-border">
                <div className="flex items-center gap-1.5 text-xs font-extrabold text-brand-300 uppercase tracking-wide truncate">
                  <FileText className="w-4 h-4 flex-shrink-0" /> <span className="truncate">Publicar Nova Nota de Atualização</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-2.5">
                  <div>
                    <label className="text-[10px] text-slate-400 font-bold block mb-1">Tag / Categoria</label>
                    <select
                      value={patchTag}
                      onChange={(e) => setPatchTag(e.target.value)}
                      className="w-full px-3 py-1.5 sm:py-2 rounded-xl bg-background-dark border border-slate-700 text-xs text-white focus:border-brand-500"
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
                      placeholder="Ex: Versão 2.5 - Nova Loja..."
                      className="w-full px-3 py-1.5 sm:py-2 rounded-xl bg-background-dark border border-slate-700 text-xs text-white focus:border-brand-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-2.5">
                  <div>
                    <label className="text-[10px] text-slate-400 font-bold block mb-1">Versão (Ex: v2.5.0)</label>
                    <input
                      type="text"
                      value={patchVersion}
                      onChange={(e) => setPatchVersion(e.target.value)}
                      className="w-full px-3 py-1.5 sm:py-2 rounded-xl bg-background-dark border border-slate-700 text-xs text-white focus:border-brand-500"
                    />
                  </div>

                  <div className="sm:col-span-2 flex flex-wrap items-center gap-3 pt-1">
                    <label className="flex items-center gap-1.5 text-xs text-amber-300 font-semibold cursor-pointer">
                      <input
                        type="checkbox"
                        checked={patchIsPinned}
                        onChange={(e) => setPatchIsPinned(e.target.checked)}
                        className="rounded border-slate-700 bg-background-dark text-amber-500 focus:ring-0"
                      />
                      <span>Fixar 📌</span>
                    </label>

                    <label className="flex items-center gap-1.5 text-xs text-emerald-400 font-bold cursor-pointer">
                      <input
                        type="checkbox"
                        checked={patchBroadcastToBelmont}
                        onChange={(e) => setPatchBroadcastToBelmont(e.target.checked)}
                        className="rounded border-slate-700 bg-background-dark text-emerald-500 focus:ring-0"
                      />
                      <span className="truncate">📢 Aviso no Belmont</span>
                    </label>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5 flex-wrap gap-1">
                    <label className="text-[10px] text-slate-400 font-bold flex items-center gap-1.5">
                      <span>Conteúdo (Suporta Markdown: **negrito**, *itálico*, listas, títulos)</span>
                    </label>

                    {/* Toolbar Rápida de Markdown */}
                    <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-[10px]">
                      <button
                        type="button"
                        onClick={() => {
                          setPatchContent(prev => prev ? `${prev} **texto em negrito**` : '**texto em negrito**');
                        }}
                        className="px-2 py-0.5 rounded-lg bg-slate-900 hover:bg-amber-500/20 text-amber-300 font-black border border-slate-800 hover:border-amber-500/40 transition-colors"
                        title="Negrito (**texto**)"
                      >
                        B
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setPatchContent(prev => prev ? `${prev} *texto em itálico*` : '*texto em itálico*');
                        }}
                        className="px-2 py-0.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 italic border border-slate-800 transition-colors"
                        title="Itálico (*texto*)"
                      >
                        I
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setPatchContent(prev => prev ? `${prev} ~~texto riscado~~` : '~~texto riscado~~');
                        }}
                        className="px-2 py-0.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 line-through border border-slate-800 transition-colors"
                        title="Riscado (~~texto~~)"
                      >
                        S
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setPatchContent(prev => prev ? `${prev} \`código\`` : '`código`');
                        }}
                        className="px-2 py-0.5 rounded-lg bg-slate-900 hover:bg-cyan-500/20 text-cyan-300 font-mono border border-slate-800 hover:border-cyan-500/40 transition-colors"
                        title="Código inline (`código`)"
                      >
                        {"</>"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setPatchContent(prev => prev ? `${prev}\n- Item da lista\n- Outro item` : '- Item da lista\n- Outro item');
                        }}
                        className="px-2 py-0.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-amber-300 font-bold border border-slate-800 transition-colors"
                        title="Lista com marcadores (- item)"
                      >
                        • Lista
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setPatchContent(prev => prev ? `${prev}\n### Subtítulo` : '### Subtítulo');
                        }}
                        className="px-2 py-0.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-cyan-300 font-bold border border-slate-800 transition-colors"
                        title="Subtítulo (### título)"
                      >
                        H3
                      </button>
                    </div>
                  </div>

                  <textarea
                    rows={4}
                    required
                    value={patchContent}
                    onChange={(e) => setPatchContent(e.target.value)}
                    placeholder="Descreva as novidades usando markdown:&#10;**Novidade em destaque**&#10;- Item de melhoria 1&#10;- Item de melhoria 2"
                    className="w-full px-3 py-2 rounded-xl bg-background-dark border border-slate-700 text-xs text-white focus:border-brand-500 resize-none font-mono"
                  />

                  {/* Live Markdown Preview da Nota */}
                  {patchContent.trim() && (
                    <div className="mt-2 p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                      <div className="flex items-center justify-between text-[10px] font-extrabold text-amber-300 uppercase">
                        <span>👁️ Pré-visualização ao Vivo (Como aparecerá no Hub)</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800/80">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 font-bold text-[9px]">
                            {patchTag}
                          </span>
                          <span className="font-bold text-white text-xs">{patchTitle || 'Título da Atualização'}</span>
                          <span className="text-[9px] text-slate-500">{patchVersion || 'v2.5.0'}</span>
                        </div>
                        <MarkdownRenderer content={patchContent} className="text-xs text-slate-300" />
                      </div>
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={actionLoading}
                  className="w-full py-2.5 rounded-xl sm:rounded-2xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 text-white font-extrabold text-xs shadow-lg transition-all flex items-center justify-center gap-1.5 active:scale-95"
                >
                  <Send className="w-4 h-4 flex-shrink-0" /> Publicar Patch Note
                </button>
              </form>

              <div>
                <h4 className="text-xs font-bold text-slate-300 mb-2 truncate">Patch Notes Publicadas ({patchNotesList.length})</h4>
                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                  {patchNotesList.map((patch) => (
                    <div key={patch.id} className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-start justify-between text-xs shadow gap-3 min-w-0">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap mb-1">
                          <span className="px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 font-bold text-[9px]">
                            {patch.tag}
                          </span>
                          <span className="font-bold text-white truncate text-xs">{patch.title}</span>
                          <span className="text-[9px] text-slate-500">{patch.version}</span>
                        </div>
                        <MarkdownRenderer content={patch.content} className="text-[11px] text-slate-300" />
                      </div>
                      <button
                        onClick={() => handleDeletePatchNote(patch.id)}
                        className="p-1.5 rounded-xl text-rose-400 hover:bg-rose-500/20 flex-shrink-0"
                        title="Excluir patch note"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ABA 6: LIMPEZA DE CHAT */}
          {activeTab === 'cleanup' && (
            <div className="space-y-3 sm:space-y-4 min-w-0">
              <div className="p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl bg-amber-950/20 border border-amber-500/30 min-w-0 box-border">
                <div className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-amber-300 mb-1">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" /> <span>Central de Limpeza e Manutenção</span>
                </div>
                <p className="text-[11px] sm:text-xs text-slate-400">
                  Ferramentas para limpar histórico de mensagens e manter o chat organizado.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3.5">
                <div className="p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between shadow-xl min-w-0 box-border">
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5">
                      <span>👑</span> Limpar Belmont Conference
                    </h4>
                    <p className="text-[11px] sm:text-xs text-slate-400 mt-1 leading-relaxed">
                      Apaga mensagens da sala principal oficial. A sala continua ativa para todos.
                    </p>
                  </div>
                  <button
                    onClick={handleClearBelmontChat}
                    disabled={actionLoading}
                    className="mt-4 w-full py-2.5 sm:py-3 rounded-xl sm:rounded-2xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-600/30 transition-all active:scale-95"
                  >
                    {actionLoading ? 'Limpando...' : '🧹 Limpar Mensagens da Belmont'}
                  </button>
                </div>

                <div className="p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between shadow-xl min-w-0 box-border">
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5">
                      <span>⚠️</span> Limpeza Geral de Mensagens
                    </h4>
                    <p className="text-[11px] sm:text-xs text-slate-400 mt-1 leading-relaxed">
                      Reinicia o histórico global de mensagens de todas as conversas do sistema.
                    </p>
                  </div>
                  <button
                    onClick={handleClearAllMessages}
                    disabled={actionLoading}
                    className="mt-4 w-full py-2.5 sm:py-3 rounded-xl sm:rounded-2xl bg-slate-800 hover:bg-rose-900 text-rose-300 hover:text-white border border-rose-500/40 text-xs font-bold transition-all active:scale-95"
                  >
                    {actionLoading ? 'Processando...' : '☢️ Limpeza Completa Geral'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ABA 7: TRANSMISSÃO BELMONT */}
          {activeTab === 'broadcast' && (
            <form onSubmit={handleSendBroadcast} className="space-y-2.5 sm:space-y-3.5 p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl bg-slate-900/90 border border-rose-500/30 shadow-xl min-w-0 box-border">
              <div className="p-3 rounded-xl sm:rounded-2xl bg-brand-500/10 border border-brand-500/30 text-[11px] sm:text-xs text-brand-300">
                Envie um comunicado oficial em destaque na sala <strong>BELMONT CONFERENCE</strong> para todos os membros.
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Título do Comunicado</label>
                <input
                  type="text"
                  value={broadcastTitle}
                  onChange={(e) => setBroadcastTitle(e.target.value)}
                  placeholder="Ex: Atualização do Sistema, Novas Regras..."
                  className="w-full px-3 py-2 rounded-xl bg-background-dark border border-slate-700 text-xs text-white focus:border-rose-500"
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
                  className="w-full px-3 py-2 rounded-xl bg-background-dark border border-slate-700 text-xs text-white focus:border-rose-500 resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={actionLoading}
                className="w-full py-2.5 sm:py-3 rounded-xl sm:rounded-2xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 text-white font-extrabold text-xs shadow-lg shadow-rose-600/30 transition-all flex items-center justify-center gap-1.5 active:scale-95"
              >
                <Radio className="w-4 h-4 animate-pulse" /> Enviar Transmissão Oficial
              </button>
            </form>
          )}
        </div>

        {/* Modal Flutuante para Conceder Moedas */}
        {selectedUserForCoins && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md animate-fadeIn box-border">
            <div className="w-full max-w-sm rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-amber-500/50 bg-slate-900 shadow-2xl space-y-3 sm:space-y-4 min-w-0 box-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Coins className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400 flex-shrink-0" />
                  <h3 className="text-xs sm:text-sm font-bold text-white truncate">Conceder Nexus Coins</h3>
                </div>
                <button onClick={() => setSelectedUserForCoins(null)} className="text-slate-400 hover:text-white p-1">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-slate-300 truncate">
                Para: <strong>{selectedUserForCoins.display_name || selectedUserForCoins.username}</strong> (@{selectedUserForCoins.username})
              </p>

              <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                {['100', '500', '1000'].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setCustomCoinsAmount(amt)}
                    className={`py-1.5 sm:py-2 rounded-xl text-xs font-bold border transition-colors ${
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
                className="w-full px-3 py-2 rounded-xl bg-background-dark border border-slate-700 text-xs text-white"
              />

              <button
                type="button"
                onClick={() => handleGiveCoins(selectedUserForCoins.id, customCoinsAmount)}
                disabled={actionLoading}
                className="w-full py-2 sm:py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-black font-extrabold text-xs shadow-lg shadow-amber-500/20 active:scale-95"
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
