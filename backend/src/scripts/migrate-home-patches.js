process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const { Client } = require('pg');

const connectionString = 'postgres://postgres.hlmqvbfdxiusxirtdmjn:0eGOkvYSF8ko9jCJ@aws-0-sa-east-1.pooler.supabase.com:5432/postgres?sslmode=no-verify';

const DEFAULT_SHOP_CATALOG = [
  // FRAMES
  { id: 'frame_cyber_neon', category: 'frames', name: 'Cyberpunk Neon', description: 'Borda animada ciano e magenta brilhante', price: 150, icon: '✨', css_class: 'border-2 border-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.8)] animate-pulse' },
  { id: 'frame_belmont_gold', category: 'frames', name: 'Ouro Real Belmont', description: 'Brasão real dourado com aura imperial', price: 300, icon: '👑', css_class: 'border-2 border-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.9)] ring-2 ring-amber-500/50' },
  { id: 'frame_inferno', category: 'frames', name: 'Fogo Infernal', description: 'Chamas ardentes em vermelho e laranja', price: 250, icon: '🔥', css_class: 'border-2 border-rose-500 shadow-[0_0_14px_rgba(244,63,94,0.9)] ring-1 ring-orange-500' },
  { id: 'frame_galaxy', category: 'frames', name: 'Galáxia Cosmos', description: 'Aura roxa estelar com poeira cósmica', price: 400, icon: '🌌', css_class: 'border-2 border-purple-400 shadow-[0_0_16px_rgba(192,132,252,0.9)] ring-2 ring-indigo-500' },
  
  // WALLPAPERS
  { id: 'wallpaper_cyber_grid', category: 'wallpapers', name: 'Cyber Grid Neon', description: 'Grade futurista com linhas ciano e azul escuro', price: 350, icon: '🌐', css_class: 'bg-[radial-gradient(#06b6d4_1px,transparent_1px)] [background-size:20px_20px] bg-slate-950' },
  { id: 'wallpaper_belmont_palace', category: 'wallpapers', name: 'Palácio Belmont Real', description: 'Aura nobre dourada com brasões translúcidos', price: 600, icon: '👑', css_class: 'bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-950/40 via-slate-950 to-black' },
  { id: 'wallpaper_dark_nebula', category: 'wallpapers', name: 'Nebulosa Cosmos', description: 'Poeira cósmica violeta e estrelas distantes', price: 450, icon: '✨', css_class: 'bg-[radial-gradient(ellipse_at_bottom,_var(--tw-gradient-stops))] from-purple-950/50 via-slate-950 to-black' },
  { id: 'wallpaper_synthwave', category: 'wallpapers', name: 'Synthwave Sunset', description: 'Gradiente retrô dos anos 80 em magenta e azul', price: 400, icon: '🌇', css_class: 'bg-gradient-to-b from-indigo-950/60 via-slate-950 to-rose-950/40' },
  { id: 'wallpaper_deep_obsidian', category: 'wallpapers', name: 'Obsidian Minimalista', description: 'Preto puro com textura geométrica sutil', price: 200, icon: '🖤', css_class: 'bg-slate-950 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:24px_24px]' },

  // BUBBLES
  { id: 'bubble_cyber_violet', category: 'bubbles', name: 'Violeta Cyberpunk', description: 'Gradiente elétrico de roxo para azul neon', price: 200, icon: '💬', css_class: 'bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 text-white shadow-lg shadow-purple-500/20' },
  { id: 'bubble_royal_gold', category: 'bubbles', name: 'Ouro Imperial', description: 'Dourado real metálico sofisticado', price: 350, icon: '🪙', css_class: 'bg-gradient-to-r from-amber-600 via-yellow-600 to-amber-700 text-amber-50 shadow-lg shadow-amber-500/25 border border-amber-400/40' },
  { id: 'bubble_matrix_emerald', category: 'bubbles', name: 'Matrix Esmeralda', description: 'Verde hacker brilhante de alta tecnologia', price: 180, icon: '🟢', css_class: 'bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-lg shadow-emerald-500/20 border border-emerald-400/30' },
  { id: 'bubble_rose_velvet', category: 'bubbles', name: 'Rosa Veludo', description: 'Rosa magenta vibrante e moderno', price: 220, icon: '🌸', css_class: 'bg-gradient-to-r from-pink-600 to-rose-600 text-white shadow-lg shadow-pink-500/20' },

  // BADGES
  { id: 'badge_belmont_vip', category: 'badges', name: 'VIP Belmont', description: 'Selo oficial de membro de honra da Belmont Conference', price: 500, icon: '👑', css_class: '' },
  { id: 'badge_early_adopter', category: 'badges', name: 'Early Adopter', description: 'Pioneiro das primeiras versões do Nexus Chat', price: 100, icon: '⚡', css_class: '' },
  { id: 'badge_diamond', category: 'badges', name: 'Membro Diamante', description: 'Distintivo de prestígio e raridade máxima', price: 800, icon: '💎', css_class: '' },
  { id: 'badge_chat_master', category: 'badges', name: 'Mestre do Chat', description: 'Selo para os comunicadores mais ativos', price: 250, icon: '🔥', css_class: '' },

  // NAME COLORS
  { id: 'name_rainbow_glow', category: 'name_colors', name: 'Arco-Íris Mágico', description: 'Nome com gradiente multicolorido', price: 300, icon: '🌈', css_class: 'bg-gradient-to-r from-red-400 via-amber-300 via-green-300 to-sky-400 bg-clip-text text-transparent font-extrabold' },
  { id: 'name_golden_glow', category: 'name_colors', name: 'Brilho Dourado', description: 'Texto dourado com sombra iluminada', price: 200, icon: '✨', css_class: 'text-amber-300 font-extrabold drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]' },
  { id: 'name_electric_cyan', category: 'name_colors', name: 'Ciano Elétrico', description: 'Azul ciano de alta energia', price: 180, icon: '⚡', css_class: 'text-cyan-400 font-extrabold drop-shadow-[0_0_8px_rgba(34,211,238,0.6)]' }
];

async function migrateHomeAndPatchNotes() {
  console.log('⏳ Conectando ao Supabase para migrar Patch Notes e registrar itens da Loja...');
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });

  try {
    await client.connect();
    console.log('✅ Conectado ao PostgreSQL!');

    const sql = `
      -- 1. Tabela de Patch Notes
      CREATE TABLE IF NOT EXISTS public.patch_notes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tag TEXT NOT NULL DEFAULT 'ATUALIZAÇÃO', -- 'PATCH' | 'ATUALIZAÇÃO' | 'NOVIDADE' | 'EVENTO' | 'CORREÇÃO'
        title TEXT NOT NULL,
        version TEXT DEFAULT 'v2.5.0',
        content TEXT NOT NULL,
        author_name TEXT DEFAULT 'Damon',
        is_pinned BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW())
      );

      ALTER TABLE public.patch_notes ENABLE ROW LEVEL SECURITY;

      DROP POLICY IF EXISTS "Todos podem ler patch notes" ON public.patch_notes;
      CREATE POLICY "Todos podem ler patch notes" ON public.patch_notes FOR SELECT USING (true);

      DROP POLICY IF EXISTS "Admin gerenciar patch notes" ON public.patch_notes;
      CREATE POLICY "Admin gerenciar patch notes" ON public.patch_notes FOR ALL USING (true) WITH CHECK (true);

      -- 2. Garantir registro de todos os itens do catálogo na tabela shop_items
      ${DEFAULT_SHOP_CATALOG.map(item => `
        INSERT INTO public.shop_items (id, category, name, description, price, icon, css_class, is_active)
        VALUES ('${item.id}', '${item.category}', '${item.name.replace(/'/g, "''")}', '${item.description.replace(/'/g, "''")}', ${item.price}, '${item.icon}', '${item.css_class}', true)
        ON CONFLICT (id) DO UPDATE
        SET name = EXCLUDED.name,
            description = EXCLUDED.description,
            price = EXCLUDED.price,
            icon = EXCLUDED.icon,
            css_class = EXCLUDED.css_class;
      `).join('\n')}

      -- 3. Inserir Patch Notes iniciais
      INSERT INTO public.patch_notes (tag, title, version, content, author_name, is_pinned)
      VALUES 
        ('NOVIDADE', 'Lançamento Oficial da Loja Nexus e Economia de Moedas', 'v2.5.0', 'Ganhe Nexus Coins a cada mensagem enviada e colete bônus diários. Desbloqueie molduras, auras, balões exclusivos e novos planos de fundo!', 'Damon', true),
        ('ATUALIZAÇÃO', 'Planos de Fundo de Conversa & Emojis Animados', 'v2.4.0', 'Personalize o visual do chat com novos temas (Cyber Grid, Palácio Belmont, Nebulosa) e envie figurinhas animadas em alta resolução.', 'Damon', false),
        ('PATCH', 'Edição, Exclusão Suave e Otimizações de Tempo Real', 'v2.3.0', 'Possibilidade de editar e excluir mensagens, melhorias no sistema de conexões e visualizador de fotos em tela cheia.', 'Damon', false)
      ON CONFLICT DO NOTHING;
    `;

    await client.query(sql);
    console.log('🎉 Patch notes criadas e todos os itens da loja registrados com sucesso!');
  } catch (err) {
    console.error('❌ Erro na migração:', err);
  } finally {
    await client.end();
  }
}

migrateHomeAndPatchNotes();
