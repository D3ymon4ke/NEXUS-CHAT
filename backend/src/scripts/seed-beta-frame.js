process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const { Client } = require('pg');

const connectionString = 'postgres://postgres.hlmqvbfdxiusxirtdmjn:0eGOkvYSF8ko9jCJ@aws-0-sa-east-1.pooler.supabase.com:5432/postgres?sslmode=no-verify';

async function seedBetaFrame() {
  console.log('⏳ Registrando a Moldura Beta Tester na tabela shop_items...');
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });

  try {
    await client.connect();

    const sql = `
      INSERT INTO public.shop_items (id, category, name, description, price, icon, image_url, is_active)
      VALUES (
        'frame_beta',
        'frames',
        'Moldura BETA TESTER',
        'Moldura holográfica animada exclusiva para testadores beta oficiais',
        0,
        '🧪',
        '/frames/beta.gif',
        true
      )
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        image_url = EXCLUDED.image_url,
        icon = EXCLUDED.icon;
    `;

    await client.query(sql);
    console.log('🎉 Moldura BETA TESTER cadastrada com sucesso no banco de dados!');
  } catch (err) {
    console.error('❌ Erro:', err.message);
  } finally {
    await client.end();
  }
}

seedBetaFrame();
