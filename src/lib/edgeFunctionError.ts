/**
 * Extrai mensagem legível de erros do supabase.functions.invoke.
 * Em respostas 4xx/5xx o cliente define `error` (FunctionsHttpError), mas o corpo
 * JSON com `{ error: "..." }` fica em `data` ou em `error.context`.
 */
export async function parseEdgeFunctionError(error: unknown, data: unknown): Promise<string> {
  if (data && typeof data === "object") {
    const record = data as Record<string, unknown>;
    if (typeof record.error === "string" && record.error.trim()) {
      return record.error;
    }
    if (typeof record.warning === "string" && record.warning.trim()) {
      return record.warning;
    }
  }

  const ctx = (error as { context?: Response })?.context;
  if (ctx && typeof ctx.json === "function") {
    try {
      const body = (await ctx.json()) as Record<string, unknown>;
      if (typeof body.error === "string" && body.error.trim()) {
        return body.error;
      }
      if (typeof body.warning === "string" && body.warning.trim()) {
        return body.warning;
      }
    } catch {
      /* corpo não é JSON */
    }
  }

  if (error instanceof Error && error.message) {
    if (error.message.includes("non-2xx")) {
      return "A operação falhou. Verifique os dados e tente novamente.";
    }
    return error.message;
  }

  return "Erro desconhecido.";
}
