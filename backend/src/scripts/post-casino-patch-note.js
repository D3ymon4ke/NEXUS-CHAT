process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const { Client } = require('pg');

const connectionString = 'postgres://postgres.hlmqvbfdxiusxirtdmjn:0eGOkvYSF8ko9jCJ@aws-0-sa-east-1.pooler.supabase.com:5432/postgres?sslmode=no-verify';

async function postCasinoPatchNote() {
  console.log('⏳ Conectando ao banco para postar as Novidades do Cassino Nexus...');
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });

  try {
    await client.connect();

    // Despinar notas anteriores para dar destaque total à nova
    await client.query(`UPDATE public.patch_notes SET is_pinned = false;`);

    const title = '🎰 Grande Inauguração: Cassino Nexus, Mines, Roleta e Double!';
    const tag = 'NOVIDADE';
    const version = 'v3.2.0';
    const author_name = 'Damon';
    const is_pinned = true;

    const content = `### 🎲 O Cassino Oficial Nexus Chegou!

Aproveite suas **Nexus Coins** em uma experiência de minigames solo completa, com visual dark-neon premium e foco total em dispositivos móveis:

- 💎 **Mines (Campo Minado)**: Escolha a quantidade de minas (1 a 10), avance no campo revelando diamantes com multiplicador progressivo e decida o momento exato de **Sacar (Cash Out)** para garantir seus lucros!
- 🎡 **Roleta da Fortuna (Lucky Wheel)**: Roda animada com física realista de desaceleração, ponteiro sonoro e fatias de até **10.000 moedas com o lendário Jackpot de 10x**!
- 🎯 **Double (Roleta de Cores)**: Fita horizontal de 15 slots inspirada no CS:GO/Blaze. Aposte no Vermelho (2x), Preto (2x) ou arrisque no exclusivo **Dourado Nexus (14x)**.
- 🛡️ **Matemática Justa & Proteção Econômica**: Todos os sorteios rodam no servidor com taxa de retorno justa (~96% RTP). Limites de aposta de 5 a 500 moedas e extrato completo de apostas e ganhos registrado na sua Carteira!
- ⚡ **Melhorias de Estabilidade no Chat**: Lista de conversas ultra veloz, limpeza de mensagens via VPS dedicada e trava de modo somente administrador na Belmont Conference.`;

    const res = await client.query(
      `INSERT INTO public.patch_notes (tag, title, version, content, author_name, is_pinned)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id;`,
      [tag, title, version, content, author_name, is_pinned]
    );

    console.log('🎉 Patch Note publicada com sucesso! ID:', res.rows[0]?.id);
  } catch (err) {
    console.error('❌ Erro ao postar patch note:', err);
  } finally {
    await client.end();
  }
}

postCasinoPatchNote();
