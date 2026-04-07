/** Alinhado à Edge `detect-service-visit`: não criar nova visita se já houve uma nas últimas 24h (visited_at). */
export const RECENT_SERVICE_VISIT_LOOKBACK_MS = 24 * 60 * 60 * 1000;

/** RN-VISIT-002: entre várias visitas criadas no mesmo ciclo, notificar só a mais próxima. */
export function pickClosestByDistanceMeters<T extends { distanceMeters: number }>(
  items: readonly T[],
): T | null {
  if (items.length === 0) return null;
  return items.reduce((best, cur) => (cur.distanceMeters < best.distanceMeters ? cur : best));
}
