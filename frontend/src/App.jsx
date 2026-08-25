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
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);

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
      {/* Toast Discreto e Elegante de Ganho de Nexus Coins (Canto Inferior Direito) */}
      {coinsAlert && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900/90 border border-amber-500/50 text-amber-300 font-bold text-xs shadow-xl backdrop-blur animate-fadeIn select-none pointer-events-none">
          <img src="/nexus-coin.jpg" alt="Moeda" className="w-3.5 h-3.5 rounded-full" />
          <span>+{coinsAlert.amount} coins</span>
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
            onOpenWallet={() => setShowWalletModal(true)}
            onOpenAdmin={() => setShowAdminModal(true)}
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

      <NexusWalletModal
        isOpen={showWalletModal}
        onClose={() => setShowWalletModal(false)}
      />

      <AdminModal
        isOpen={showAdminModal}
        onClose={() => setShowAdminModal(false)}
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
