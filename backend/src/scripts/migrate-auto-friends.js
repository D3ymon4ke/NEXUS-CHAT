process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const { Client } = require('pg');

const connectionString = 'postgres://postgres.hlmqvbfdxiusxirtdmjn:0eGOkvYSF8ko9jCJ@aws-0-sa-east-1.pooler.supabase.com:5432/postgres?sslmode=no-verify';

async function migrateAutoFriends() {
  console.log('⏳ Conectando ao Supabase para configurar Sistema de Amizade Automática...');
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });

  try {
    await client.connect();
    console.log('✅ Conectado ao PostgreSQL!');

    const sql = `
      -- 1. Atualizar todas as amizades existentes para 'accepted'
      UPDATE public.friendships
      SET status = 'accepted';

      -- 2. Gerar amizades entre todos os pares de usuários já existentes
      INSERT INTO public.friendships (user_id, friend_id, status)
      SELECT p1.id, p2.id, 'accepted'
      FROM public.profiles p1
      CROSS JOIN public.profiles p2
      WHERE p1.id < p2.id
      ON CONFLICT (user_id, friend_id) DO UPDATE SET status = 'accepted';

      -- 3. Atualizar a trigger function handle_new_user() para incluir amizade automática em novos cadastros
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
          VALUES (NEW.id, 100, 'initial_bonus', 'Bônus de boas-vindas do Nexus Chat')
          ON CONFLICT DO NOTHING;

          -- 5. Auto-Amizade: Conectar automaticamente o novo usuário como amigo aceito de todos os outros usuários
          INSERT INTO public.friendships (user_id, friend_id, status)
          SELECT NEW.id, p.id, 'accepted'
          FROM public.profiles p
          WHERE p.id != NEW.id
          ON CONFLICT (user_id, friend_id) DO UPDATE SET status = 'accepted';

          RETURN NEW;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `;

    await client.query(sql);
    console.log('🎉 Sistema de Amizade Automática configurado com sucesso no Supabase!');

    // Verificar quantas amizades foram criadas
    const res = await client.query(`SELECT count(*) FROM public.friendships WHERE status = 'accepted';`);
    console.log(`📊 Total de conexões de amizade ativas: ${res.rows[0].count}`);

  } catch (err) {
    console.error('❌ Erro ao migrar amizades automáticas:', err);
  } finally {
    await client.end();
  }
}

migrateAutoFriends();
