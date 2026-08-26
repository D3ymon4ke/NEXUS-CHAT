const { supabase, isConfigured } = require('../config/supabase');

/**
 * Busca usuários por nome ou username para iniciar novas conversas
 */
async function searchUsers(req, res) {
  try {
    const currentUserId = req.user.id;
    const { q } = req.query;

    if (!q || q.trim().length === 0) {
      return res.json({ success: true, users: [] });
    }

    const queryTerm = q.trim();

    if (isConfigured && supabase) {
      const { data: users, error } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url, bio, is_online, last_seen')
        .neq('id', currentUserId)
        .or(`username.ilike.%${queryTerm}%,display_name.ilike.%${queryTerm}%`)
        .limit(20);

      if (error) {
        return res.status(500).json({ success: false, error: error.message });
      }

      return res.json({ success: true, users: users || [] });
    }

    // Mock users para ambiente local
    const mockUsers = [
      {
        id: 'demo-user-ana',
        username: 'ana_dev',
        display_name: 'Ana Silva',
        avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
        bio: 'Desenvolvedora Fullstack & UI Designer',
        is_online: true,
        profile_song_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        profile_song_title: 'Never Gonna Give You Up',
        profile_song_artist: 'Rick Astley',
        profile_song_cover: 'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg'
      },
      {
        id: 'demo-user-marcos',
        username: 'marcos_sec',
        display_name: 'Marcos Oliveira',
        avatar_url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
        bio: 'DevOps & Cloud Architect',
        is_online: false,
        profile_song_url: 'https://www.youtube.com/watch?v=kXYiU_JCYtU',
        profile_song_title: 'Numb',
        profile_song_artist: 'Linkin Park',
        profile_song_cover: 'https://img.youtube.com/vi/kXYiU_JCYtU/hqdefault.jpg'
      },
      {
        id: 'demo-user-carla',
        username: 'carla_ia',
        display_name: 'Carla Mendes',
        avatar_url: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150',
        bio: 'AI & Data Scientist',
        is_online: true,
        profile_song_url: 'https://www.youtube.com/watch?v=fJ9rUzIMcZQ',
        profile_song_title: 'Bohemian Rhapsody',
        profile_song_artist: 'Queen',
        profile_song_cover: 'https://img.youtube.com/vi/fJ9rUzIMcZQ/hqdefault.jpg'
      }
    ].filter(u => 
      u.username.toLowerCase().includes(queryTerm.toLowerCase()) || 
      u.display_name.toLowerCase().includes(queryTerm.toLowerCase())
    );

    return res.json({ success: true, users: mockUsers });
  } catch (error) {
    console.error('Erro em searchUsers:', error);
    return res.status(500).json({ success: false, error: 'Erro ao buscar usuários.' });
  }
}

/**
 * Atualiza o perfil do usuário atual
 */
async function updateProfile(req, res) {
  try {
    const userId = req.user.id;
    const {
      display_name,
      bio,
      avatar_url,
      status_message,
      profile_song_url,
      profile_song_title,
      profile_song_artist,
      profile_song_cover
    } = req.body;

    const updates = {
      ...(display_name && { display_name: display_name.trim() }),
      ...(bio !== undefined && { bio }),
      ...(avatar_url && { avatar_url }),
      ...(status_message !== undefined && { status_message }),
      ...(profile_song_url !== undefined && { profile_song_url }),
      ...(profile_song_title !== undefined && { profile_song_title }),
      ...(profile_song_artist !== undefined && { profile_song_artist }),
      ...(profile_song_cover !== undefined && { profile_song_cover }),
      updated_at: new Date().toISOString()
    };

    if (isConfigured && supabase) {
      const { data: updated, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        return res.status(500).json({ success: false, error: error.message });
      }

      return res.json({ success: true, profile: updated });
    }

    return res.json({
      success: true,
      profile: {
        id: userId,
        ...updates
      }
    });
  } catch (error) {
    console.error('Erro em updateProfile:', error);
    return res.status(500).json({ success: false, error: 'Erro ao atualizar perfil.' });
  }
}

/**
 * Atualiza as configurações de preferências do usuário
 */
async function updateSettings(req, res) {
  try {
    const userId = req.user.id;
    const { theme, sound_notifications, desktop_notifications, enter_is_send } = req.body;

    const updates = {
      user_id: userId,
      ...(theme && { theme }),
      ...(sound_notifications !== undefined && { sound_notifications }),
      ...(desktop_notifications !== undefined && { desktop_notifications }),
      ...(enter_is_send !== undefined && { enter_is_send }),
      updated_at: new Date().toISOString()
    };

    if (isConfigured && supabase) {
      const { data: settings, error } = await supabase
        .from('user_settings')
        .upsert(updates)
        .select()
        .single();

      if (error) {
        return res.status(500).json({ success: false, error: error.message });
      }

      return res.json({ success: true, settings });
    }

    return res.json({ success: true, settings: updates });
  } catch (error) {
    console.error('Erro em updateSettings:', error);
    return res.status(500).json({ success: false, error: 'Erro ao atualizar preferências.' });
  }
}

module.exports = {
  searchUsers,
  updateProfile,
  updateSettings
};
