process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const { Client } = require('pg');

const connectionString = 'postgres://postgres.hlmqvbfdxiusxirtdmjn:0eGOkvYSF8ko9jCJ@aws-0-sa-east-1.pooler.supabase.com:5432/postgres?sslmode=no-verify';

async function postShopPatchNote() {
  console.log('⏳ Conectando ao banco para postar as Novidades das Novas Molduras...');
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });

  try {
    await client.connect();

    // Despinar notas anteriores para dar destaque total à nova
    await client.query(`UPDATE public.patch_notes SET is_pinned = false;`);

    const title = '✨ Grandes Novidades na Loja: Coleções Temáticas de Molduras & Banners!';
    const tag = 'NOVIDADE';
    const version = 'v3.3.0';
    const author_name = 'Damon';
    const is_pinned = true;

    const content = `### 🎨 3 Novas Coleções Oficiais de Molduras Animadas!

A Loja Nexus acaba de receber uma grande atualização de conteúdo com 9 novas molduras animadas de alta definição e banners temáticos panorâmicos:

- 👁️ **Coleção Night Terrors**: *Mandíbula do Pesadelo*, *Olho do Abismo* e *Espectro dos Pesadelos* (a lendária moldura Espectro agora integra oficialmente este tema sombrio).
- 🦋 **Coleção Dark Folklore**: *Chifres Demoníacos*, *Damas da Noite* e *Mariposa Fantasma*, inspiradas em lendas místicas ancestrais.
- 🌸 **Coleção Fall Floragers**: *Coelho da Primavera*, *Florescer Místico* e *Primavera Silvestre*, espíritos guardiões repletos de vida.

⚡ **Novidades no Sistema da Loja:**
- 🎭 **Filtros por Coleção**: Visualize os banners oficiais de cada tema e explore seus itens exclusivos.
- 🛍️ **Rotação Dinâmica Integrada**: As novas molduras participam da vitrine viva a cada 72h com variações de mercado, Ofertas Relâmpago e Tema da Rodada.
- ✨ **Provador Virtual**: Teste qualquer moldura sobre o seu avatar em tempo real antes de desbloquear!`;

    const res = await client.query(
      `INSERT INTO public.patch_notes (tag, title, version, content, author_name, is_pinned)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id;`,
      [tag, title, version, content, author_name, is_pinned]
    );

    console.log('🎉 Patch Note v3.3.0 publicada com sucesso! ID:', res.rows[0]?.id);
  } catch (err) {
    console.error('❌ Erro ao postar patch note:', err);
  } finally {
    await client.end();
  }
}

postShopPatchNote();
