import type { SupabaseClient } from "@supabase/supabase-js";
import { FunctionsHttpError } from "@supabase/supabase-js";

function getEdgeFunctionHttpStatus(error: unknown): number | undefined {
  if (!(error instanceof FunctionsHttpError)) return undefined;
  const ctx = error.context;
  if (ctx instanceof Response) return ctx.status;
  if (ctx && typeof ctx === "object" && "status" in ctx) {
    const s = (ctx as { status?: number }).status;
    if (typeof s === "number") return s;
  }
  return undefined;
}

/**
 * A Edge Function `sptrans-olhovivo` repassa o status HTTP da API Olho Vivo.
 * Por isso um 404 pode ser (a) recurso inexistente no gateway SPTrans ou (b) a própria
 * função não deployada no Supabase. Distinguimos pelo corpo da resposta.
 */
async function explainFunctionsHttpError(error: FunctionsHttpError): Promise<string> {
  const ctx = error.context;
  if (!(ctx instanceof Response)) {
    return error.message;
  }

  let bodyPreview = "";
  try {
    bodyPreview = (await ctx.clone().text()).slice(0, 800);
  } catch {
    /* ignore */
  }

  const status = ctx.status;

  if (status === 404) {
    const looksLikeSupabaseMissingFunction =
      /requested function was not found|function was not found|no function matches|NOT_FOUND/i.test(
        bodyPreview,
      ) ||
      (bodyPreview.length < 120 && /not found/i.test(bodyPreview));

    if (looksLikeSupabaseMissingFunction) {
      return (
        "Edge Function sptrans-olhovivo não encontrada neste projeto Supabase (404). " +
        "Execute: npx supabase functions deploy sptrans-olhovivo — e confirme o secret SPTRANS_OLHOVIVO_BEARER_TOKEN."
      );
    }

    return (
      "A API Olho Vivo / gateway respondeu 404 (recurso ou combinação path/parâmetros não encontrada). " +
      "Confira código da linha, path e documentação SPTrans. " +
      (bodyPreview ? `Resposta: ${bodyPreview}` : "")
    );
  }

  if (!ctx.ok) {
    const tail = bodyPreview ? ` Detalhe: ${bodyPreview}` : "";
    return `Erro HTTP ${status} ao chamar o proxy Olho Vivo.${tail}`;
  }

  return error.message;
}

/** Parâmetros repassados à API Olho Vivo (path + query). Ver `supabase/functions/sptrans-olhovivo/README.md`. */
export type SptransOlhoVivoParams = {
  path: string;
} & Record<string, string | number | undefined>;

/**
 * Chama a Edge Function `sptrans-olhovivo` (proxy autenticado para o gateway SPTrans).
 * Requer utilizador com sessão; o token da API Store fica só no servidor.
 */
export async function invokeSptransOlhoVivo(
  supabase: SupabaseClient,
  params: SptransOlhoVivoParams
): Promise<{ data: unknown; error: Error | null }> {
  const { path, ...rest } = params;
  const body: Record<string, string> = { path };
  for (const [k, v] of Object.entries(rest)) {
    if (v === undefined || v === null) continue;
    body[k] = String(v);
  }

  const { data, error } = await supabase.functions.invoke("sptrans-olhovivo", {
    body,
  });

  if (!error) {
    return { data, error: null };
  }

  if (error instanceof FunctionsHttpError) {
    return {
      data: null,
      error: new Error(await explainFunctionsHttpError(error)),
    };
  }

  const status = getEdgeFunctionHttpStatus(error);
  const msg = error.message ?? "";
  if (
    status === 404 ||
    /\b404\b/i.test(msg) ||
    /not\s*found/i.test(msg)
  ) {
    return {
      data: null,
      error: new Error(
        "Resposta 404 ao invocar sptrans-olhovivo. Se a função está deployada, trata-se provavelmente de 404 repassado pela API Olho Vivo (path/parâmetros).",
      ),
    };
  }

  return { data, error: error as Error };
}
