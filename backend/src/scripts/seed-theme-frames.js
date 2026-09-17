process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const { Client } = require('pg');

const connectionString = 'postgres://postgres.hlmqvbfdxiusxirtdmjn:0eGOkvYSF8ko9jCJ@aws-0-sa-east-1.pooler.supabase.com:5432/postgres?sslmode=no-verify';

const THEME_FRAMES = [
  // --- COLEÇÃO NIGHT TERRORS ---
  {
    id: 'frame_dentes',
    category: 'frames',
    name: 'Mandíbula do Pesadelo',
    description: 'Presas aterradoras que cercam seu avatar com uma mordida sombria',
    price: 420,
    icon: '🦷',
    image_url: '/frames/night_terrors/dentes.gif'
  },
  {
    id: 'frame_espectro',
    category: 'frames',
    name: 'Espectro dos Pesadelos',
    description: 'Entidade espectral que emerge dos terrores noturnos com distorção dimensional',
    price: 350,
    icon: '👁️‍🗨️',
    image_url: '/frames/night_terrors/espectro.gif'
  },
  {
    id: 'frame_olho_abismo',
    category: 'frames',
    name: 'Olho do Abismo',
    description: 'Olhares cósmicos hipnóticos que fitam a escuridão absoluta do vácuo',
    price: 450,
    icon: '👁️',
    image_url: '/frames/night_terrors/olho_abismo.gif'
  },

  // --- COLEÇÃO DARK FOLKLORE ---
  {
    id: 'frame_chifres_demoniacos',
    category: 'frames',
    name: 'Chifres Demoníacos',
    description: 'Chifres ancestrais corrompidos emitindo fumaça e poder místico',
    price: 390,
    icon: '😈',
    image_url: '/frames/dark_folklore/chifres_demoniacos.gif'
  },
  {
    id: 'frame_damas_da_noite',
    category: 'frames',
    name: 'Damas da Noite',
    description: 'Flores noturnas encantadas com pétalas sombrias e névoa envenenada',
    price: 410,
    icon: '🥀',
    image_url: '/frames/dark_folklore/damas_da_noite.gif'
  },
  {
    id: 'frame_mariposa_fantasma',
    category: 'frames',
    name: 'Mariposa Fantasma',
    description: 'Mariposas bioluminescentes que dançam ao redor do avatar guiando espíritos',
    price: 440,
    icon: '🦋',
    image_url: '/frames/dark_folklore/mariposa_fantasma.gif'
  },

  // --- COLEÇÃO FALL FLORAGERS ---
  {
    id: 'frame_coelho_primavera',
    category: 'frames',
    name: 'Coelho da Primavera',
    description: 'Espírito sagrado dos bosques com orelhas mágicas e folhas vivas',
    price: 360,
    icon: '🐰',
    image_url: '/frames/fall_floragers/coelho_primavera.gif'
  },
  {
    id: 'frame_florescer',
    category: 'frames',
    name: 'Florescer Místico',
    description: 'Encanto primaveril com botões de flores e pólen místico cintilante',
    price: 390,
    icon: '🌸',
    image_url: '/frames/fall_floragers/florescer.gif'
  },
  {
    id: 'frame_primavera',
    category: 'frames',
    name: 'Primavera Silvestre',
    description: 'Aura suave da floresta com folhagens vivas e pétalas douradas fluindo',
    price: 370,
    icon: '🍃',
    image_url: '/frames/fall_floragers/primavera.gif'
  },

  // --- MOLDURAS ANIMADAS CLÁSSICAS ---
  {
    id: 'frame_beta',
    category: 'frames',
    name: 'Moldura BETA TESTER',
    description: 'Moldura holográfica animada exclusiva para testadores beta oficiais',
    price: 0,
    icon: '🧪',
    image_url: '/frames/beta.gif'
  },
  {
    id: 'frame_espirito',
    category: 'frames',
    name: 'Espírito Espectral',
    description: 'Moldura mística animada com aura de espíritos e almas',
    price: 350,
    icon: '👻',
    image_url: '/frames/Espirito.gif'
  },
  {
    id: 'frame_rosas',
    category: 'frames',
    name: 'Rosas Carmesim',
    description: 'Moldura animada de rosas góticas flutuantes',
    price: 300,
    icon: '🌹',
    image_url: '/frames/Rosas.gif'
  },
  {
    id: 'frame_fogo',
    category: 'frames',
    name: 'Chamas Infernais',
    description: 'Moldura animada de fogo ardente em alta definição',
    price: 280,
    icon: '🔥',
    image_url: '/frames/fogo.gif'
  }
];

async function seedThemeFrames() {
  console.log('⏳ Conectando ao banco para registrar as molduras temáticas na tabela shop_items...');
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });

  try {
    await client.connect();
    console.log('✅ Conectado ao PostgreSQL!');

    for (const item of THEME_FRAMES) {
      const sql = `
        INSERT INTO public.shop_items (id, category, name, description, price, icon, image_url, is_active)
        VALUES ($1, $2, $3, $4, $5, $6, $7, true)
        ON CONFLICT (id) DO UPDATE
        SET name = EXCLUDED.name,
            description = EXCLUDED.description,
            price = EXCLUDED.price,
            icon = EXCLUDED.icon,
            image_url = EXCLUDED.image_url,
            is_active = true;
      `;
      await client.query(sql, [
        item.id,
        item.category,
        item.name,
        item.description,
        item.price,
        item.icon,
        item.image_url
      ]);
      console.log(`✓ Moldura cadastrada/atualizada: ${item.name} (${item.id})`);
    }

    console.log('🎉 Todas as molduras temáticas foram registradas com sucesso no banco!');
  } catch (err) {
    console.error('❌ Erro ao registrar molduras:', err);
  } finally {
    await client.end();
  }
}

seedThemeFrames();
