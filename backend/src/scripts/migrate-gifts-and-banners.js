process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const { Client } = require('pg');

const connectionString = 'postgres://postgres.hlmqvbfdxiusxirtdmjn:0eGOkvYSF8ko9jCJ@aws-0-sa-east-1.pooler.supabase.com:5432/postgres?sslmode=no-verify';

async function migrateGiftsAndBanners() {
  console.log('⏳ Conectando ao PostgreSQL do Supabase para migrar Presentes e Capas...');
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });

  try {
    await client.connect();
    console.log('✅ Conectado ao PostgreSQL!');

    const sql = `
      -- 1. Coluna de Capa de Perfil na tabela profiles
      ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS profile_banner_url TEXT;

      -- 2. Tabela de Presentes do Usuário (User Gifts)
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

      -- 3. Índices para performance
      CREATE INDEX IF NOT EXISTS idx_user_gifts_recipient ON public.user_gifts(recipient_id);
      CREATE INDEX IF NOT EXISTS idx_user_gifts_sender ON public.user_gifts(sender_id);

      -- 4. Habilitar RLS
      ALTER TABLE public.user_gifts ENABLE ROW LEVEL SECURITY;

      -- 5. Remover políticas antigas se existirem para evitar duplicidade
      DROP POLICY IF EXISTS "Presentes visíveis para todos os usuários autenticados" ON public.user_gifts;
      DROP POLICY IF EXISTS "Usuários autenticados podem enviar presentes" ON public.user_gifts;
      DROP POLICY IF EXISTS "Public select user_gifts" ON public.user_gifts;
      DROP POLICY IF EXISTS "Public insert user_gifts" ON public.user_gifts;

      -- 6. Políticas de Acesso
      CREATE POLICY "Public select user_gifts"
        ON public.user_gifts FOR SELECT
        USING (true);

      CREATE POLICY "Public insert user_gifts"
        ON public.user_gifts FOR INSERT
        WITH CHECK (true);
    `;

    await client.query(sql);
    console.log('🎉 Migração concluída com sucesso no PostgreSQL do Supabase!');
  } catch (err) {
    console.error('❌ Erro durante a migração:', err);
  } finally {
    await client.end();
  }
}

migrateGiftsAndBanners();
