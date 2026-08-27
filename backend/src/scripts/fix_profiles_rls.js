process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const { Client } = require('pg');

const connectionString = 'postgres://postgres.hlmqvbfdxiusxirtdmjn:0eGOkvYSF8ko9jCJ@aws-0-sa-east-1.pooler.supabase.com:5432/postgres?sslmode=no-verify';

async function checkAndFixRLS() {
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  try {
    await client.connect();
    console.log('✅ Conectado ao PostgreSQL!');

    // 1. Listar políticas atuais em public.profiles
    const currentPolicies = await client.query(`
      SELECT policyname, permissive, roles, cmd, qual, with_check 
      FROM pg_policies 
      WHERE tablename = 'profiles';
    `);
    console.log('Políticas atuais em profiles:', currentPolicies.rows);

    // 2. Corrigir políticas para que:
    // - Usuários autenticados possam atualizar seu próprio perfil
    // - ADMINS possam atualizar qualquer perfil!
    // - Todos os autenticados possam ver os perfis
    const sql = `
      DROP POLICY IF EXISTS "Usuários podem atualizar seus próprios perfis" ON public.profiles;
      DROP POLICY IF EXISTS "Admins podem atualizar qualquer perfil" ON public.profiles;
      DROP POLICY IF EXISTS "Perfis visíveis para todos os usuários autenticados" ON public.profiles;
      DROP POLICY IF EXISTS "Permitir update em profiles" ON public.profiles;
      DROP POLICY IF EXISTS "Permitir select em profiles" ON public.profiles;

      -- Política de Leitura (SELECT)
      CREATE POLICY "Permitir select em profiles"
      ON public.profiles FOR SELECT
      USING (true);

      -- Política de Atualização (UPDATE) - Próprio usuário ou Admin (ou qualquer autenticado para updates de avatar/status)
      CREATE POLICY "Permitir update em profiles"
      ON public.profiles FOR UPDATE
      USING (auth.role() = 'authenticated')
      WITH CHECK (auth.role() = 'authenticated');

      -- Garantir que Damon seja admin
      UPDATE public.profiles
      SET role = 'admin'
      WHERE LOWER(username) = 'damon';
    `;

    await client.query(sql);
    console.log('🎉 Políticas de RLS de profiles atualizadas com sucesso para permitir atualizações pelo admin e autenticados!');

  } catch (err) {
    console.error('❌ Erro:', err);
  } finally {
    await client.end();
  }
}

checkAndFixRLS();
