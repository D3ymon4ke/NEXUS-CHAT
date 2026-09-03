import React, { useState, useEffect } from 'react';
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
    startDirectChat,
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

  // Fechar todos os popups/modais de usuário caso a sessão seja encerrada (logout)
  useEffect(() => {
    if (!user) {
      setShowSettingsModal(false);
      setShowNewChatModal(false);
      setShowNewGroupModal(false);
      setShowShopModal(false);
      setShowWalletModal(false);
      setShowAdminModal(false);
      setShowFriendsModal(false);
      setShowCreateStoryModal(false);
      setTargetUserProfile(null);
      setActiveStoryGroup(null);
      if (setShowPollModal) setShowPollModal(false);
    }
  }, [user, setShowPollModal]);

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
      if (startDirectChat) {
        await startDirectChat(targetUser);
      }
      setMobileView('chat');
    } catch (err) {
      console.error('Erro ao iniciar chat direto:', err);
    }
  };

  if (loading) {
    return (
      <div className="h-full h-[100dvh] w-full max-w-full flex flex-col items-center justify-center bg-background-darker text-white gap-4 select-none overflow-hidden">
        <div className="relative flex items-center justify-center">
          <div className="absolute -inset-2 bg-gradient-to-r from-brand-500 to-indigo-600 rounded-3xl blur-xl opacity-50 animate-pulse pointer-events-none" />
          <img
            src="/logo.gif"
            alt="Nexus Logo"
            className="w-24 h-24 sm:w-28 sm:h-28 object-contain drop-shadow-[0_0_30px_rgba(99,102,241,0.7)] relative z-10"
          />
        </div>
        <div className="flex flex-col items-center gap-1.5 z-10">
          <span className="text-base font-black tracking-widest bg-gradient-to-r from-brand-400 via-indigo-300 to-amber-300 bg-clip-text text-transparent">
            NEXUS CHAT
          </span>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-brand-400 animate-ping" />
            <span className="text-xs font-semibold text-slate-400">Iniciando ambiente seguro...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 h-full h-[100dvh] w-full max-w-full flex flex-col bg-background-darker overflow-hidden select-none">
      {/* Toast Discreto de Ganho de Nexus Coins */}
      {coinsAlert && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900/90 border border-amber-500/50 text-amber-300 font-bold text-xs shadow-xl backdrop-blur animate-fadeIn select-none pointer-events-none">
          <img src="/nexus-coin.jpg" alt="Moeda" className="w-3.5 h-3.5 rounded-full" />
          <span>+{coinsAlert.amount} coins</span>
        </div>
      )}

      {/* Conteúdo Principal do Chat */}
      <div className="flex-1 flex min-h-0 min-w-0 w-full max-w-full overflow-hidden relative">
        {/* Barra Lateral */}
        <div
          className={`h-full min-h-0 flex-shrink-0 ${
            mobileView === 'chat' ? 'hidden md:flex' : 'flex w-full md:w-80 lg:w-96'
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
          className={`flex-1 h-full min-h-0 min-w-0 max-w-full ${
            mobileView === 'sidebar' ? 'hidden md:flex' : 'flex w-full'
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
        isOpen={Boolean(user && showNewChatModal)}
        onClose={() => {
          setShowNewChatModal(false);
          setMobileView('chat');
        }}
      />

      <NewGroupModal
        isOpen={Boolean(user && showNewGroupModal)}
        onClose={() => {
          setShowNewGroupModal(false);
          setMobileView('chat');
        }}
      />

      <SettingsModal
        isOpen={Boolean(user && showSettingsModal)}
        onClose={() => setShowSettingsModal(false)}
        onOpenProfile={(u) => {
          setShowSettingsModal(false);
          setTargetUserProfile(u || user);
        }}
      />

      <NexusShopModal
        isOpen={Boolean(user && showShopModal)}
        onClose={() => setShowShopModal(false)}
      />

      <NexusWalletModal
        isOpen={Boolean(user && showWalletModal)}
        onClose={() => setShowWalletModal(false)}
      />

      <AdminModal
        isOpen={Boolean(user && showAdminModal)}
        onClose={() => setShowAdminModal(false)}
      />

      <FriendsModal
        isOpen={Boolean(user && showFriendsModal)}
        onClose={() => setShowFriendsModal(false)}
        onStartChat={(target) => handleStartDirectChat(target)}
        onOpenProfile={(target) => setTargetUserProfile(target)}
      />

      <UserProfileModal
        targetUser={targetUserProfile}
        isOpen={Boolean(user && targetUserProfile)}
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
