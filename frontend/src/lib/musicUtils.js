/**
 * Utilitários para detecção, parsing e reprodução de Músicas de Perfil (Profile Anthem)
 * Suporta YouTube, YouTube Music, Spotify, SoundCloud e URLs de áudio direto (.mp3, .ogg, .wav)
 */

export function parseMusicLink(url) {
  if (!url || typeof url !== 'string') return null;
  const cleanUrl = url.trim();

  // 1. Detecção do YouTube / YouTube Music
  // Formatos: youtube.com/watch?v=ID, youtu.be/ID, music.youtube.com/watch?v=ID, youtube.com/shorts/ID
  const ytMatch = cleanUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/)|music\.youtube\.com\/watch\?v=)([\w-]{11})/i);
  if (ytMatch && ytMatch[1]) {
    const videoId = ytMatch[1];
    return {
      type: 'youtube',
      id: videoId,
      originalUrl: cleanUrl,
      embedUrl: `https://www.youtube.com/embed/${videoId}?autoplay=1&enablejsapi=1`,
      coverUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      platformName: 'YouTube Music'
    };
  }

  // 2. Detecção do Spotify
  // Formato: open.spotify.com/track/ID ou open.spotify.com/embed/track/ID
  const spotifyMatch = cleanUrl.match(/open\.spotify\.com\/(?:intl-[a-z]{2}\/)?(?:track|episode)\/([a-zA-Z0-9]+)/i);
  if (spotifyMatch && spotifyMatch[1]) {
    const trackId = spotifyMatch[1];
    return {
      type: 'spotify',
      id: trackId,
      originalUrl: cleanUrl,
      embedUrl: `https://open.spotify.com/embed/track/${trackId}?utm_source=generator&theme=0`,
      coverUrl: 'https://open.spotify.com/favicon.ico',
      platformName: 'Spotify'
    };
  }

  // 3. Detecção de Áudio Direto (MP3, WAV, OGG, M4A)
  const isAudioFile = /\.(mp3|wav|ogg|m4a|aac)(\?.*)?$/i.test(cleanUrl) || cleanUrl.startsWith('data:audio');
  if (isAudioFile) {
    const fileName = cleanUrl.split('/').pop().split('?')[0];
    const inferredTitle = decodeURIComponent(fileName).replace(/\.(mp3|wav|ogg|m4a|aac)$/i, '').replace(/[-_]/g, ' ');
    return {
      type: 'audio',
      id: cleanUrl,
      originalUrl: cleanUrl,
      audioUrl: cleanUrl,
      coverUrl: '',
      inferredTitle: inferredTitle || 'Música de Áudio',
      platformName: 'Áudio Direto'
    };
  }

  // 4. SoundCloud ou outros links gerais
  if (cleanUrl.includes('soundcloud.com')) {
    return {
      type: 'soundcloud',
      id: cleanUrl,
      originalUrl: cleanUrl,
      embedUrl: `https://w.soundcloud.com/player/?url=${encodeURIComponent(cleanUrl)}&color=%23ff5500&auto_play=true&hide_related=true&show_comments=false&show_user=true&show_reposts=false&show_teaser=false`,
      coverUrl: '',
      platformName: 'SoundCloud'
    };
  }

  // Fallback padrão se parecer uma URL válida
  if (/^https?:\/\//i.test(cleanUrl)) {
    return {
      type: 'generic',
      id: cleanUrl,
      originalUrl: cleanUrl,
      coverUrl: '',
      platformName: 'Link de Música'
    };
  }

  return null;
}

/**
 * Tenta buscar metadados de vídeo/faixa via noembed (sem auth key)
 */
export async function fetchMusicMetadata(url) {
  const parsed = parseMusicLink(url);
  if (!parsed) return null;

  const result = {
    ...parsed,
    title: '',
    artist: '',
    coverUrl: parsed.coverUrl || ''
  };

  try {
    if (parsed.type === 'youtube') {
      const res = await fetch(`https://noembed.com/embed?url=${encodeURIComponent(parsed.originalUrl)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.title) {
          result.title = data.title;
          result.artist = data.author_name || 'YouTube';
          if (data.thumbnail_url) {
            result.coverUrl = data.thumbnail_url;
          }
        }
      }
    } else if (parsed.type === 'spotify') {
      const res = await fetch(`https://open.spotify.com/oembed?url=${encodeURIComponent(parsed.originalUrl)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.title) {
          result.title = data.title;
          result.artist = data.author_name || 'Spotify Artist';
          if (data.thumbnail_url) {
            result.coverUrl = data.thumbnail_url;
          }
        }
      }
    } else if (parsed.type === 'audio') {
      result.title = parsed.inferredTitle;
      result.artist = 'Faixa Personalizada';
    }
  } catch (err) {
    console.warn('Não foi possível obter metadados automáticos da música:', err);
  }

  return result;
}
