import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider, useSocket } from './context/SocketContext';
import { ChatProvider, useChat } from './context/ChatContext';
import { Sidebar } from './components/sidebar/Sidebar';
import { ChatArea } from './components/chat/ChatArea';
import { AuthModal } from './components/auth/AuthModal';
import { NewChatModal } from './components/sidebar/NewChatModal';
import { NewGroupModal } from './components/sidebar/NewGroupModal';
import { SettingsModal } from './components/settings/SettingsModal';
import { NexusShopModal } from './components/shop/NexusShopModal';
import { NexusWalletModal } from './components/wallet/NexusWalletModal';
import { AdminModal } from './components/admin/AdminModal';
import { HomeHub } from './components/home/HomeHub';
import { UserProfileModal } from './components/profile/UserProfileModal';
import { FriendsModal } from './components/friends/FriendsModal';
import { CreateStoryModal } from './components/stories/CreateStoryModal';
import { StoryViewerModal } from './components/stories/StoryViewerModal';
import { InstallAppModal } from './components/pwa/InstallAppModal';
import { OnboardingTutorialModal } from './components/auth/OnboardingTutorialModal';
import { CreatePollModal } from './components/polls/CreatePollModal';
import { TitlePromotionModal } from './components/profile/TitlePromotionModal';
import { apiRequest } from './lib/api';
import { supabase, isSupabaseConfigured } from './lib/supabaseClient';

function ChatDashboard() {
  const { user, loading } = useAuth();
  const {
    activeConversation,
    activeConversationId,
    setActiveConversationId,
    loadConversations,
    showPollModal,
    setShowPollModal
  } = useChat();
  const { coinsAlert } = useSocket();

  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [showNewGroupModal, setShowNewGroupModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showShopModal, setShowShopModal] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [showFriendsModal, setShowFriendsModal] = useState(false);
  const [showCreateStoryModal, setShowCreateStoryModal] = useState(false);
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [showTutorialModal, setShowTutorialModal] = useState(false);

  // Perfil e Stories Viewer States
  const [targetUserProfile, setTargetUserProfile] = useState(null);
  const [activeStoryGroup, setActiveStoryGroup] = useState(null);
  const [storiesRefreshKey, setStoriesRefreshKey] = useState(Date.now());

  const [mobileView, setMobileView] = useState('sidebar'); // 'sidebar' | 'chat'

  const handleSelectConversation = (convId) => {
    setActiveConversationId(convId);
    setMobileView('chat');
  };

  const handleMobileBack = () => {
    setMobileView('sidebar');
  };

  const handleStartDirectChat = async (targetUser) => {
    if (!user || !targetUser) return;
    try {
      if (isSupabaseConfigured && supabase) {
        // Criar conversa direta no Supabase
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

          if (loadConversations) await loadConversations();
          setActiveConversationId(newConv.id);
          setMobileView('chat');
        }
      }
    } catch (err) {
      console.error('Erro ao iniciar chat direto:', err);
    }
  };

  if (loading) {
    return (
      <div className="h-screen h-[100dvh] w-screen w-[100dvw] flex flex-col items-center justify-center bg-background-darker text-white gap-3">
        <div className="w-10 h-10 border-4 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" />
        <span className="text-sm font-semibold tracking-wide text-slate-300">Iniciando Nexus Chat...</span>
      </div>
    );
  }

  return (
    <div className="h-screen h-[100dvh] w-screen w-[100dvw] flex flex-col bg-background-darker overflow-hidden relative">
      {/* Toast Discreto de Ganho de Nexus Coins */}
      {coinsAlert && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900/90 border border-amber-500/50 text-amber-300 font-bold text-xs shadow-xl backdrop-blur animate-fadeIn select-none pointer-events-none">
          <img src="/nexus-coin.jpg" alt="Moeda" className="w-3.5 h-3.5 rounded-full" />
          <span>+{coinsAlert.amount} coins</span>
        </div>
      )}

      {/* Conteúdo Principal do Chat */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Barra Lateral */}
        <div
          className={`h-full ${
            mobileView === 'chat' ? 'hidden md:flex' : 'flex w-full md:w-auto'
          }`}
        >
          <Sidebar
            onOpenNewChat={() => setShowNewChatModal(true)}
            onOpenNewGroup={() => setShowNewGroupModal(true)}
            onOpenSettings={() => setShowSettingsModal(true)}
            onOpenAuth={() => setShowAuthModal(true)}
            onOpenShop={() => setShowShopModal(true)}
            onOpenWallet={() => setShowWalletModal(true)}
            onOpenAdmin={() => setShowAdminModal(true)}
            onOpenFriends={() => setShowFriendsModal(true)}
            onOpenCreateStory={() => setShowCreateStoryModal(true)}
            onOpenStoryViewer={(group) => setActiveStoryGroup(group)}
            onOpenProfile={(u) => setTargetUserProfile(u)}
            onOpenInstallPWA={() => setShowInstallModal(true)}
            onOpenTutorial={() => setShowTutorialModal(true)}
            storiesRefreshKey={storiesRefreshKey}
            onSelectConversation={handleSelectConversation}
          />
        </div>

        {/* Área Principal: HomeHub ou ChatArea */}
        <div
          className={`flex-1 h-full ${
            mobileView === 'sidebar' ? 'hidden md:flex' : 'flex'
          }`}
        >
          {activeConversation && activeConversationId ? (
            <ChatArea
              onBack={handleMobileBack}
              onOpenProfile={(u) => setTargetUserProfile(u)}
            />
          ) : (
            <HomeHub
              onOpenChat={(convId) => {
                setActiveConversationId(convId);
                setMobileView('chat');
              }}
              onOpenShop={() => setShowShopModal(true)}
              onOpenWallet={() => setShowWalletModal(true)}
              onBack={handleMobileBack}
            />
          )}
        </div>
      </div>

      {/* Modais do Sistema */}
      <AuthModal
        isOpen={showAuthModal || !user}
        onClose={() => setShowAuthModal(false)}
        onOpenTutorial={() => setShowTutorialModal(true)}
      />

      <NewChatModal
        isOpen={showNewChatModal}
        onClose={() => {
          setShowNewChatModal(false);
          setMobileView('chat');
        }}
      />

      <NewGroupModal
        isOpen={showNewGroupModal}
        onClose={() => {
          setShowNewGroupModal(false);
          setMobileView('chat');
        }}
      />

      <SettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
      />

      <NexusShopModal
        isOpen={showShopModal}
        onClose={() => setShowShopModal(false)}
      />

      <NexusWalletModal
        isOpen={showWalletModal}
        onClose={() => setShowWalletModal(false)}
      />

      <AdminModal
        isOpen={showAdminModal}
        onClose={() => setShowAdminModal(false)}
      />

      <FriendsModal
        isOpen={showFriendsModal}
        onClose={() => setShowFriendsModal(false)}
        onStartChat={(target) => handleStartDirectChat(target)}
        onOpenProfile={(target) => setTargetUserProfile(target)}
      />

      <UserProfileModal
        targetUser={targetUserProfile}
        isOpen={Boolean(targetUserProfile)}
        onClose={() => setTargetUserProfile(null)}
        onStartDirectChat={(target) => handleStartDirectChat(target)}
        onOpenEditProfile={() => {
          setTargetUserProfile(null);
          setShowSettingsModal(true);
        }}
        onOpenUserStories={async (userId) => {
          setTargetUserProfile(null);
          // Buscar stories do usuário e abrir viewer
          const { data } = await supabase
            .from('nexus_stories')
            .select('*, author:profiles(*)')
            .eq('user_id', userId)
            .gt('expires_at', new Date().toISOString());

          if (data && data.length > 0) {
            setActiveStoryGroup({
              user: data[0].author,
              stories: data
            });
          }
        }}
      />

      <CreateStoryModal
        isOpen={showCreateStoryModal}
        onClose={() => setShowCreateStoryModal(false)}
        onStoryCreated={() => setStoriesRefreshKey(Date.now())}
      />

      <StoryViewerModal
        storyGroup={activeStoryGroup}
        isOpen={Boolean(activeStoryGroup)}
        onClose={() => setActiveStoryGroup(null)}
        onReplyToAuthor={(author) => handleStartDirectChat(author)}
        onStoryDeleted={() => setStoriesRefreshKey(Date.now())}
      />

      <InstallAppModal
        isOpen={showInstallModal}
        onClose={() => setShowInstallModal(false)}
      />

      <OnboardingTutorialModal
        isOpen={showTutorialModal}
        onClose={() => setShowTutorialModal(false)}
      />

      <CreatePollModal
        isOpen={showPollModal}
        onClose={() => setShowPollModal(false)}
      />

      <TitlePromotionModal />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <ChatProvider>
          <ChatDashboard />
        </ChatProvider>
      </SocketProvider>
    </AuthProvider>
  );
}
