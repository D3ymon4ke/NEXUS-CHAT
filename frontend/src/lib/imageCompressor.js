/**
 * Redimensiona e comprime uma imagem para um tamanho ideal de alta resolução e baixo peso
 */
export function compressImageFile(file, maxWidth = 1280, maxHeight = 1280, quality = 0.85) {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error('Nenhum arquivo fornecido.'));
      return;
    }

    // Se for GIF animado ou SVG, preservar original para não quebrar animação/vetor
    if (file.type === 'image/gif' || file.type === 'image/svg+xml' || file.name?.endsWith('.gif') || file.name?.endsWith('.svg')) {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result);
      reader.onerror = () => reject(new Error('Erro ao ler arquivo animado.'));
      reader.readAsDataURL(file);
      return;
    }

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
          // Fallback caso o canvas falhe (ex: formatos especiais)
          resolve(e.target?.result);
        }
      };
      img.onerror = () => {
        // Fallback se a tag Image falhar ao decodificar (ex: HEIC no Safari)
        resolve(e.target?.result);
      };
      img.src = e.target?.result;
    };
    reader.onerror = () => reject(new Error('Erro ao ler o arquivo do dispositivo.'));
    reader.readAsDataURL(file);
  });
}

