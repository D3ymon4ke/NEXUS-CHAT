const { supabase } = require('../config/supabase');

const accountsToCreate = [
  {
    name: 'Katherine',
    username: 'katherine',
    email: 'belmontnexus@nexus.com',
    password: '08059900p'
  },
  {
    name: 'Sara',
    username: 'sara',
    email: 'sara@nexus.com',
    password: '08059900p'
  },
  {
    name: 'Zoe',
    username: 'zoe',
    email: 'zoe@nexus.com',
    password: '08059900p'
  },
  {
    name: 'Pricila',
    username: 'pricila',
    email: 'pricila@nexus.com',
    password: '08059900p'
  },
  {
    name: 'Hana',
    username: 'hana',
    email: 'hana@nexus.com',
    password: '08059900p'
  },
  {
    name: 'Vitoria',
    username: 'vitoria',
    email: 'vitoria@nexus.com',
    password: '08059900p'
  },
  {
    name: 'Lavignia',
    username: 'lavignia',
    email: 'lavignia@nexus.com',
    password: '08059900p'
  }
];

async function createAccounts() {
  console.log('🚀 Iniciando criação das contas no Supabase Auth...');

  // 1. Obter usuários existentes
  const { data: { users }, error: listErr } = await supabase.auth.admin.listUsers();
  if (listErr) {
    console.error('❌ Erro ao listar usuários:', listErr);
    return;
  }

  const existingByEmail = new Map(users.map(u => [u.email.toLowerCase(), u]));

  for (const acc of accountsToCreate) {
    const avatarUrl = `https://api.dicebear.com/7.x/adventurer/svg?seed=${acc.username}`;
    let userId = null;

    const existingUser = existingByEmail.get(acc.email.toLowerCase());

    if (existingUser) {
      console.log(`ℹ️ Usuário ${acc.email} já existe (${existingUser.id}). Atualizando senha e metadados...`);
      userId = existingUser.id;
      const { data, error } = await supabase.auth.admin.updateUserById(userId, {
        password: acc.password,
        email_confirm: true,
        user_metadata: {
          username: acc.username,
          display_name: acc.name,
          avatar_url: avatarUrl
        }
      });
      if (error) {
        console.error(`❌ Erro ao atualizar auth de ${acc.name}:`, error.message);
      } else {
        console.log(`✅ Auth de ${acc.name} atualizado com sucesso.`);
      }
    } else {
      console.log(`✨ Criando novo usuário: ${acc.name} (${acc.email})...`);
      const { data, error } = await supabase.auth.admin.createUser({
        email: acc.email,
        password: acc.password,
        email_confirm: true,
        user_metadata: {
          username: acc.username,
          display_name: acc.name,
          avatar_url: avatarUrl
        }
      });

      if (error) {
        console.error(`❌ Erro ao criar auth para ${acc.name}:`, error.message);
        continue;
      }
      userId = data.user.id;
      console.log(`✅ Usuário ${acc.name} criado com sucesso (ID: ${userId}).`);
    }

    // 2. Garantir perfil no banco
    if (userId) {
      const { error: profErr } = await supabase
        .from('profiles')
        .upsert({
          id: userId,
          username: acc.username,
          display_name: acc.name,
          avatar_url: avatarUrl,
          bio: `Olá! Eu sou ${acc.name} no Belmont Nexus Chat.`,
          status_message: 'online',
          is_online: false
        }, { onConflict: 'id' });

      if (profErr) {
        console.error(`⚠️ Erro ao atualizar perfil de ${acc.name}:`, profErr.message);
      } else {
        console.log(`✅ Perfil de ${acc.name} sincronizado na tabela 'profiles'.`);
      }

      // Garantir entrada na sala principal (Belmont Conference)
      const belmontId = '00000000-0000-0000-0000-000000000001';
      await supabase
        .from('conversation_participants')
        .upsert({
          conversation_id: belmontId,
          user_id: userId,
          role: 'member'
        }, { onConflict: 'conversation_id,user_id' });
    }
  }

  console.log('\n🎉 Processo de criação de contas concluído com sucesso!');
}

createAccounts();
