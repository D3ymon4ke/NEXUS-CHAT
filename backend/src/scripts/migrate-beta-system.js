process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const { Client } = require('pg');

const connectionString = 'postgres://postgres.hlmqvbfdxiusxirtdmjn:0eGOkvYSF8ko9jCJ@aws-0-sa-east-1.pooler.supabase.com:5432/postgres?sslmode=no-verify';

async function migrateBetaSystem() {
  console.log('⏳ Conectando ao PostgreSQL do Supabase para migrar o sistema de Beta Testers e title_reward_pending...');
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });

  try {
    await client.connect();
    console.log('✅ Conectado ao PostgreSQL!');

    const sql = `
      -- 1. Adicionar title_reward_pending e colunas de Beta Tester na tabela profiles
      ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS title_reward_pending TEXT;
      ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS beta_status TEXT DEFAULT 'none';
      ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS beta_applied_at TIMESTAMPTZ;
      ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS beta_approved_at TIMESTAMPTZ;
      ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS beta_notes TEXT;

      -- 2. Tabela opcional de inscrições beta caso queira histórico dedicado
      CREATE TABLE IF NOT EXISTS public.beta_applications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
        username TEXT NOT NULL,
        display_name TEXT,
        email TEXT,
        status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'approved' | 'rejected'
        notes TEXT,
        applied_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()),
        reviewed_at TIMESTAMPTZ,
        reviewed_by UUID
      );

      ALTER TABLE public.beta_applications ENABLE ROW LEVEL SECURITY;

      DROP POLICY IF EXISTS "Todos podem criar inscricao beta" ON public.beta_applications;
      CREATE POLICY "Todos podem criar inscricao beta"
        ON public.beta_applications FOR INSERT
        WITH CHECK (true);

      DROP POLICY IF EXISTS "Todos podem ler inscricoes beta" ON public.beta_applications;
      CREATE POLICY "Todos podem ler inscricoes beta"
        ON public.beta_applications FOR SELECT
        USING (true);

      DROP POLICY IF EXISTS "Admin gerenciar inscricoes beta" ON public.beta_applications;
      CREATE POLICY "Admin gerenciar inscricoes beta"
        ON public.beta_applications FOR ALL
        USING (true)
        WITH CHECK (true);

      -- 3. Notificar PostgREST para recarregar o schema cache imediatamente
      NOTIFY pgrst, 'reload schema';
    `;

    await client.query(sql);
    console.log('🎉 Migração do sistema Beta Tester e colunas de profiles concluída com sucesso!');
  } catch (err) {
    console.error('❌ Erro na migração:', err);
  } finally {
    await client.end();
  }
}

migrateBetaSystem();
