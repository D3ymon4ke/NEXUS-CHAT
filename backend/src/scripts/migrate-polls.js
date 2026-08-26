process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const { Client } = require('pg');

const connectionString = 'postgres://postgres.hlmqvbfdxiusxirtdmjn:0eGOkvYSF8ko9jCJ@aws-0-sa-east-1.pooler.supabase.com:5432/postgres?sslmode=no-verify';

async function migratePolls() {
  console.log('⏳ Criando tabelas de Enquetes no PostgreSQL...');
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });

  try {
    await client.connect();
    console.log('✅ Conectado ao PostgreSQL!');

    const sql = `
      -- 1. Tabela de Enquetes
      CREATE TABLE IF NOT EXISTS public.nexus_polls (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
        creator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
        message_id UUID REFERENCES public.messages(id) ON DELETE CASCADE,
        question TEXT NOT NULL,
        options JSONB NOT NULL DEFAULT '[]'::jsonb,
        expires_at TIMESTAMPTZ,
        allow_multiple BOOLEAN DEFAULT false,
        is_closed BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- 2. Tabela de Votos
      CREATE TABLE IF NOT EXISTS public.poll_votes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        poll_id UUID NOT NULL REFERENCES public.nexus_polls(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
        option_id INT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(poll_id, user_id, option_id)
      );

      -- 3. RLS permissivo para Realtime
      ALTER TABLE public.nexus_polls ENABLE ROW LEVEL SECURITY;
      ALTER TABLE public.poll_votes ENABLE ROW LEVEL SECURITY;

      DROP POLICY IF EXISTS "Permissao geral nexus_polls" ON public.nexus_polls;
      CREATE POLICY "Permissao geral nexus_polls" ON public.nexus_polls FOR ALL USING (true) WITH CHECK (true);

      DROP POLICY IF EXISTS "Permissao geral poll_votes" ON public.poll_votes;
      CREATE POLICY "Permissao geral poll_votes" ON public.poll_votes FOR ALL USING (true) WITH CHECK (true);
    `;

    await client.query(sql);
    console.log('🎉 Tabelas de enquetes criadas com sucesso!');
  } catch (err) {
    console.error('❌ Erro ao criar tabelas de enquetes:', err);
  } finally {
    await client.end();
  }
}

migratePolls();
