import { supabase } from "@/integrations/supabase/client";

export type TransportLineCatalogRow = {
  id: string | null;
  line_code: string;
  line_name: string;
  line_type: string;
  sptrans_codigo_linha?: number | null;
  direction_label?: string;
};

type SearchResponse = {
  lines?: TransportLineCatalogRow[];
  source?: string;
  error?: string;
  fallback?: boolean;
};

type ResolveResponse = {
  line?: {
    id: string;
    line_code: string;
    line_name: string;
    line_type: string;
    sptrans_codigo_linha?: number | null;
  };
  created?: boolean;
  error?: string;
};

async function invokeTransportLines<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke("transport-lines", { body });
  if (error) {
    throw error;
  }
  return data as T;
}

/** Busca linhas na API Olho Vivo (SPTrans) via Edge Function. */
export async function searchTransportLinesOlhoVivo(
  query: string,
  limit = 12,
): Promise<TransportLineCatalogRow[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const result = await invokeTransportLines<SearchResponse>({
    action: "search",
    query: trimmed,
    limit,
  });

  return result.lines ?? [];
}

/** Garante registro em transport_lines e retorna o UUID para inscrição/relato. */
export async function resolveTransportLine(params: {
  line_code: string;
  line_name?: string;
  sptrans_codigo_linha?: number | null;
  line_type?: string;
}): Promise<{ id: string; line_code: string; line_name: string; line_type: string }> {
  const result = await invokeTransportLines<ResolveResponse>({
    action: "resolve",
    line_code: params.line_code.trim(),
    line_name: params.line_name?.trim() || undefined,
    sptrans_codigo_linha: params.sptrans_codigo_linha ?? undefined,
    line_type: params.line_type,
  });

  if (!result.line?.id) {
    throw new Error(result.error ?? "Não foi possível registrar a linha.");
  }

  return {
    id: result.line.id,
    line_code: result.line.line_code,
    line_name: result.line.line_name,
    line_type: result.line.line_type,
  };
}
