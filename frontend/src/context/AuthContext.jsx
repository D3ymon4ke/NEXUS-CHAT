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
    profile_song_url: 'https://www.youtube.com/watch?v=fJ9rUzIMcZQ',
    profile_song_title: 'Bohemian Rhapsody',
    profile_song_artist: 'Queen',
    profile_song_cover: 'https://img.youtube.com/vi/fJ9rUzIMcZQ/hqdefault.jpg'
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
    profile_song_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    profile_song_title: 'Never Gonna Give You Up',
    profile_song_artist: 'Rick Astley',
    profile_song_cover: 'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg'
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
    profile_song_url: 'https://www.youtube.com/watch?v=kXYiU_JCYtU',
    profile_song_title: 'Numb',
    profile_song_artist: 'Linkin Park',
    profile_song_cover: 'https://img.youtube.com/vi/kXYiU_JCYtU/hqdefault.jpg'
  }
];

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const cached = localStorage.getItem('nexus_cached_user');
      if (cached) return JSON.parse(cached);
    } catch (e) {}
    return null;
  });
  const [realAdminUser, setRealAdminUser] = useState(() => {
    try {
      const cached = localStorage.getItem('nexus_cached_admin_user');
      if (cached) return JSON.parse(cached);
    } catch (e) {}
    return null;
  });
  const [impersonatedUser, setImpersonatedUser] = useState(() => {
    try {
      const cached = localStorage.getItem('nexus_cached_imp_user');
      if (cached) return JSON.parse(cached);
    } catch (e) {}
    return null;
  });
  const [allProfiles, setAllProfiles] = useState(() => {
    try {
      const cached = localStorage.getItem('nexus_cached_all_profiles');
      if (cached) return JSON.parse(cached);
    } catch (e) {}
    return [];
  });
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(() => {
    try {
      const cached = localStorage.getItem('nexus_cached_user');
      if (cached) return false;
    } catch (e) {}
    return true;
  });

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
              setRealAdminUser(null);
              setImpersonatedUser(null);
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
      let mainProfile = null;
      if (isSupabaseConfigured && supabase) {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();

        if (profile && !error) {
          mainProfile = profile;
        }
      }

      if (!mainProfile) {
        const res = await apiRequest('/auth/me');
        if (res.success && res.user) {
          mainProfile = res.user;
        }
      }

      if (mainProfile) {
        const isUserAdmin = mainProfile.role === 'admin' || mainProfile.username?.toLowerCase() === 'damon';
        if (isUserAdmin) {
          setRealAdminUser(mainProfile);
          try {
            localStorage.setItem('nexus_cached_admin_user', JSON.stringify(mainProfile));
          } catch (e) {}

          if (isSupabaseConfigured && supabase) {
            supabase
              .from('profiles')
              .select('*')
              .order('username')
              .then(({ data: all }) => {
                if (all) {
                  setAllProfiles(all);
                  try {
                    localStorage.setItem('nexus_cached_all_profiles', JSON.stringify(all));
                  } catch (e) {}
                }
              });
          }

          // Verificar se havia uma personificação secreta salva
          const savedImpId = localStorage.getItem('nexus_impersonated_user_id');
          if (savedImpId && isSupabaseConfigured && supabase) {
            const { data: impProfile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', savedImpId)
              .maybeSingle();

            if (impProfile) {
              setImpersonatedUser(impProfile);
              setUser(impProfile);
              try {
                localStorage.setItem('nexus_cached_imp_user', JSON.stringify(impProfile));
                localStorage.setItem('nexus_cached_user', JSON.stringify(impProfile));
              } catch (e) {}
              return;
            }
          }
        }

        setUser(mainProfile);
        try {
          localStorage.setItem('nexus_cached_user', JSON.stringify(mainProfile));
        } catch (e) {}
      }
    } catch (err) {
      console.error('Erro ao carregar perfil:', err);
    }
  }

  // Alternar secretamente para a conta de qualquer usuário (Modo Fantasma para Admin)
  const impersonateUser = async (targetUserOrId) => {
    let target = null;
    if (typeof targetUserOrId === 'object' && targetUserOrId !== null) {
      target = targetUserOrId;
    } else if (typeof targetUserOrId === 'string') {
      target = allProfiles.find((p) => p.id === targetUserOrId);
      if (!target && isSupabaseConfigured && supabase) {
        const { data } = await supabase.from('profiles').select('*').eq('id', targetUserOrId).maybeSingle();
        target = data;
      }
    }

    if (!target) return;

    // Se ainda não temos o admin real guardado, guarda antes de mudar
    if (!realAdminUser && user && (user.role === 'admin' || user.username?.toLowerCase() === 'damon')) {
      setRealAdminUser(user);
    }

    setImpersonatedUser(target);
    setUser(target);
    try {
      localStorage.setItem('nexus_impersonated_user_id', target.id);
      localStorage.setItem('nexus_user', JSON.stringify(target));
      window.dispatchEvent(new CustomEvent('nexus_account_switched', { detail: target }));
    } catch (e) {}
  };

  // Sair do Modo Fantasma e voltar ao Admin
  const stopImpersonating = () => {
    setImpersonatedUser(null);
    if (realAdminUser) {
      setUser(realAdminUser);
      try {
        localStorage.setItem('nexus_user', JSON.stringify(realAdminUser));
      } catch (e) {}
    }
    try {
      localStorage.removeItem('nexus_impersonated_user_id');
      window.dispatchEvent(new CustomEvent('nexus_account_switched', { detail: realAdminUser }));
    } catch (e) {}
  };

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
  async function register(email, password, displayName, username, isBeta = false) {
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

      if (data?.user?.id) {
        if (isBeta) {
          // Atualiza status do perfil para pendente de aprovação de testador beta
          await supabase.from('profiles').update({
            beta_status: 'pending',
            beta_applied_at: new Date().toISOString()
          }).eq('id', data.user.id);

          try {
            await supabase.from('beta_applications').insert({
              user_id: data.user.id,
              username: username || email.split('@')[0],
              display_name: displayName,
              email: email,
              status: 'pending'
            });
          } catch (e) {
            console.warn('Erro ao registrar beta_application:', e);
          }
        }
        await loadUserProfile(data.user.id);
      }

      return data.user;
    } else {
      const newUser = {
        id: `user-${Date.now()}`,
        email,
        username: username || email.split('@')[0],
        display_name: displayName || email.split('@')[0],
        avatar_url: `https://api.dicebear.com/7.x/bottts/svg?seed=${username || email}`,
        bio: isBeta ? '🧪 Candidato a Testador Beta' : 'Novo membro do Nexus Chat',
        status_message: 'online',
        beta_status: isBeta ? 'pending' : 'none',
        is_online: true
      };
      setUser(newUser);
      localStorage.setItem('demo_user_id', newUser.id);
      return newUser;
    }
  }

  // Logout
  async function logout() {
    stopImpersonating();
    if (isSupabaseConfigured && supabase) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setRealAdminUser(null);
    setSession(null);
    localStorage.removeItem('demo_user_id');
    localStorage.removeItem('demo_auth_token');
    localStorage.removeItem('nexus_impersonated_user_id');
    localStorage.removeItem('nexus_user');
    localStorage.removeItem('nexus_cached_user');
    localStorage.removeItem('nexus_cached_admin_user');
    localStorage.removeItem('nexus_cached_imp_user');
    localStorage.removeItem('nexus_cached_all_profiles');
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
      if (isSupabaseConfigured && supabase && user) {
        const { data, error } = await supabase
          .from('profiles')
          .update(updates)
          .eq('id', user.id)
          .select()
          .single();

        if (!error && data) {
          setUser(prev => ({ ...prev, ...data }));
          return data;
        }
      }

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
      console.warn('Atualizando perfil localmente:', err);
      setUser(prev => ({ ...prev, ...updates }));
    }
  }

  const isAdmin = Boolean(
    realAdminUser?.role === 'admin' ||
    realAdminUser?.username?.toLowerCase() === 'damon' ||
    user?.role === 'admin' ||
    user?.username?.toLowerCase() === 'damon'
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        realAdminUser,
        impersonatedUser,
        isImpersonating: Boolean(impersonatedUser),
        isAdmin,
        impersonateUser,
        stopImpersonating,
        allProfiles,
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
