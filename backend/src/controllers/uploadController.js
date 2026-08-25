const { supabase, isConfigured } = require('../config/supabase');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const BUCKET_NAME = process.env.UPLOAD_STORAGE_BUCKET || 'chat-media';

/**
 * Realiza o upload de um arquivo para o Supabase Storage ou retorna URI base64 no modo local
 */
async function uploadFile(req, res) {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ success: false, error: 'Nenhum arquivo enviado.' });
    }

    const userId = req.user.id;
    const fileExtension = path.extname(file.originalname);
    const uniqueFileName = `${userId}/${Date.now()}_${uuidv4().slice(0, 8)}${fileExtension}`;

    if (isConfigured && supabase) {
      // Upload para o Supabase Storage
      const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(uniqueFileName, file.buffer, {
          contentType: file.mimetype,
          upsert: false
        });

      if (error) {
        console.error('Erro no upload para Supabase Storage:', error);
        return res.status(500).json({
          success: false,
          error: `Falha no upload para o Storage: ${error.message}`
        });
      }

      // Obter URL pública do arquivo
      const { data: publicData } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(uniqueFileName);

      return res.json({
        success: true,
        file: {
          url: publicData.publicUrl,
          name: file.originalname,
          size: file.size,
          type: file.mimetype.startsWith('image/')
            ? 'image'
            : file.mimetype.startsWith('audio/')
            ? 'audio'
            : 'file',
          mimetype: file.mimetype
        }
      });
    }

    // Modo local / Fallback Data URI
    const base64Data = file.buffer.toString('base64');
    const dataUri = `data:${file.mimetype};base64,${base64Data}`;

    return res.json({
      success: true,
      file: {
        url: dataUri,
        name: file.originalname,
        size: file.size,
        type: file.mimetype.startsWith('image/')
          ? 'image'
          : file.mimetype.startsWith('audio/')
          ? 'audio'
          : 'file',
        mimetype: file.mimetype
      }
    });
  } catch (error) {
    console.error('Erro em uploadFile:', error);
    return res.status(500).json({ success: false, error: 'Erro no processamento do arquivo.' });
  }
}

module.exports = {
  uploadFile
};
