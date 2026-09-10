import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';

const SocketContext = createContext(null);

const defaultSocketUrl = typeof window !== 'undefined' && window.location.protocol === 'https:'
  ? 'https://187-127-40-228.sslip.io:5000'
  : 'http://187.127.40.228:5000';

const customSocketUrl = import.meta.env.VITE_SOCKET_URL || import.meta.env.NEXT_PUBLIC_SOCKET_URL || defaultSocketUrl;

export function SocketProvider({ children }) {
  const { user, session } = useAuth();
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(true);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [coinsAlert, setCoinsAlert] = useState(null);

  // --- 1. SUPABASE REALTIME PRESENCE (Status Online Nativo da Nuvem) ---
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase || !user) return;

    const presenceChannel = supabase.channel('online_users', {
      config: {
        presence: {
          key: user.id
        }
      }
    });

    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState();
        const userIds = Object.keys(state);
        setOnlineUsers(new Set(userIds));
      })
      .on('presence', { event: 'join' }, ({ key }) => {
        setOnlineUsers(prev => new Set([...prev, key]));
      })
      .on('presence', { event: 'leave' }, ({ key }) => {
        setOnlineUsers(prev => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await presenceChannel.track({
            user_id: user.id,
            username: user.username,
            online_at: new Date().toISOString()
          });
        }
      });

    return () => {
      supabase.removeChannel(presenceChannel);
    };
  }, [user?.id]);

  // --- 2. SOCKET.IO DEDICADO NA VPS (Tempo Real de Ultra Baixa Latência) ---
  useEffect(() => {
    if (!user || !customSocketUrl) return;

    const token = session?.access_token || localStorage.getItem('demo_auth_token') || 'demo-token';

    try {
      const newSocket = io(customSocketUrl, {
        auth: {
          token,
          userId: user.id,
          username: user.username,
          displayName: user.display_name,
          avatarUrl: user.avatar_url
        },
        reconnectionAttempts: 5,
        reconnectionDelay: 3000,
        transports: ['websocket', 'polling'],
        timeout: 10000
      });

      newSocket.on('connect', () => {
        setConnected(true);
        console.log('⚡ Conectado com sucesso ao Servidor VPS (Socket.IO):', newSocket.id);
      });

      newSocket.on('disconnect', (reason) => {
        console.warn('⚠️ Desconectado temporariamente do Socket.IO VPS:', reason);
      });

      // Sincronização instantânea de usuários online via Socket.IO VPS
      newSocket.on('online_users_list', (userIds) => {
        if (Array.isArray(userIds)) {
          setOnlineUsers(prev => new Set([...prev, ...userIds]));
        }
      });

      newSocket.on('user_status_change', ({ userId, isOnline }) => {
        if (!userId) return;
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

      newSocket.on('coins_earned', ({ amount, newBalance, reason }) => {
        setCoinsAlert({ amount, newBalance, reason, id: Date.now() });
        setTimeout(() => setCoinsAlert(null), 3500);
      });

      setSocket(newSocket);

      return () => {
        newSocket.disconnect();
      };
    } catch (e) {
      console.warn('Socket.IO em fallback silencioso para o Supabase Realtime.');
    }
  }, [user?.id, session?.access_token]);

  const isUserOnline = (userId) => {
    if (!userId) return false;
    if (user && userId === user.id) return true;
    return onlineUsers.has(userId);
  };

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
