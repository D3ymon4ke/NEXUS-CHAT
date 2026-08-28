process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const { Client } = require('pg');

const connectionString = 'postgres://postgres.hlmqvbfdxiusxirtdmjn:0eGOkvYSF8ko9jCJ@aws-0-sa-east-1.pooler.supabase.com:5432/postgres?sslmode=no-verify';

async function migrateHubPolls() {
  console.log('⏳ Conectando ao PostgreSQL do Supabase para migrar Enquetes do Hub...');
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });

  try {
    await client.connect();
    console.log('✅ Conectado ao PostgreSQL!');

    const sql = `
      -- 1. Criar ou atualizar tabela nexus_polls
      CREATE TABLE IF NOT EXISTS public.nexus_polls (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
        creator_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
        message_id UUID REFERENCES public.messages(id) ON DELETE CASCADE,
        question TEXT NOT NULL,
        options JSONB NOT NULL DEFAULT '[]'::jsonb,
        expires_at TIMESTAMPTZ,
        allow_multiple BOOLEAN DEFAULT false,
        is_closed BOOLEAN DEFAULT false,
        is_hub_poll BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
      );

      -- Garantir que conversation_id e creator_id sejam opcionais (para enquetes do Hub)
      ALTER TABLE public.nexus_polls ALTER COLUMN conversation_id DROP NOT NULL;
      ALTER TABLE public.nexus_polls ALTER COLUMN creator_id DROP NOT NULL;
      ALTER TABLE public.nexus_polls ADD COLUMN IF NOT EXISTS is_hub_poll BOOLEAN DEFAULT false;
      ALTER TABLE public.nexus_polls ADD COLUMN IF NOT EXISTS is_closed BOOLEAN DEFAULT false;

      -- 2. Tabela de Votos da Enquete
      CREATE TABLE IF NOT EXISTS public.poll_votes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        poll_id UUID NOT NULL REFERENCES public.nexus_polls(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
        option_id INT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
        UNIQUE(poll_id, user_id, option_id)
      );

      -- 3. Índices para busca rápida
      CREATE INDEX IF NOT EXISTS idx_nexus_polls_hub ON public.nexus_polls(is_hub_poll, is_closed);
      CREATE INDEX IF NOT EXISTS idx_poll_votes_poll ON public.poll_votes(poll_id);
      CREATE INDEX IF NOT EXISTS idx_poll_votes_user ON public.poll_votes(user_id);

      -- 4. RLS Permissivo para Enquetes
      ALTER TABLE public.nexus_polls ENABLE ROW LEVEL SECURITY;
      ALTER TABLE public.poll_votes ENABLE ROW LEVEL SECURITY;

      DROP POLICY IF EXISTS "Public select nexus_polls" ON public.nexus_polls;
      DROP POLICY IF EXISTS "Public insert nexus_polls" ON public.nexus_polls;
      DROP POLICY IF EXISTS "Public update nexus_polls" ON public.nexus_polls;
      DROP POLICY IF EXISTS "Public delete nexus_polls" ON public.nexus_polls;

      CREATE POLICY "Public select nexus_polls" ON public.nexus_polls FOR SELECT USING (true);
      CREATE POLICY "Public insert nexus_polls" ON public.nexus_polls FOR INSERT WITH CHECK (true);
      CREATE POLICY "Public update nexus_polls" ON public.nexus_polls FOR UPDATE USING (true) WITH CHECK (true);
      CREATE POLICY "Public delete nexus_polls" ON public.nexus_polls FOR DELETE USING (true);

      DROP POLICY IF EXISTS "Public select poll_votes" ON public.poll_votes;
      DROP POLICY IF EXISTS "Public insert poll_votes" ON public.poll_votes;
      DROP POLICY IF EXISTS "Public delete poll_votes" ON public.poll_votes;

      CREATE POLICY "Public select poll_votes" ON public.poll_votes FOR SELECT USING (true);
      CREATE POLICY "Public insert poll_votes" ON public.poll_votes FOR INSERT WITH CHECK (true);
      CREATE POLICY "Public delete poll_votes" ON public.poll_votes FOR DELETE USING (true);

      -- 5. Recarregar Schema Cache
      NOTIFY pgrst, 'reload schema';
    `;

    await client.query(sql);
    console.log('🎉 Migração de Enquetes do Hub concluída com sucesso!');

    // 6. Inserir uma enquete inicial da comunidade se não houver nenhuma
    const checkPolls = await client.query(`SELECT count(*) FROM public.nexus_polls WHERE is_hub_poll = true;`);
    if (parseInt(checkPolls.rows[0].count, 10) === 0) {
      console.log('🗳️ Criando enquete de boas-vindas da comunidade...');
      await client.query(`
        INSERT INTO public.nexus_polls (
          question, 
          options, 
          is_hub_poll, 
          allow_multiple, 
          is_closed
        ) VALUES (
          '🚀 Qual próxima grande novidade você quer ver no Nexus Chat?',
          '[
            {"id": 0, "text": "🎙️ Chamadas de Voz & Canais de Áudio"},
            {"id": 1, "text": "🎮 Mini-Games & Apostas com Nexus Coins"},
            {"id": 2, "text": "🎨 Criador de Temas & Emojis Customizados"},
            {"id": 3, "text": "🏆 Sistema de Conquistas & Níveis de EXP"}
          ]'::jsonb,
          true,
          false,
          false
        );
      `);
      console.log('✅ Enquete inicial da comunidade criada com sucesso!');
    }

  } catch (err) {
    console.error('❌ Erro durante a migração de enquetes:', err);
  } finally {
    await client.end();
  }
}

migrateHubPolls();
