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
import { Sparkles, Flame, Check } from 'lucide-react';

function ChatDashboard() {
  const { user, loading } = useAuth();
  const { activeConversation, setActiveConversationId } = useChat();
  const { coinsAlert } = useSocket();

  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [showNewGroupModal, setShowNewGroupModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showShopModal, setShowShopModal] = useState(false);

  const [mobileView, setMobileView] = useState('sidebar'); // 'sidebar' | 'chat'

  const handleSelectConversation = (convId) => {
    setActiveConversationId(convId);
    setMobileView('chat');
  };

  const handleMobileBack = () => {
    setMobileView('sidebar');
  };

  if (loading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-background-darker text-white gap-3">
        <div className="w-10 h-10 border-4 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" />
        <span className="text-sm font-semibold tracking-wide text-slate-300">Iniciando Nexus Chat...</span>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-background-darker overflow-hidden relative">
      {/* Toast Flutuante de Ganho de Nexus Coins */}
      {coinsAlert && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500/90 to-yellow-500/90 text-black font-extrabold text-xs shadow-2xl border border-white/30 backdrop-blur animate-bounceShort select-none">
          <img src="/nexus-coin.jpg" alt="Moeda" className="w-5 h-5 rounded-full" />
          <span>+{coinsAlert.amount} NEXUS COINS!</span>
          <span className="text-[10px] font-semibold text-black/80 ml-1">({coinsAlert.reason})</span>
        </div>
      )}

      {/* Conteúdo Principal do Chat */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Barra Lateral (Visível em desktop ou em mobile quando mobileView === 'sidebar') */}
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
          />
        </div>

        {/* Área Principal de Chat (Visível em desktop ou em mobile quando mobileView === 'chat') */}
        <div
          className={`flex-1 h-full ${
            mobileView === 'sidebar' ? 'hidden md:flex' : 'flex'
          }`}
        >
          <ChatArea onBack={handleMobileBack} />
        </div>
      </div>

      {/* Modais do Sistema */}
      <AuthModal
        isOpen={showAuthModal || !user}
        onClose={() => setShowAuthModal(false)}
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
