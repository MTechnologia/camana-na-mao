/** RN-NOT-002 / limite configurável em notification_settings.max_daily_notifications (default 10). */

export const DEFAULT_DAILY_NOTIFICATION_LIMIT = 10;

export function effectiveDailyLimit(settingsMax: number | null | undefined): number {
  if (settingsMax == null || !Number.isFinite(Number(settingsMax))) {
    return DEFAULT_DAILY_NOTIFICATION_LIMIT;
  }
  const n = Math.floor(Number(settingsMax));
  return n < 1 ? DEFAULT_DAILY_NOTIFICATION_LIMIT : n;
}

/** deliveredCountToday = retorno de check_notification_daily_limit antes de entregar a próxima. */
export function shouldDiscardForDailyLimit(
  deliveredCountToday: number,
  limit: number,
  isCritical: boolean,
): boolean {
  if (isCritical) return false;
  return deliveredCountToday >= limit;
}
