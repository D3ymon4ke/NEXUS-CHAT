import { supabase, isSupabaseConfigured } from './supabaseClient';

const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';

const API_BASE_URL = 
  import.meta.env.VITE_API_URL || 
  import.meta.env.NEXT_PUBLIC_API_URL || 
  (isHttps ? '/api' : 'http://187.127.40.228:5000/api');

/**
 * Utilitário para chamadas à API com token JWT automático
 */
export async function apiRequest(endpoint, options = {}) {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${API_BASE_URL}${cleanEndpoint}`;

  let token = null;
  if (isSupabaseConfigured && supabase) {
    const session = (await supabase.auth.getSession()).data.session;
    token = session?.access_token;
  } else {
    token = localStorage.getItem('demo_auth_token') || 'demo-jwt-token';
  }

  const headers = {
    ...(options.headers || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`Erro na requisição ${endpoint}:`, error);
    return {
      success: false,
      error: error.message || 'Erro de conexão com o servidor.',
    };
  }
}
