process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const { Client } = require('pg');

const connectionString = 'postgres://postgres.hlmqvbfdxiusxirtdmjn:0eGOkvYSF8ko9jCJ@aws-0-sa-east-1.pooler.supabase.com:5432/postgres?sslmode=no-verify';

async function fixMessagesAndCleanupRLS() {
  console.log('⏳ Ajustando permissões de exclusão e limpeza de mensagens no PostgreSQL...');
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });

  try {
    await client.connect();
    console.log('✅ Conectado ao PostgreSQL!');

    const sql = `
      -- 1. Desabilitar restrições RLS em messages para permitir limpeza pelo Admin e exclusão
      DROP POLICY IF EXISTS "Usuários podem ver mensagens das suas conversas" ON public.messages;
      DROP POLICY IF EXISTS "Usuários podem enviar mensagens" ON public.messages;
      DROP POLICY IF EXISTS "Usuários podem editar suas mensagens" ON public.messages;
      DROP POLICY IF EXISTS "Usuários podem deletar suas mensagens" ON public.messages;
      DROP POLICY IF EXISTS "Permissao geral messages" ON public.messages;

      CREATE POLICY "Permissao geral messages" ON public.messages FOR ALL USING (true) WITH CHECK (true);

      -- 2. Limpar mensagens deletadas
      DELETE FROM public.messages WHERE is_deleted = true;

      -- 3. Se existirem tabelas de reactions ou anexos
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'message_reactions') THEN
          DROP POLICY IF EXISTS "Permissao geral reactions" ON public.message_reactions;
          CREATE POLICY "Permissao geral reactions" ON public.message_reactions FOR ALL USING (true) WITH CHECK (true);
        END IF;

        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'message_attachments') THEN
          DROP POLICY IF EXISTS "Permissao geral attachments" ON public.message_attachments;
          CREATE POLICY "Permissao geral attachments" ON public.message_attachments FOR ALL USING (true) WITH CHECK (true);
        END IF;
      END $$;
    `;

    await client.query(sql);
    console.log('🎉 Políticas de limpeza de mensagens aplicadas com sucesso e mensagens purgadas!');
  } catch (err) {
    console.error('❌ Erro ao atualizar políticas de messages:', err);
  } finally {
    await client.end();
  }
}

fixMessagesAndCleanupRLS();
