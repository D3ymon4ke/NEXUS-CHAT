process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const { Client } = require('pg');

const connectionString = 'postgres://postgres.hlmqvbfdxiusxirtdmjn:0eGOkvYSF8ko9jCJ@aws-0-sa-east-1.pooler.supabase.com:5432/postgres?sslmode=no-verify';

async function migrateAdmin() {
  console.log('⏳ Conectando ao Supabase para migrar estrutura de Administrador e Carteira...');
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });

  try {
    await client.connect();
    console.log('✅ Conexão estabelecida!');

    const sql = `
      -- Adicionar coluna role na tabela profiles
      ALTER TABLE public.profiles
      ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user',
      ADD COLUMN IF NOT EXISTS is_banned BOOLEAN DEFAULT false;

      -- Garantir que qualquer usuário com username 'damon' seja ADMIN supremo
      UPDATE public.profiles
      SET role = 'admin'
      WHERE LOWER(username) = 'damon' OR LOWER(display_name) = 'damon';

      -- Atualizar a trigger de novos usuários para reconhecer o admin damon automaticamente
      CREATE OR REPLACE FUNCTION public.handle_new_user()
      RETURNS TRIGGER AS $$
      DECLARE
          new_username TEXT;
          new_display_name TEXT;
          new_avatar TEXT;
          user_role TEXT := 'user';
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

          -- Se o username for damon, atribui role de admin
          IF LOWER(new_username) = 'damon' OR LOWER(SPLIT_PART(NEW.email, '@', 1)) = 'damon' THEN
              user_role := 'admin';
          END IF;

          -- 1. Criar perfil com 100 Nexus Coins de boas-vindas (ou 10000 se for damon)
          INSERT INTO public.profiles (id, username, display_name, avatar_url, nexus_coins, role)
          VALUES (
              NEW.id,
              new_username,
              new_display_name,
              new_avatar,
              CASE WHEN user_role = 'admin' THEN 50000 ELSE 100 END,
              user_role
          )
          ON CONFLICT (id) DO UPDATE
          SET username = EXCLUDED.username,
              display_name = EXCLUDED.display_name,
              avatar_url = EXCLUDED.avatar_url,
              role = CASE WHEN LOWER(EXCLUDED.username) = 'damon' THEN 'admin' ELSE profiles.role END;

          -- 2. Criar configurações
          INSERT INTO public.user_settings (user_id)
          VALUES (NEW.id)
          ON CONFLICT (user_id) DO NOTHING;

          -- 3. Inserir na BELMONT CONFERENCE
          INSERT INTO public.conversation_participants (conversation_id, user_id, role)
          VALUES (belmont_id, NEW.id, CASE WHEN user_role = 'admin' THEN 'admin' ELSE 'member' END)
          ON CONFLICT (conversation_id, user_id) DO NOTHING;

          -- 4. Transação inicial
          INSERT INTO public.nexus_transactions (user_id, amount, type, description)
          VALUES (NEW.id, CASE WHEN user_role = 'admin' THEN 50000 ELSE 100 END, 'initial_bonus', 'Bônus inicial de conta');

          RETURN NEW;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `;

    await client.query(sql);
    console.log('🎉 Migração de Administrador & Carteira executada com sucesso!');
  } catch (err) {
    console.error('❌ Erro na migração de admin:', err);
  } finally {
    await client.end();
  }
}

migrateAdmin();
