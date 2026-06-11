// heic2any não publica tipos próprios. Declaração mínima para o uso em src/lib/heicConvert.ts.
declare module "heic2any" {
  interface Heic2AnyOptions {
    blob: Blob;
    /** MIME de saída (ex.: "image/jpeg", "image/png"). Padrão: image/png. */
    toType?: string;
    /** 0..1 (para JPEG). */
    quality?: number;
    /** Converte cada frame de um HEIC multi-imagem. */
    multiple?: boolean;
  }
  export default function heic2any(options: Heic2AnyOptions): Promise<Blob | Blob[]>;
}
