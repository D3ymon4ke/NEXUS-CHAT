import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { ChatProvider, useChat } from './context/ChatContext';
import { Sidebar } from './components/sidebar/Sidebar';
import { ChatArea } from './components/chat/ChatArea';
import { AuthModal } from './components/auth/AuthModal';
import { NewChatModal } from './components/sidebar/NewChatModal';
import { NewGroupModal } from './components/sidebar/NewGroupModal';
import { SettingsModal } from './components/settings/SettingsModal';
import { Sparkles, Shield, UserCheck, MessageSquare } from 'lucide-react';

function ChatDashboard() {
  const { user, loading } = useAuth();
  const { activeConversation, setActiveConversationId } = useChat();

  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [showNewGroupModal, setShowNewGroupModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // No mobile, se houver conversa selecionada, mostra o chat em tela cheia; caso contrário, a sidebar.
  const [mobileView, setMobileView] = useState('sidebar'); // 'sidebar' | 'chat'

  // Alterna a visão mobile ao selecionar conversa
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
    <div className="h-screen w-screen flex flex-col bg-background-darker overflow-hidden">
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
