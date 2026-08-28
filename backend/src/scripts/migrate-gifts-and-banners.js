/**
 * Migração para criar tabela de presentes (user_gifts) e coluna profile_banner_url na tabela profiles
 */
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
  console.log('ℹ️ Supabase URL ou Service Key não definidos no backend. Verificando configuração...');
}

const supabase = (SUPABASE_URL && SUPABASE_SERVICE_ROLE)
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE)
  : null;

async function runMigration() {
  console.log('🚀 Iniciando migração de presentes e capas de perfil...');

  if (!supabase) {
    console.log('⚠️ Cliente supabase com service role não disponível. As consultas no frontend utilizarão fallbacks e schema client.');
    return;
  }

  try {
    // 1. Criar tabela user_gifts
    const { error: giftsTableError } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS profile_banner_url TEXT;

        CREATE TABLE IF NOT EXISTS public.user_gifts (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
          recipient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
          gift_id TEXT NOT NULL,
          gift_name TEXT NOT NULL,
          gift_icon TEXT NOT NULL,
          rarity TEXT NOT NULL DEFAULT 'common',
          price INTEGER NOT NULL DEFAULT 50,
          quantity INTEGER NOT NULL DEFAULT 1,
          message TEXT,
          created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_user_gifts_recipient ON public.user_gifts(recipient_id);
        CREATE INDEX IF NOT EXISTS idx_user_gifts_sender ON public.user_gifts(sender_id);
      `
    });

    if (giftsTableError) {
      console.log('ℹ️ RPC exec_sql retornou mensagem (ou não existe RPC):', giftsTableError.message);
    } else {
      console.log('✅ Tabela user_gifts e coluna profile_banner_url criadas com sucesso!');
    }
  } catch (err) {
    console.warn('ℹ️ Informação sobre a migração:', err.message);
  }
}

runMigration();
