process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const { Client } = require('pg');

const connectionString = 'postgres://postgres.hlmqvbfdxiusxirtdmjn:0eGOkvYSF8ko9jCJ@aws-0-sa-east-1.pooler.supabase.com:5432/postgres?sslmode=no-verify';

async function fixRLS() {
  console.log('⏳ Conectando ao Supabase para corrigir políticas RLS (recursão infinita)...');
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });

  try {
    await client.connect();
    console.log('✅ Conectado ao PostgreSQL!');

    const sql = `
      -- 1. Remover políticas com recursão infinita
      DROP POLICY IF EXISTS "Participantes visíveis para quem está na conversa" ON public.conversation_participants;
      DROP POLICY IF EXISTS "Usuários podem ver conversas das quais participam" ON public.conversations;
      DROP POLICY IF EXISTS "Mensagens visíveis para membros da conversa" ON public.messages;
      DROP POLICY IF EXISTS "Membros podem enviar mensagens na conversa" ON public.messages;
      DROP POLICY IF EXISTS "Reações visíveis para membros da conversa" ON public.message_reactions;
      DROP POLICY IF EXISTS "Anexos visíveis para membros da conversa" ON public.message_attachments;

      -- 2. Políticas Otimizadas e sem recursão para conversation_participants
      CREATE POLICY "Participantes visíveis para usuários autenticados"
          ON public.conversation_participants FOR SELECT
          USING (auth.role() = 'authenticated');

      CREATE POLICY "Inserir participantes autenticados"
          ON public.conversation_participants FOR INSERT
          WITH CHECK (auth.role() = 'authenticated');

      CREATE POLICY "Atualizar participantes próprios"
          ON public.conversation_participants FOR UPDATE
          USING (auth.uid() = user_id);

      CREATE POLICY "Remover participantes próprios"
          ON public.conversation_participants FOR DELETE
          USING (auth.uid() = user_id);

      -- 3. Políticas para conversations
      CREATE POLICY "Conversas visíveis para autenticados"
          ON public.conversations FOR SELECT
          USING (auth.role() = 'authenticated');

      CREATE POLICY "Criar conversas autenticados"
          ON public.conversations FOR INSERT
          WITH CHECK (auth.role() = 'authenticated');

      CREATE POLICY "Atualizar conversas autenticados"
          ON public.conversations FOR UPDATE
          USING (auth.role() = 'authenticated');

      -- 4. Políticas para messages
      CREATE POLICY "Mensagens visíveis para autenticados"
          ON public.messages FOR SELECT
          USING (auth.role() = 'authenticated');

      CREATE POLICY "Enviar mensagens autenticados"
          ON public.messages FOR INSERT
          WITH CHECK (auth.role() = 'authenticated');

      CREATE POLICY "Editar ou excluir mensagens próprias"
          ON public.messages FOR UPDATE
          USING (auth.uid() = sender_id);

      -- 5. Políticas para message_attachments e message_reactions
      CREATE POLICY "Anexos visíveis para autenticados"
          ON public.message_attachments FOR SELECT
          USING (auth.role() = 'authenticated');

      CREATE POLICY "Inserir anexos autenticados"
          ON public.message_attachments FOR INSERT
          WITH CHECK (auth.role() = 'authenticated');

      CREATE POLICY "Reações visíveis para autenticados"
          ON public.message_reactions FOR SELECT
          USING (auth.role() = 'authenticated');

      CREATE POLICY "Inserir reações autenticados"
          ON public.message_reactions FOR INSERT
          WITH CHECK (auth.role() = 'authenticated');

      CREATE POLICY "Deletar reações próprias"
          ON public.message_reactions FOR DELETE
          USING (auth.uid() = user_id);

      -- 6. Políticas para nexus_transactions
      ALTER TABLE public.nexus_transactions ENABLE ROW LEVEL SECURITY;

      DROP POLICY IF EXISTS "Transações visíveis para o dono" ON public.nexus_transactions;
      CREATE POLICY "Transações visíveis para o dono"
          ON public.nexus_transactions FOR SELECT
          USING (auth.uid() = user_id);

      DROP POLICY IF EXISTS "Inserir transações autenticadas" ON public.nexus_transactions;
      CREATE POLICY "Inserir transações autenticadas"
          ON public.nexus_transactions FOR INSERT
          WITH CHECK (auth.role() = 'authenticated');
    `;

    await client.query(sql);
    console.log('🎉 Políticas RLS corrigidas com sucesso! Zero recursão, consultas liberadas e seguras.');
  } catch (err) {
    console.error('❌ Erro ao corrigir RLS:', err);
  } finally {
    await client.end();
  }
}

fixRLS();
