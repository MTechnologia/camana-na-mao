/**
 * Conversão de HEIC/HEIF (formato padrão de fotos de iPhone) para JPEG no cliente.
 *
 * Chrome/Firefox não decodificam HEIC nativamente — sem conversão, a foto não renderiza no
 * preview/crop e é rejeitada pela validação (jpeg/png/webp) e pelo bucket. O `heic2any` (wasm
 * libheif) é carregado via **dynamic import**, então só entra no bundle quando o usuário de fato
 * seleciona um HEIC. Use no momento da SELEÇÃO do arquivo, antes de preview/compressão/upload.
 *
 * FAIL-OPEN: se a conversão falhar, devolve o arquivo original (a validação/servidor decidem).
 */
export function isHeicFile(file: File): boolean {
  return /image\/hei[cf]/i.test(file.type) || /\.(heic|heif)$/i.test(file.name);
}

export async function convertHeicToJpegIfNeeded(file: File): Promise<File> {
  if (!isHeicFile(file)) return file;
  try {
    const heic2any = (await import("heic2any")).default;
    const out = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.9 });
    const blob = (Array.isArray(out) ? out[0] : out) as Blob;
    const newName = file.name.replace(/\.(heic|heif)$/i, ".jpg") || "foto.jpg";
    return new File([blob], newName, { type: "image/jpeg", lastModified: file.lastModified });
  } catch (e) {
    console.warn("[heicConvert] Falha ao converter HEIC para JPEG:", e);
    return file;
  }
}
