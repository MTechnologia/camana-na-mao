type CompressionOptions = {
  maxDimension: number;
  targetBytes: number;
  minQuality: number;
  initialQuality: number;
};

const DEFAULT_OPTIONS: CompressionOptions = {
  maxDimension: 1600,
  targetBytes: 1_500_000, // ~1.5MB
  minQuality: 0.55,
  initialQuality: 0.86,
};

const readAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error ?? new Error("Falha ao ler imagem"));
    reader.readAsDataURL(file);
  });

const loadImage = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Falha ao carregar imagem"));
    img.src = src;
  });

const canvasToBlob = (canvas: HTMLCanvasElement, quality: number): Promise<Blob> =>
  new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Falha ao gerar blob comprimido"))),
      "image/jpeg",
      quality,
    );
  });

/**
 * Redimensiona e comprime imagem para upload no chat.
 * - Mantém proporção
 * - Converte para JPEG
 * - Reduz qualidade progressivamente para atingir alvo aproximado
 */
export async function compressChatPhoto(
  file: File,
  opts: Partial<CompressionOptions> = {},
): Promise<File> {
  const options = { ...DEFAULT_OPTIONS, ...opts };
  const dataUrl = await readAsDataUrl(file);
  const image = await loadImage(dataUrl);

  const largerSide = Math.max(image.width, image.height);
  const scale = largerSide > options.maxDimension ? options.maxDimension / largerSide : 1;
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Não foi possível criar canvas para compressão");

  ctx.drawImage(image, 0, 0, width, height);

  let quality = options.initialQuality;
  let blob = await canvasToBlob(canvas, quality);
  while (blob.size > options.targetBytes && quality > options.minQuality) {
    quality = Math.max(options.minQuality, quality - 0.08);
    blob = await canvasToBlob(canvas, quality);
    if (quality <= options.minQuality) break;
  }

  const originalBase = (file.name || "imagem")
    .replace(/\.[^.]+$/, "")
    .replace(/[^\w-]+/g, "_")
    .slice(0, 60);
  const safeName = `${originalBase || "imagem"}_chat.jpg`;
  return new File([blob], safeName, { type: "image/jpeg", lastModified: Date.now() });
}
