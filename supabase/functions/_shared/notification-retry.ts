// Garantias de entrega (decision 2026-06-01): backoff + dead-letter para notificações.
// At-least-once para o canal: em falha, reagenda com backoff exponencial até MAX; depois → dead-letter.

export const MAX_NOTIFICATION_RETRIES = 5;
const BASE_BACKOFF_MS = 5 * 60_000; // 5 min
const MAX_BACKOFF_MS = 6 * 60 * 60_000; // 6 h

export interface RetryUpdate {
  dead: boolean;
  retry_count: number;
  delivery_status: "failed" | "dead";
  next_retry_at: string | null;
  last_error: string;
}

/**
 * Calcula o próximo estado de entrega após uma falha de envio.
 * @param currentRetryCount retry_count atual da notificação (pode ser null/0)
 * @param nowMs timestamp atual em ms (injetável para teste)
 * @param lastError mensagem curta do erro
 */
export function computeRetryUpdate(
  currentRetryCount: number | null | undefined,
  nowMs: number,
  lastError: string,
): RetryUpdate {
  const retry_count = (Number(currentRetryCount) || 0) + 1;
  const error = (lastError ?? "").slice(0, 500);

  if (retry_count >= MAX_NOTIFICATION_RETRIES) {
    return { dead: true, retry_count, delivery_status: "dead", next_retry_at: null, last_error: error };
  }

  const backoffMs = Math.min(BASE_BACKOFF_MS * 2 ** (retry_count - 1), MAX_BACKOFF_MS);
  return {
    dead: false,
    retry_count,
    delivery_status: "failed",
    next_retry_at: new Date(nowMs + backoffMs).toISOString(),
    last_error: error,
  };
}
