import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';

const SOCKET_URL = 
  import.meta.env.VITE_SOCKET_URL || 
  import.meta.env.NEXT_PUBLIC_SOCKET_URL || 
  (isHttps ? '/' : 'http://187.127.40.228:5000');

export function SocketProvider({ children }) {
  const { user, session } = useAuth();
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [coinsAlert, setCoinsAlert] = useState(null);

  useEffect(() => {
    if (!user) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setConnected(false);
      }
      return;
    }

    const token = session?.access_token || localStorage.getItem('demo_auth_token') || 'demo-token';

    const newSocket = io(SOCKET_URL, {
      auth: {
        token,
        userId: user.id,
        username: user.username,
        displayName: user.display_name,
        avatarUrl: user.avatar_url
      },
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
      transports: ['websocket', 'polling'],
      timeout: 10000
    });

    newSocket.on('connect', () => {
      console.log('⚡ Conectado ao servidor WebSocket:', newSocket.id);
      setConnected(true);
      newSocket.emit('get_online_users');
    });

    newSocket.on('disconnect', (reason) => {
      console.log('💤 Desconectado do WebSocket:', reason);
      setConnected(false);
    });

    newSocket.on('online_users_list', (userIds) => {
      setOnlineUsers(new Set(userIds));
    });

    newSocket.on('user_status_change', ({ userId, isOnline }) => {
      setOnlineUsers(prev => {
        const next = new Set(prev);
        if (isOnline) {
          next.add(userId);
        } else {
          next.delete(userId);
        }
        return next;
      });
    });

    // Evento de Moedas Recebidas por Mensagem
    newSocket.on('coins_earned', ({ amount, newBalance, reason }) => {
      setCoinsAlert({ amount, newBalance, reason, id: Date.now() });
      setTimeout(() => setCoinsAlert(null), 3500);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [user?.id, session?.access_token]);

  function isUserOnline(userId) {
    if (!userId) return false;
    if (userId === user?.id) return true;
    return onlineUsers.has(userId);
  }

  return (
    <SocketContext.Provider
      value={{
        socket,
        connected,
        onlineUsers,
        isUserOnline,
        coinsAlert
      }}
    >
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket deve ser usado dentro de um SocketProvider');
  }
  return context;
}
