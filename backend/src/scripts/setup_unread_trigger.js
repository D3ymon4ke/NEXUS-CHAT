process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const { Client } = require('pg');

const connectionString = 'postgres://postgres.hlmqvbfdxiusxirtdmjn:0eGOkvYSF8ko9jCJ@aws-0-sa-east-1.pooler.supabase.com:5432/postgres?sslmode=no-verify';

async function setupUnreadTrigger() {
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  try {
    await client.connect();
    console.log('✅ Conectado ao PostgreSQL!');

    const sql = `
      -- 1. Garantir que coluna unread_count exista e seja integer
      ALTER TABLE public.conversation_participants
      ADD COLUMN IF NOT EXISTS unread_count INTEGER DEFAULT 0;

      -- 2. Trigger para incrementar unread_count automaticamente em novas mensagens
      CREATE OR REPLACE FUNCTION public.handle_new_message_unread()
      RETURNS TRIGGER AS $$
      BEGIN
          -- Não incrementar para Belmont Conference se não quiser poluir contagem global ou incrementar se desejado
          IF NEW.conversation_id != '00000000-0000-0000-0000-000000000001' THEN
              UPDATE public.conversation_participants
              SET unread_count = COALESCE(unread_count, 0) + 1
              WHERE conversation_id = NEW.conversation_id
                AND user_id != NEW.sender_id;
          END IF;
          
          RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      DROP TRIGGER IF EXISTS trigger_handle_new_message_unread ON public.messages;
      CREATE TRIGGER trigger_handle_new_message_unread
          AFTER INSERT ON public.messages
          FOR EACH ROW
          EXECUTE FUNCTION public.handle_new_message_unread();

      -- 3. Calcular e atualizar unread_count para mensagens existentes não lidas
      -- Se houver mensagens onde o participante não é o sender, marcar como 1 se unread_count for 0
      UPDATE public.conversation_participants cp
      SET unread_count = (
          SELECT COUNT(*)
          FROM public.messages m
          WHERE m.conversation_id = cp.conversation_id
            AND m.sender_id != cp.user_id
            AND m.created_at >= (NOW() - INTERVAL '2 days')
      )
      WHERE cp.conversation_id != '00000000-0000-0000-0000-000000000001';
    `;

    await client.query(sql);
    console.log('🎉 Trigger de unread_count criada e calculada com sucesso no PostgreSQL!');

    const testCounts = await client.query(`
      SELECT conversation_id, user_id, unread_count 
      FROM public.conversation_participants 
      WHERE unread_count > 0;
    `);
    console.log('Participantes com mensagens não lidas:', testCounts.rows);

  } catch (err) {
    console.error('❌ Erro:', err.message);
  } finally {
    await client.end();
  }
}

setupUnreadTrigger();
