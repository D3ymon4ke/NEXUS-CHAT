process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const { Client } = require('pg');

const connectionString = 'postgres://postgres.hlmqvbfdxiusxirtdmjn:0eGOkvYSF8ko9jCJ@aws-0-sa-east-1.pooler.supabase.com:5432/postgres?sslmode=no-verify';

async function fixParticipantsAndMessagesRLS() {
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  try {
    await client.connect();
    console.log('✅ Conectado ao PostgreSQL!');

    const sql = `
      -- 1. Políticas para conversation_participants
      DROP POLICY IF EXISTS "Participantes visíveis para quem está na conversa" ON public.conversation_participants;
      DROP POLICY IF EXISTS "Inserir participantes" ON public.conversation_participants;
      DROP POLICY IF EXISTS "Permitir select em participantes" ON public.conversation_participants;
      DROP POLICY IF EXISTS "Permitir insert em participantes" ON public.conversation_participants;
      DROP POLICY IF EXISTS "Permitir update em participantes" ON public.conversation_participants;
      DROP POLICY IF EXISTS "Permitir delete em participantes" ON public.conversation_participants;

      CREATE POLICY "Permitir select em participantes"
      ON public.conversation_participants FOR SELECT
      USING (true);

      CREATE POLICY "Permitir insert em participantes"
      ON public.conversation_participants FOR INSERT
      WITH CHECK (auth.role() = 'authenticated');

      CREATE POLICY "Permitir update em participantes"
      ON public.conversation_participants FOR UPDATE
      USING (auth.role() = 'authenticated');

      CREATE POLICY "Permitir delete em participantes"
      ON public.conversation_participants FOR DELETE
      USING (auth.role() = 'authenticated');

      -- 2. Políticas para conversations
      DROP POLICY IF EXISTS "Usuários podem ver conversas das quais participam" ON public.conversations;
      DROP POLICY IF EXISTS "Usuários autenticados podem criar conversas" ON public.conversations;
      DROP POLICY IF EXISTS "Admins podem atualizar detalhes da conversa" ON public.conversations;
      DROP POLICY IF EXISTS "Permitir select em conversas" ON public.conversations;
      DROP POLICY IF EXISTS "Permitir insert em conversas" ON public.conversations;
      DROP POLICY IF EXISTS "Permitir update em conversas" ON public.conversations;

      CREATE POLICY "Permitir select em conversas"
      ON public.conversations FOR SELECT
      USING (true);

      CREATE POLICY "Permitir insert em conversas"
      ON public.conversations FOR INSERT
      WITH CHECK (auth.role() = 'authenticated');

      CREATE POLICY "Permitir update em conversas"
      ON public.conversations FOR UPDATE
      USING (auth.role() = 'authenticated');

      -- 3. Políticas para messages
      DROP POLICY IF EXISTS "Mensagens visíveis para membros da conversa" ON public.messages;
      DROP POLICY IF EXISTS "Membros podem enviar mensagens na conversa" ON public.messages;
      DROP POLICY IF EXISTS "Usuários podem editar ou excluir suas próprias mensagens" ON public.messages;
      DROP POLICY IF EXISTS "Permitir select em mensagens" ON public.messages;
      DROP POLICY IF EXISTS "Permitir insert em mensagens" ON public.messages;
      DROP POLICY IF EXISTS "Permitir update em mensagens" ON public.messages;
      DROP POLICY IF EXISTS "Permitir delete em mensagens" ON public.messages;

      CREATE POLICY "Permitir select em mensagens"
      ON public.messages FOR SELECT
      USING (true);

      CREATE POLICY "Permitir insert em mensagens"
      ON public.messages FOR INSERT
      WITH CHECK (auth.role() = 'authenticated');

      CREATE POLICY "Permitir update em mensagens"
      ON public.messages FOR UPDATE
      USING (auth.role() = 'authenticated');

      CREATE POLICY "Permitir delete em mensagens"
      ON public.messages FOR DELETE
      USING (auth.role() = 'authenticated');
    `;

    await client.query(sql);
    console.log('🎉 Políticas de RLS de conversas, participantes e mensagens atualizadas com sucesso!');
  } catch (err) {
    console.error('❌ Erro:', err);
  } finally {
    await client.end();
  }
}

fixParticipantsAndMessagesRLS();
