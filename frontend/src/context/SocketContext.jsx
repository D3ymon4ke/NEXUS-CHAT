import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';

const SocketContext = createContext(null);

const customSocketUrl = import.meta.env.VITE_SOCKET_URL || import.meta.env.NEXT_PUBLIC_SOCKET_URL;

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

  // --- 2. SOCKET.IO (Opcional quando explicitamente configurado ou em localhost) ---
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
        reconnectionAttempts: 3,
        reconnectionDelay: 5000,
        transports: ['websocket', 'polling'],
        timeout: 8000
      });

      newSocket.on('connect', () => {
        setConnected(true);
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
      console.warn('Socket.IO desativado em favor do Supabase Realtime.');
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
