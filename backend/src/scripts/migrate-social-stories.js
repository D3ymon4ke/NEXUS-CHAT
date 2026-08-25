process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const { Client } = require('pg');

const connectionString = 'postgres://postgres.hlmqvbfdxiusxirtdmjn:0eGOkvYSF8ko9jCJ@aws-0-sa-east-1.pooler.supabase.com:5432/postgres?sslmode=no-verify';

async function migrateSocialStories() {
  console.log('⏳ Conectando ao Supabase para migrar Stories, Reações e Amizades...');
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });

  try {
    await client.connect();
    console.log('✅ Conectado ao PostgreSQL!');

    const sql = `
      -- 1. Tabela de Amizades (Friendships)
      CREATE TABLE IF NOT EXISTS public.friendships (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
        friend_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
        status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'accepted' | 'declined'
        created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()),
        updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()),
        UNIQUE(user_id, friend_id)
      );

      -- 2. Tabela de Stories (Nexus Stories)
      CREATE TABLE IF NOT EXISTS public.nexus_stories (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
        media_url TEXT NOT NULL,
        media_type TEXT NOT NULL DEFAULT 'image', -- 'image' | 'video'
        caption TEXT,
        privacy TEXT NOT NULL DEFAULT 'global', -- 'global' | 'friends' | 'custom'
        allowed_users UUID[] DEFAULT '{}',
        expires_at TIMESTAMPTZ DEFAULT (TIMEZONE('utc'::text, NOW()) + INTERVAL '24 hours'),
        created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW())
      );

      -- 3. Tabela de Reações nos Stories
      CREATE TABLE IF NOT EXISTS public.story_reactions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        story_id UUID REFERENCES public.nexus_stories(id) ON DELETE CASCADE,
        user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
        reaction_type TEXT NOT NULL, -- 'like' | 'clap' | 'fire' | 'heart' | 'laugh'
        created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()),
        UNIQUE(story_id, user_id, reaction_type)
      );

      -- 4. Tabela de Visualizações de Stories
      CREATE TABLE IF NOT EXISTS public.story_views (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        story_id UUID REFERENCES public.nexus_stories(id) ON DELETE CASCADE,
        viewer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
        viewed_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()),
        UNIQUE(story_id, viewer_id)
      );

      -- 5. RLS Policies
      ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
      ALTER TABLE public.nexus_stories ENABLE ROW LEVEL SECURITY;
      ALTER TABLE public.story_reactions ENABLE ROW LEVEL SECURITY;
      ALTER TABLE public.story_views ENABLE ROW LEVEL SECURITY;

      DROP POLICY IF EXISTS "Amizades visíveis para autenticados" ON public.friendships;
      CREATE POLICY "Amizades visíveis para autenticados" ON public.friendships FOR SELECT USING (auth.role() = 'authenticated');

      DROP POLICY IF EXISTS "Inserir amizades autenticado" ON public.friendships;
      CREATE POLICY "Inserir amizades autenticado" ON public.friendships FOR INSERT WITH CHECK (auth.role() = 'authenticated');

      DROP POLICY IF EXISTS "Atualizar amizades autenticado" ON public.friendships;
      CREATE POLICY "Atualizar amizades autenticado" ON public.friendships FOR UPDATE USING (auth.role() = 'authenticated');

      DROP POLICY IF EXISTS "Deletar amizades autenticado" ON public.friendships;
      CREATE POLICY "Deletar amizades autenticado" ON public.friendships FOR DELETE USING (auth.role() = 'authenticated');

      DROP POLICY IF EXISTS "Stories visíveis para autenticados" ON public.nexus_stories;
      CREATE POLICY "Stories visíveis para autenticados" ON public.nexus_stories FOR SELECT USING (auth.role() = 'authenticated');

      DROP POLICY IF EXISTS "Inserir stories próprio" ON public.nexus_stories;
      CREATE POLICY "Inserir stories próprio" ON public.nexus_stories FOR INSERT WITH CHECK (auth.role() = 'authenticated');

      DROP POLICY IF EXISTS "Deletar stories próprio" ON public.nexus_stories;
      CREATE POLICY "Deletar stories próprio" ON public.nexus_stories FOR DELETE USING (auth.uid() = user_id);

      DROP POLICY IF EXISTS "Reações nos stories para autenticados" ON public.story_reactions;
      CREATE POLICY "Reações nos stories para autenticados" ON public.story_reactions FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

      DROP POLICY IF EXISTS "Visualizações nos stories para autenticados" ON public.story_views;
      CREATE POLICY "Visualizações nos stories para autenticados" ON public.story_views FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
    `;

    await client.query(sql);
    console.log('🎉 Migração de Stories, Amizades e Reações concluída com sucesso!');
  } catch (err) {
    console.error('❌ Erro na migração:', err);
  } finally {
    await client.end();
  }
}

migrateSocialStories();
