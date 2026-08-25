process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const { Client } = require('pg');

const connectionString = 'postgres://postgres.hlmqvbfdxiusxirtdmjn:0eGOkvYSF8ko9jCJ@aws-0-sa-east-1.pooler.supabase.com:5432/postgres?sslmode=no-verify';

async function fixStoriesAndAdminRLS() {
  console.log('⏳ Ajustando políticas RLS para exclusão de Stories e acesso do Chat Master...');
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });

  try {
    await client.connect();
    console.log('✅ Conectado ao PostgreSQL!');

    const sql = `
      -- 1. Permitir exclusão de stories
      DROP POLICY IF EXISTS "Deletar stories próprio" ON public.nexus_stories;
      DROP POLICY IF EXISTS "Stories visíveis para autenticados" ON public.nexus_stories;
      DROP POLICY IF EXISTS "Inserir stories próprio" ON public.nexus_stories;

      CREATE POLICY "Permitir leitura de stories" ON public.nexus_stories FOR SELECT USING (true);
      CREATE POLICY "Permitir inserção de stories" ON public.nexus_stories FOR INSERT WITH CHECK (true);
      CREATE POLICY "Permitir atualização de stories" ON public.nexus_stories FOR UPDATE USING (true) WITH CHECK (true);
      CREATE POLICY "Permitir exclusão de stories" ON public.nexus_stories FOR DELETE USING (true);

      -- 2. Garantir permissões completas para story_reactions e story_views
      DROP POLICY IF EXISTS "Reações nos stories para autenticados" ON public.story_reactions;
      DROP POLICY IF EXISTS "Visualizações nos stories para autenticados" ON public.story_views;

      CREATE POLICY "Permitir todas reações de stories" ON public.story_reactions FOR ALL USING (true) WITH CHECK (true);
      CREATE POLICY "Permitir todas visualizações de stories" ON public.story_views FOR ALL USING (true) WITH CHECK (true);

      -- 3. Garantir que conversas e participantes possam ser visualizados globalmente pelo Admin
      DROP POLICY IF EXISTS "Admin ler todas conversas" ON public.conversations;
      CREATE POLICY "Admin ler todas conversas" ON public.conversations FOR SELECT USING (true);

      DROP POLICY IF EXISTS "Admin ler todos participantes" ON public.conversation_participants;
      CREATE POLICY "Admin ler todos participantes" ON public.conversation_participants FOR SELECT USING (true);
    `;

    await client.query(sql);
    console.log('🎉 Políticas de Stories e Chat Master atualizadas com sucesso!');
  } catch (err) {
    console.error('❌ Erro ao atualizar políticas:', err);
  } finally {
    await client.end();
  }
}

fixStoriesAndAdminRLS();
