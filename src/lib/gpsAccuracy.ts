/**
 * Validação de precisão GPS conforme CSU008 RN04.
 * Requer accuracy <= 15 metros para aceitar coordenadas.
 */

/** Precisão máxima aceitável em metros (CSU008 RN04). */
export const MAX_GPS_ACCURACY_METERS = 15;

/**
 * Verifica se a precisão do GPS é aceitável (<= 15m).
 * @param accuracy accuracy em metros (position.coords.accuracy); pode ser null se o dispositivo não informar.
 */
export function isGpsAccuracyAcceptable(accuracy: number | null | undefined): boolean {
  if (accuracy == null) return false;
  return Number.isFinite(accuracy) && accuracy <= MAX_GPS_ACCURACY_METERS;
}
