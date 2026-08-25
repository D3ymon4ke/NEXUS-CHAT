process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const connectionString = 'postgres://postgres.hlmqvbfdxiusxirtdmjn:0eGOkvYSF8ko9jCJ@aws-0-sa-east-1.pooler.supabase.com:5432/postgres?sslmode=no-verify';

async function runSeed() {
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  try {
    await client.connect();
    const seedPath = path.join(__dirname, '../../../supabase/seed.sql');
    const sql = fs.readFileSync(seedPath, 'utf8');
    await client.query(sql);
    console.log('✅ Bucket chat-media e políticas de storage configuradas no Supabase!');
  } catch (err) {
    console.log('ℹ️ Nota sobre storage bucket:', err.message);
  } finally {
    await client.end();
  }
}

runSeed();
