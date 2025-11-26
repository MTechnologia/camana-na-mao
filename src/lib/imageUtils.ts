export interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Cria uma imagem cortada a partir do canvas
 */
export const createCroppedImage = async (
  imageSrc: string,
  cropArea: CropArea
): Promise<Blob> => {
  const image = await loadImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Não foi possível criar contexto do canvas');
  }

  // Define o tamanho do canvas para o tamanho do crop
  canvas.width = cropArea.width;
  canvas.height = cropArea.height;

  // Desenha a imagem cortada
  ctx.drawImage(
    image,
    cropArea.x,
    cropArea.y,
    cropArea.width,
    cropArea.height,
    0,
    0,
    cropArea.width,
    cropArea.height
  );

  // Converte para blob
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Erro ao criar blob da imagem'));
        }
      },
      'image/jpeg',
      0.95
    );
  });
};

/**
 * Carrega uma imagem a partir de uma URL
 */
const loadImage = (url: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.src = url;
  });
};

/**
 * Lê um arquivo como Data URL
 */
export const readFile = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener('load', () => resolve(reader.result as string));
    reader.addEventListener('error', (error) => reject(error));
    reader.readAsDataURL(file);
  });
};

/**
 * Valida o tipo e tamanho do arquivo de imagem
 */
export const validateImageFile = (file: File): { valid: boolean; error?: string } => {
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  const maxSize = 5 * 1024 * 1024; // 5MB

  if (!validTypes.includes(file.type)) {
    return {
      valid: false,
      error: 'Formato de arquivo não suportado. Use JPG, PNG ou WEBP.',
    };
  }

  if (file.size > maxSize) {
    return {
      valid: false,
      error: 'Arquivo muito grande. O tamanho máximo é 5MB.',
    };
  }

  return { valid: true };
};
