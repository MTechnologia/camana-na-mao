/**
 * RN-AVA-002 (espelho de supabase/functions/_shared/service-visit-rating-deadline.ts para o app web).
 * Manter em sincronia com o arquivo em _shared.
 */

const FORTY_EIGHT_H_MS = 48 * 60 * 60 * 1000;

export const SERVICE_RATING_VISIT_DEADLINE_EXPIRED_MESSAGE =
  "O prazo para avaliar esta visita expirou (48h). Você pode fazer uma avaliação livre pelo chat.";

export function isPastVisitRating48hDeadline(
  createdAtIso: string,
  nowMs: number = Date.now(),
): boolean {
  const createdMs = new Date(createdAtIso).getTime();
  if (Number.isNaN(createdMs)) return true;
  return nowMs >= createdMs + FORTY_EIGHT_H_MS;
}

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
