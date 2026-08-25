const { supabase, isConfigured } = require('../config/supabase');

/**
 * Retorna os dados do perfil do usuário autenticado atual
 */
async function getMe(req, res) {
  try {
    const userId = req.user.id;

    if (isConfigured && supabase) {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*, user_settings(*)')
        .eq('id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        return res.status(500).json({ success: false, error: error.message });
      }

      if (!profile) {
        // Cria perfil básico caso ainda não exista
        const newProfile = {
          id: userId,
          username: req.user.email ? req.user.email.split('@')[0] : `user_${userId.slice(0, 5)}`,
          display_name: req.user.user_metadata?.display_name || req.user.user_metadata?.full_name || 'Usuário',
          avatar_url: req.user.user_metadata?.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${userId}`
        };

        const { data: created, error: createErr } = await supabase
          .from('profiles')
          .insert(newProfile)
          .select()
          .single();

        if (createErr) {
          return res.status(500).json({ success: false, error: createErr.message });
        }

        return res.json({ success: true, user: created });
      }

      return res.json({ success: true, user: profile });
    }

    // Mock response para desenvolvimento local
    return res.json({
      success: true,
      user: {
        id: userId,
        username: req.user.user_metadata?.username || 'usuario_demo',
        display_name: req.user.user_metadata?.display_name || 'Usuário Demo',
        avatar_url: `https://api.dicebear.com/7.x/bottts/svg?seed=${userId}`,
        bio: 'Disponível para conversar',
        status_message: 'online',
        is_online: true
      }
    });
  } catch (error) {
    console.error('Erro em getMe:', error);
    return res.status(500).json({ success: false, error: 'Erro ao buscar perfil.' });
  }
}

/**
 * Solicitação de recuperação de senha via Supabase Auth
 */
async function resetPassword(req, res) {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, error: 'E-mail obrigatório.' });
    }

    if (isConfigured && supabase) {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${process.env.CLIENT_URL?.split(',')[0] || 'http://localhost:3000'}/reset-password`
      });

      if (error) {
        return res.status(400).json({ success: false, error: error.message });
      }
    }

    return res.json({
      success: true,
      message: 'Se o e-mail estiver cadastrado, as instruções de recuperação foram enviadas.'
    });
  } catch (error) {
    console.error('Erro em resetPassword:', error);
    return res.status(500).json({ success: false, error: 'Erro ao processar recuperação de senha.' });
  }
}

module.exports = {
  getMe,
  resetPassword
};
