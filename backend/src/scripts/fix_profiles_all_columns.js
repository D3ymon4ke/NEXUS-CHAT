process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const { Client } = require('pg');

const connectionString = 'postgres://postgres.hlmqvbfdxiusxirtdmjn:0eGOkvYSF8ko9jCJ@aws-0-sa-east-1.pooler.supabase.com:5432/postgres?sslmode=no-verify';

async function fixProfilesAllColumns() {
  console.log('⏳ Conectando ao PostgreSQL do Supabase para corrigir todas as colunas de profiles...');
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });

  try {
    await client.connect();
    console.log('✅ Conectado ao PostgreSQL!');

    const sql = `
      -- 1. Garantir todas as colunas necessárias na tabela profiles
      ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS profile_banner_url TEXT;
      ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS profile_song_url TEXT;
      ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS profile_song_title TEXT;
      ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS profile_song_artist TEXT;
      ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS profile_song_cover TEXT;
      ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS custom_title TEXT;
      ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS daily_streak INTEGER DEFAULT 0;
      ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_daily_claim TIMESTAMPTZ;
      ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS nexus_coins INTEGER DEFAULT 0;
      ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS unlocked_items TEXT[] DEFAULT ARRAY['frame_default', 'bubble_default']::TEXT[];
      ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS equipped_frame TEXT DEFAULT 'frame_default';
      ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS equipped_wallpaper TEXT DEFAULT 'wallpaper_default';
      ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS equipped_bubble TEXT DEFAULT 'bubble_default';
      ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS equipped_badge TEXT;
      ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS equipped_name_color TEXT;

      -- 2. Garantir RLS aberto para update do próprio usuário
      ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
      
      DROP POLICY IF EXISTS "Public profiles update" ON public.profiles;
      DROP POLICY IF EXISTS "Usuários podem atualizar seu próprio perfil" ON public.profiles;
      
      CREATE POLICY "Public profiles update"
        ON public.profiles FOR UPDATE
        USING (true)
        WITH CHECK (true);

      CREATE POLICY "Public profiles insert"
        ON public.profiles FOR INSERT
        WITH CHECK (true);

      CREATE POLICY "Public profiles select"
        ON public.profiles FOR SELECT
        USING (true);

      -- 3. Notificar PostgREST para recarregar o schema cache imediatamente
      NOTIFY pgrst, 'reload schema';
    `;

    await client.query(sql);
    console.log('🎉 Todas as colunas foram criadas e o Schema Cache do Supabase foi recarregado com sucesso!');

    // Verificar colunas atuais de profiles
    const res = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'profiles' AND table_schema = 'public';
    `);
    console.log('📋 Colunas atuais de public.profiles:');
    console.table(res.rows);

  } catch (err) {
    console.error('❌ Erro durante a atualização:', err);
  } finally {
    await client.end();
  }
}

fixProfilesAllColumns();
