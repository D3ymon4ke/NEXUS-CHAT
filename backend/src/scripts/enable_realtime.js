process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const { Client } = require('pg');

const connectionString = 'postgres://postgres.hlmqvbfdxiusxirtdmjn:0eGOkvYSF8ko9jCJ@aws-0-sa-east-1.pooler.supabase.com:5432/postgres?sslmode=no-verify';

async function checkRealtimePublication() {
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  try {
    await client.connect();
    console.log('✅ Conectado ao PostgreSQL!');

    // 1. Checar tabelas na publicação supabase_realtime
    const res = await client.query(`
      SELECT schemaname, tablename 
      FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime';
    `);
    console.log('Tabelas na publicação supabase_realtime:', res.rows);

    // 2. Adicionar as tabelas necessárias à publicação supabase_realtime
    const enableSql = `
      -- Criar publicação se não existir
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
          CREATE PUBLICATION supabase_realtime;
        END IF;
      END
      $$;

      -- Adicionar tabelas à publicação supabase_realtime
      ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
      ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
      ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_participants;
      ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
      ALTER PUBLICATION supabase_realtime ADD TABLE public.friendships;
      ALTER PUBLICATION supabase_realtime ADD TABLE public.message_reactions;

      -- Configurar REPLICA IDENTITY FULL para garantir que payloads contenham todos os dados
      ALTER TABLE public.messages REPLICA IDENTITY FULL;
      ALTER TABLE public.conversations REPLICA IDENTITY FULL;
      ALTER TABLE public.conversation_participants REPLICA IDENTITY FULL;
      ALTER TABLE public.profiles REPLICA IDENTITY FULL;
      ALTER TABLE public.friendships REPLICA IDENTITY FULL;
      ALTER TABLE public.message_reactions REPLICA IDENTITY FULL;
    `;

    await client.query(enableSql);
    console.log('🎉 Publicação supabase_realtime configurada com sucesso para todas as tabelas!');

    // 3. Checar novamente
    const checkAfter = await client.query(`
      SELECT schemaname, tablename 
      FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime';
    `);
    console.log('Tabelas ativas no Realtime:', checkAfter.rows);

  } catch (err) {
    console.error('❌ Erro:', err.message);
  } finally {
    await client.end();
  }
}

checkRealtimePublication();
