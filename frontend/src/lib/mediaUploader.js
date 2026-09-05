import { supabase, isSupabaseConfigured } from './supabaseClient';
import { compressImageFile } from './imageCompressor';

/**
 * Converte DataURL Base64 para objeto Blob binário
 */
export function dataURLtoBlob(dataurl) {
  try {
    const arr = dataurl.split(',');
    const mimeMatch = arr[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  } catch (err) {
    console.warn('Erro ao converter dataURL para blob:', err);
    return null;
  }
}

/**
 * Faz o upload de um arquivo ou imagem para o bucket público 'chat-media' do Supabase
 * Retorna a URL pública HTTPS ou fallback base64
 */
export async function uploadChatMedia(fileOrBase64, customFileName = null) {
  try {
    let blob = null;
    let fileName = customFileName || `media_${Date.now()}`;
    let contentType = 'image/jpeg';

    if (typeof fileOrBase64 === 'string') {
      if (fileOrBase64.startsWith('data:')) {
        blob = dataURLtoBlob(fileOrBase64);
        if (blob) {
          contentType = blob.type;
          const ext = contentType.split('/')[1] || 'jpg';
          if (!fileName.includes('.')) fileName += `.${ext}`;
        }
      } else if (fileOrBase64.startsWith('http')) {
        return fileOrBase64;
      }
    } else if (fileOrBase64 instanceof File || fileOrBase64 instanceof Blob) {
      blob = fileOrBase64;
      contentType = fileOrBase64.type || 'image/jpeg';
      if (fileOrBase64.name) fileName = fileOrBase64.name;
    }

    if (!blob) {
      if (typeof fileOrBase64 === 'string') return fileOrBase64;
      throw new Error('Arquivo inválido para upload');
    }

    if (isSupabaseConfigured && supabase) {
      const ext = fileName.split('.').pop() || 'jpg';
      const cleanPath = `chat/${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${ext}`;

      const { data, error } = await supabase.storage
        .from('chat-media')
        .upload(cleanPath, blob, {
          contentType,
          upsert: true,
          cacheControl: '31536000'
        });

      if (!error && data) {
        const { data: pubData } = supabase.storage
          .from('chat-media')
          .getPublicUrl(cleanPath);

        if (pubData?.publicUrl) {
          return pubData.publicUrl;
        }
      } else if (error) {
        console.warn('Upload Supabase Storage falhou, usando fallback:', error);
      }
    }
  } catch (err) {
    console.warn('Erro ao enviar mídia para o Supabase Storage:', err);
  }

  // Fallback se não conseguir URL remota
  if (typeof fileOrBase64 === 'string') {
    return fileOrBase64;
  }
  return null;
}
