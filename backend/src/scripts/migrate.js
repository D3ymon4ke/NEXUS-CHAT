process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const connectionString = 'postgres://postgres.hlmqvbfdxiusxirtdmjn:0eGOkvYSF8ko9jCJ@aws-0-sa-east-1.pooler.supabase.com:5432/postgres?sslmode=no-verify';

async function runMigration() {
  console.log('⏳ Conectando diretamente ao PostgreSQL do Supabase...');

  const client = new Client({
    connectionString,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();
    console.log('✅ Conexão estabelecida com o Supabase com sucesso!');

    const schemaPath = path.join(__dirname, '../../../supabase/schema.sql');
    const sql = fs.readFileSync(schemaPath, 'utf8');

    console.log('⏳ Executando criação de tabelas, índices, triggers e Belmont Conference...');
    await client.query(sql);

    console.log('🎉 Migração concluída com SUCESSO absoluto!');
    console.log('✅ Tabelas criadas: profiles, conversations, conversation_participants, messages, message_attachments, message_reactions, message_status, user_settings.');
    console.log('✅ Sala permanente criada: BELMONT CONFERENCE.');
  } catch (err) {
    console.error('❌ Erro durante a migração:', err);
  } finally {
    await client.end();
  }
}

runMigration();
