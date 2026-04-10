/**
 * RN-AVA-002: janela para avaliar visita detectada (orchestrator + UI).
 * Alinhado a visitHistoryStatus / expire_pending_visits_over_48h (48h desde created_at; teto expires_at).
 */

const FORTY_EIGHT_H_MS = 48 * 60 * 60 * 1000;

export const SERVICE_RATING_VISIT_DEADLINE_EXPIRED_MESSAGE =
  "O prazo para avaliar esta visita expirou (48h). Você pode fazer uma avaliação livre pelo chat.";

/** True quando now >= created_at + 48h (mesmo critério do SQL `created_at <= now() - interval '48 hours'`). */
export function isPastVisitRating48hDeadline(createdAtIso: string, nowMs: number = Date.now()): boolean {
  const createdMs = new Date(createdAtIso).getTime();
  if (Number.isNaN(createdMs)) return true;
  return nowMs >= createdMs + FORTY_EIGHT_H_MS;
}

/**
 * Visita pending: fechada para avaliação se passou 48h desde created_at ou já passou expires_at.
 * Espelha a lógica de `getVisitHistoryUiStatus` (open_for_rating).
 */
export function isVisitRatingWindowClosed(
  createdAtIso: string,
  expiresAtIso: string,
  nowMs: number = Date.now(),
): boolean {
  if (isPastVisitRating48hDeadline(createdAtIso, nowMs)) return true;
  const expiresMs = new Date(expiresAtIso).getTime();
  if (Number.isNaN(expiresMs)) return false;
  return nowMs >= expiresMs;
}
