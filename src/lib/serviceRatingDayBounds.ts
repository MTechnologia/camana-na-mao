/**
 * Janela UTC [start, end) do dia civil em America/Sao_Paulo — alinhada ao índice
 * idx_one_rating_per_service_per_day no PostgreSQL (RN-AVA-003).
 */
const SERVICE_RATING_DEDUP_TZ = "America/Sao_Paulo";

function zonedCalendarDayKey(timeZone: string, instantMs: number): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(instantMs));
}

export function getSaoPauloServiceRatingDayUtcBounds(ref: Date = new Date()): {
  startIso: string;
  endExclusiveIso: string;
} {
  const refMs = ref.getTime();
  const dayKey = zonedCalendarDayKey(SERVICE_RATING_DEDUP_TZ, refMs);
  let lo = refMs - 26 * 3600000;
  let hi = refMs + 26 * 3600000;
  while (zonedCalendarDayKey(SERVICE_RATING_DEDUP_TZ, lo) >= dayKey) lo -= 3600000;
  while (zonedCalendarDayKey(SERVICE_RATING_DEDUP_TZ, hi) < dayKey) hi += 3600000;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (zonedCalendarDayKey(SERVICE_RATING_DEDUP_TZ, mid) < dayKey) lo = mid;
    else hi = mid;
  }
  const startMs = Math.ceil(hi);
  let lo2 = startMs;
  let hi2 = startMs + 40 * 3600000;
  for (let i = 0; i < 60; i++) {
    const mid = (lo2 + hi2) / 2;
    if (zonedCalendarDayKey(SERVICE_RATING_DEDUP_TZ, mid) === dayKey) lo2 = mid;
    else hi2 = mid;
  }
  const endExclusiveMs = Math.ceil(hi2);
  return {
    startIso: new Date(startMs).toISOString(),
    endExclusiveIso: new Date(endExclusiveMs).toISOString(),
  };
}
