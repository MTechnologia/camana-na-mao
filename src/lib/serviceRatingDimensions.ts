/**
 * Avaliação por dimensões (legado em mensagens antigas). Fluxo atual: uma nota geral (rating_stars).
 * Chaves alinhadas ao backend em supabase/functions/ai-orchestrator/lib.ts
 */
export const SERVICE_RATING_DIMENSION_KEYS = [
  "atendimento",
  "limpeza",
  "infraestrutura",
  "tempo_espera",
] as const;

export type ServiceRatingDimensionKey = (typeof SERVICE_RATING_DIMENSION_KEYS)[number];

export type ServiceRatingDimensions = Record<ServiceRatingDimensionKey, number>;

export const SERVICE_RATING_DIMENSION_LABELS: Record<ServiceRatingDimensionKey, string> = {
  atendimento: "Atendimento",
  limpeza: "Limpeza",
  infraestrutura: "Infraestrutura",
  tempo_espera: "Tempo de espera",
};

export function isCompleteServiceRatingDimensions(
  value: unknown,
): value is ServiceRatingDimensions {
  if (!value || typeof value !== "object") return false;
  const o = value as Record<string, unknown>;
  for (const k of SERVICE_RATING_DIMENSION_KEYS) {
    const n = Number(o[k]);
    if (!Number.isInteger(n) || n < 1 || n > 5) return false;
  }
  return true;
}

/** Média arredondada (1–5) para compatibilidade com rating_stars legado */
export function aggregateServiceRatingStars(dim: ServiceRatingDimensions): number {
  const sum = SERVICE_RATING_DIMENSION_KEYS.reduce((acc, k) => acc + dim[k], 0);
  return Math.round(sum / SERVICE_RATING_DIMENSION_KEYS.length);
}

const MARKER_PREFIX = "[RATING_DIMENSIONS:";

export function parseRatingDimensionsFromMessage(content: string): ServiceRatingDimensions | null {
  const idx = content.indexOf(MARKER_PREFIX);
  if (idx < 0) return null;
  const start = idx + MARKER_PREFIX.length;
  const end = content.indexOf("]", start);
  if (end < 0) return null;
  try {
    const parsed = JSON.parse(content.slice(start, end)) as Record<string, unknown>;
    if (!isCompleteServiceRatingDimensions(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function buildServiceRatingDimensionsUserMessage(dim: ServiceRatingDimensions): string {
  const lines = SERVICE_RATING_DIMENSION_KEYS.map(
    (k) => `• ${SERVICE_RATING_DIMENSION_LABELS[k]}: ${dim[k]}`,
  ).join("\n");
  const json = JSON.stringify(dim);
  return `Avaliação por dimensão (1 a 5):\n${lines}\n${MARKER_PREFIX}${json}]`;
}
