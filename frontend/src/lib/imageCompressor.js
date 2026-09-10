import imageCompression from 'browser-image-compression';

/**
 * Redimensiona e comprime uma imagem para um tamanho ideal de alta resolução e baixo peso
 * Utiliza browser-image-compression (Web Worker) com fallback seguro para Canvas 2D
 */
export async function compressImageFile(file, maxWidthParam = 1280, maxHeightParam = 1280, qualityParam = 0.85) {
  let maxWidth = 1280;
  let maxHeight = 1280;
  let quality = 0.85;

  if (maxWidthParam && typeof maxWidthParam === 'object') {
    maxWidth = maxWidthParam.maxWidth || 1280;
    maxHeight = maxWidthParam.maxHeight || 1280;
    quality = typeof maxWidthParam.quality === 'number' ? maxWidthParam.quality : 0.85;
  } else {
    maxWidth = typeof maxWidthParam === 'number' ? maxWidthParam : 1280;
    maxHeight = typeof maxHeightParam === 'number' ? maxHeightParam : 1280;
    quality = typeof qualityParam === 'number' ? qualityParam : 0.85;
  }

  if (!file) {
    throw new Error('Nenhum arquivo fornecido.');
  }

  // Se for GIF animado ou SVG, preservar original para não quebrar animação/vetor
  if (file.type === 'image/gif' || file.type === 'image/svg+xml' || file.name?.endsWith('.gif') || file.name?.endsWith('.svg')) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result);
      reader.onerror = () => reject(new Error('Erro ao ler arquivo animado.'));
      reader.readAsDataURL(file);
    });
  }

  // 1. Tentar compressão ultra-rápida em Web Worker via browser-image-compression
  try {
    const options = {
      maxSizeMB: 1.2,
      maxWidthOrHeight: Math.max(maxWidth, maxHeight),
      useWebWorker: true,
      initialQuality: quality,
      fileType: 'image/jpeg'
    };
    const compressedBlob = await imageCompression(file, options);
    const base64 = await imageCompression.getDataUrlFromFile(compressedBlob);
    if (base64) return base64;
  } catch (workerErr) {
    console.warn('[imageCompressor] WebWorker compression fallback to Canvas:', workerErr);
  }

  // 2. Fallback clássico em Canvas
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Redimensionamento proporcional inteligente
          if (width > maxWidth || height > maxHeight) {
            if (width > height) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            } else {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
          resolve(compressedBase64);
        } catch (canvasErr) {
          resolve(e.target?.result);
        }
      };
      img.onerror = () => {
        resolve(e.target?.result);
      };
      img.src = e.target?.result;
    };
    reader.onerror = () => reject(new Error('Erro ao ler o arquivo do dispositivo.'));
    reader.readAsDataURL(file);
  });
}


