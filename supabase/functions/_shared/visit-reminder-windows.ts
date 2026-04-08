/**
 * RN-AVA-002: janelas em relação a created_at da visita (instantes UTC).
 * Lembrete: idade em [24h, 48h). Expiração: idade >= 48h.
 */

const H24_MS = 24 * 60 * 60 * 1000;
const H48_MS = 48 * 60 * 60 * 1000;

export function visitAgeMs(createdAt: Date, now: Date): number {
  return now.getTime() - createdAt.getTime();
}

/** Visita pending sem avaliação, entre 24h e 48h — elegível a evaluation_reminder. */
export function isEligibleForEvaluationReminder(createdAt: Date, now: Date): boolean {
  const age = visitAgeMs(createdAt, now);
  return age >= H24_MS && age < H48_MS;
}

/** Visita pending sem avaliação, com 48h ou mais — marcar expired. */
export function shouldExpirePendingVisit(createdAt: Date, now: Date): boolean {
  return visitAgeMs(createdAt, now) >= H48_MS;
}
