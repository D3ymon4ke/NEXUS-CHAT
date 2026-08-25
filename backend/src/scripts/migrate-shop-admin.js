process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const { Client } = require('pg');

const connectionString = 'postgres://postgres.hlmqvbfdxiusxirtdmjn:0eGOkvYSF8ko9jCJ@aws-0-sa-east-1.pooler.supabase.com:5432/postgres?sslmode=no-verify';

async function migrateShopAdmin() {
  console.log('⏳ Conectando ao Supabase para migração da Loja Dinâmica e Wallpapers...');
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });

  try {
    await client.connect();
    console.log('✅ Conectado ao PostgreSQL!');

    const sql = `
      -- 1. Coluna de plano de fundo em perfis
      ALTER TABLE public.profiles 
      ADD COLUMN IF NOT EXISTS equipped_wallpaper TEXT DEFAULT 'default';

      -- 2. Tabela de itens dinâmicos da Loja (para o Admin gerenciar e cadastrar)
      CREATE TABLE IF NOT EXISTS public.shop_items (
        id TEXT PRIMARY KEY,
        category TEXT NOT NULL, -- 'frames' | 'bubbles' | 'badges' | 'name_colors' | 'wallpapers'
        name TEXT NOT NULL,
        description TEXT,
        price INTEGER NOT NULL DEFAULT 100,
        icon TEXT DEFAULT '✨',
        css_class TEXT,
        image_url TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW())
      );

      -- 3. RLS para shop_items
      ALTER TABLE public.shop_items ENABLE ROW LEVEL SECURITY;

      DROP POLICY IF EXISTS "Leitura de itens da loja para autenticados" ON public.shop_items;
      CREATE POLICY "Leitura de itens da loja para autenticados"
        ON public.shop_items FOR SELECT
        USING (true);

      DROP POLICY IF EXISTS "Admin gerenciar itens da loja" ON public.shop_items;
      CREATE POLICY "Admin gerenciar itens da loja"
        ON public.shop_items FOR ALL
        USING (true)
        WITH CHECK (true);
    `;

    await client.query(sql);
    console.log('🎉 Migração concluída com sucesso!');
  } catch (err) {
    console.error('❌ Erro na migração:', err);
  } finally {
    await client.end();
  }
}

migrateShopAdmin();
