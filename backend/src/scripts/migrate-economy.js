process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const { Client } = require('pg');

const connectionString = 'postgres://postgres.hlmqvbfdxiusxirtdmjn:0eGOkvYSF8ko9jCJ@aws-0-sa-east-1.pooler.supabase.com:5432/postgres?sslmode=no-verify';

async function migrateEconomy() {
  console.log('⏳ Conectando ao Supabase para migrar o sistema de economia NEXUS COINS...');
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });

  try {
    await client.connect();
    console.log('✅ Conexão estabelecida!');

    const sql = `
      -- Adicionar colunas de economia e personalização à tabela profiles
      ALTER TABLE public.profiles
      ADD COLUMN IF NOT EXISTS nexus_coins INTEGER DEFAULT 100,
      ADD COLUMN IF NOT EXISTS daily_streak INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS last_daily_claim TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS equipped_frame TEXT DEFAULT 'default',
      ADD COLUMN IF NOT EXISTS equipped_bubble TEXT DEFAULT 'default',
      ADD COLUMN IF NOT EXISTS equipped_badge TEXT DEFAULT 'none',
      ADD COLUMN IF NOT EXISTS equipped_name_color TEXT DEFAULT 'default',
      ADD COLUMN IF NOT EXISTS unlocked_items JSONB DEFAULT '["frame_default", "bubble_default"]'::jsonb;

      -- Tabela de histórico de transações de Nexus Coins
      CREATE TABLE IF NOT EXISTS public.nexus_transactions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
        amount INTEGER NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('message_reward', 'daily_claim', 'shop_purchase', 'initial_bonus')),
        description TEXT,
        created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_nexus_transactions_user ON public.nexus_transactions(user_id, created_at DESC);

      -- Atualizar função handle_new_user para garantir 100 Nexus Coins iniciais e auto-confirmação
      CREATE OR REPLACE FUNCTION public.handle_new_user()
      RETURNS TRIGGER AS $$
      DECLARE
          new_username TEXT;
          new_display_name TEXT;
          new_avatar TEXT;
          belmont_id UUID := '00000000-0000-0000-0000-000000000001';
      BEGIN
          new_username := COALESCE(
              NEW.raw_user_meta_data->>'username',
              SPLIT_PART(NEW.email, '@', 1) || '_' || SUBSTRING(NEW.id::text, 1, 4)
          );
          new_display_name := COALESCE(
              NEW.raw_user_meta_data->>'display_name',
              NEW.raw_user_meta_data->>'full_name',
              SPLIT_PART(NEW.email, '@', 1)
          );
          new_avatar := COALESCE(
              NEW.raw_user_meta_data->>'avatar_url',
              'https://api.dicebear.com/7.x/bottts/svg?seed=' || NEW.id::text
          );

          -- 1. Criar perfil com 100 Nexus Coins de bônus de boas-vindas
          INSERT INTO public.profiles (id, username, display_name, avatar_url, nexus_coins)
          VALUES (NEW.id, new_username, new_display_name, new_avatar, 100)
          ON CONFLICT (id) DO UPDATE
          SET username = EXCLUDED.username,
              display_name = EXCLUDED.display_name,
              avatar_url = EXCLUDED.avatar_url;

          -- 2. Criar configurações
          INSERT INTO public.user_settings (user_id)
          VALUES (NEW.id)
          ON CONFLICT (user_id) DO NOTHING;

          -- 3. Inserir AUTOMATICAMENTE na BELMONT CONFERENCE
          INSERT INTO public.conversation_participants (conversation_id, user_id, role)
          VALUES (belmont_id, NEW.id, 'member')
          ON CONFLICT (conversation_id, user_id) DO NOTHING;

          -- 4. Registrar transação do bônus inicial
          INSERT INTO public.nexus_transactions (user_id, amount, type, description)
          VALUES (NEW.id, 100, 'initial_bonus', 'Bônus de boas-vindas do Nexus Chat');

          RETURN NEW;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `;

    await client.query(sql);
    console.log('🎉 Migração de Economia & Nexus Coins concluída com sucesso no Supabase!');
  } catch (err) {
    console.error('❌ Erro na migração de economia:', err);
  } finally {
    await client.end();
  }
}

migrateEconomy();
