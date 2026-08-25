import { createClient } from '@supabase/supabase-js';

const defaultSupabaseUrl = 'https://hlmqvbfdxiusxirtdmjn.supabase.co';
const defaultSupabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhsbXF2YmZkeGl1c3hpcnRkbWpuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc2Nzg5NzIsImV4cCI6MjEwMzI1NDk3Mn0.pHRJvKDgtH-lCqD4wLdvFKhyuKo33SKBEHaQ0Sn5hIY';

const supabaseUrl = 
  import.meta.env.VITE_SUPABASE_URL || 
  import.meta.env.NEXT_PUBLIC_SUPABASE_URL || 
  import.meta.env.SUPABASE_URL || 
  defaultSupabaseUrl;

const supabaseAnonKey = 
  import.meta.env.VITE_SUPABASE_ANON_KEY || 
  import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 
  import.meta.env.SUPABASE_ANON_KEY || 
  import.meta.env.SUPABASE_KEY || 
  defaultSupabaseAnonKey;

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  !supabaseUrl.includes('your-supabase-project') &&
  !supabaseAnonKey.includes('your-supabase')
);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null;
