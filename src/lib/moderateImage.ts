import { supabase } from "@/integrations/supabase/client";

export interface ImageModerationResult {
  blocked: boolean;
  categories?: string[];
}

export const IMAGE_MODERATION_BLOCKED_MESSAGE =
  "Imagem bloqueada por possível conteúdo impróprio e não foi anexada.";

/**
 * Modera uma imagem JÁ enviada ao storage (chama a edge function `moderate-image`). Se reprovada,
 * o objeto é removido do storage pelo servidor e `blocked` vem `true`. Chamar LOGO APÓS o
 * `.upload()`, antes de usar/persistir a URL.
 *
 * FAIL-OPEN: qualquer erro de infra (função fora, sem OPENAI_API_KEY, timeout) retorna
 * `blocked: false` — a moderação nunca derruba o fluxo de upload.
 */
export async function moderateUploadedImage(
  bucket: string,
  path: string,
): Promise<ImageModerationResult> {
  try {
    const { data, error } = await supabase.functions.invoke("moderate-image", {
      body: { bucket, path },
    });
    if (error) {
      console.warn("[moderateUploadedImage] invoke error:", error.message);
      return { blocked: false };
    }
    return { blocked: !!data?.blocked, categories: data?.categories };
  } catch (e) {
    console.warn("[moderateUploadedImage] failed:", e);
    return { blocked: false };
  }
}
