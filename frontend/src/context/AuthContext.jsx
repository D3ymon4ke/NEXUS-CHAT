import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { apiRequest } from '../lib/api';

const AuthContext = createContext(null);

const DEMO_USERS = [
  {
    id: 'demo-user-1',
    email: 'alex@nexus.chat',
    username: 'alex_dev',
    display_name: 'Alex Vance',
    avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    bio: 'Tech Lead & entusiasta de Realtime Web ⚡',
    status_message: 'online',
    is_online: true,
  },
  {
    id: 'demo-user-2',
    email: 'ana@nexus.chat',
    username: 'ana_silva',
    display_name: 'Ana Silva',
    avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
    bio: 'Fullstack Developer & UI Specialist 🎨',
    status_message: 'focado no código',
    is_online: true,
  },
  {
    id: 'demo-user-3',
    email: 'marcos@nexus.chat',
    username: 'marcos_sec',
    display_name: 'Marcos Oliveira',
    avatar_url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
    bio: 'DevOps, Cloud & Segurança 🛡️',
    status_message: 'em reunião',
    is_online: false,
  }
];

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  // Inicializa sessão
  useEffect(() => {
    async function initAuth() {
      if (isSupabaseConfigured && supabase) {
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        setSession(initialSession);

        if (initialSession?.user) {
          await loadUserProfile(initialSession.user.id);
        }

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event, newSession) => {
            setSession(newSession);
            if (newSession?.user) {
              await loadUserProfile(newSession.user.id);
            } else {
              setUser(null);
            }
          }
        );

        setLoading(false);
        return () => subscription.unsubscribe();
      } else {
        // Modo Demo Inicial
        const savedDemoUserId = localStorage.getItem('demo_user_id') || 'demo-user-1';
        const demo = DEMO_USERS.find(u => u.id === savedDemoUserId) || DEMO_USERS[0];
        setUser(demo);
        localStorage.setItem('demo_user_id', demo.id);
        localStorage.setItem('demo_auth_token', `demo-token-${demo.id}`);
        setLoading(false);
      }
    }

    initAuth();
  }, []);

  async function loadUserProfile(userId) {
    try {
      if (isSupabaseConfigured && supabase) {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();

        if (profile && !error) {
          setUser(profile);
          return;
        }
      }

      const res = await apiRequest('/auth/me');
      if (res.success && res.user) {
        setUser(res.user);
      }
    } catch (err) {
      console.error('Erro ao carregar perfil:', err);
    }
  }

  // Login com Supabase Auth
  async function login(email, password) {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      setSession(data.session);
      await loadUserProfile(data.user.id);
      return data.user;
    } else {
      // Modo demo
      const found = DEMO_USERS.find(u => u.email.toLowerCase() === email.toLowerCase()) || {
        id: `demo-${Date.now()}`,
        email,
        username: email.split('@')[0],
        display_name: email.split('@')[0],
        avatar_url: `https://api.dicebear.com/7.x/bottts/svg?seed=${email}`,
        bio: 'Novo membro',
        status_message: 'online',
        is_online: true
      };
      setUser(found);
      localStorage.setItem('demo_user_id', found.id);
      return found;
    }
  }

  // Registro com Supabase Auth
  async function register(email, password, displayName, username) {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: displayName,
            username: username || email.split('@')[0],
            avatar_url: `https://api.dicebear.com/7.x/bottts/svg?seed=${username || email}`
          }
        }
      });
      if (error) throw error;
      return data.user;
    } else {
      const newUser = {
        id: `user-${Date.now()}`,
        email,
        username: username || email.split('@')[0],
        display_name: displayName || email.split('@')[0],
        avatar_url: `https://api.dicebear.com/7.x/bottts/svg?seed=${username || email}`,
        bio: 'Novo membro do Nexus Chat',
        status_message: 'online',
        is_online: true
      };
      setUser(newUser);
      localStorage.setItem('demo_user_id', newUser.id);
      return newUser;
    }
  }

  // Logout
  async function logout() {
    if (isSupabaseConfigured && supabase) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setSession(null);
    localStorage.removeItem('demo_user_id');
    localStorage.removeItem('demo_auth_token');
  }

  // Alternar conta de demonstração (útil para testar envio entre dois usuários em abas)
  function switchDemoUser(userId) {
    const target = DEMO_USERS.find(u => u.id === userId);
    if (target) {
      setUser(target);
      localStorage.setItem('demo_user_id', target.id);
      localStorage.setItem('demo_auth_token', `demo-token-${target.id}`);
      window.location.reload();
    }
  }

  // Atualizar perfil
  async function updateProfile(updates) {
    try {
      const res = await apiRequest('/users/profile', {
        method: 'PUT',
        body: JSON.stringify(updates)
      });
      if (res.success && res.profile) {
        setUser(prev => ({ ...prev, ...res.profile }));
        return res.profile;
      }
      setUser(prev => ({ ...prev, ...updates }));
    } catch (err) {
      console.error('Erro ao atualizar perfil:', err);
      setUser(prev => ({ ...prev, ...updates }));
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        login,
        register,
        logout,
        updateProfile,
        switchDemoUser,
        demoUsers: DEMO_USERS,
        isConfigured: isSupabaseConfigured,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
}
