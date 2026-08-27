const { supabase } = require('../config/supabase');

const avatars = {
  katherine: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
  sara: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&auto=format&fit=crop&q=80',
  zoe: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&auto=format&fit=crop&q=80',
  pricila: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400&auto=format&fit=crop&q=80',
  hana: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=400&auto=format&fit=crop&q=80',
  vitoria: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&auto=format&fit=crop&q=80',
  lavignia: 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=400&auto=format&fit=crop&q=80'
};

async function updateAvatars() {
  console.log('🔄 Atualizando fotos de perfil de todas as contas...');
  
  for (const [username, avatarUrl] of Object.entries(avatars)) {
    const { data: profile, error } = await supabase
      .from('profiles')
      .update({ avatar_url: avatarUrl })
      .eq('username', username)
      .select()
      .single();

    if (error) {
      console.error(`❌ Erro ao atualizar ${username}:`, error.message);
    } else {
      console.log(`✅ Foto de perfil de ${profile.display_name} (@${username}) atualizada com sucesso!`);
      
      // Atualizar também nos metadados do auth
      await supabase.auth.admin.updateUserById(profile.id, {
        user_metadata: {
          avatar_url: avatarUrl,
          username: profile.username,
          display_name: profile.display_name
        }
      });
    }
  }

  console.log('🎉 Todas as fotos de perfil foram atualizadas!');
}

updateAvatars();
