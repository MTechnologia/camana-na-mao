/**
 * Validação de precisão GPS conforme CSU008 RN04.
 * Requer accuracy <= 15 metros para aceitar coordenadas em fluxos críticos (relato manual, etc.).
 */

/** Precisão máxima aceitável em metros (CSU008 RN04). */
export const MAX_GPS_ACCURACY_METERS = 15;

/**
 * Limite mais permissivo para mapa / “perto de você” no desktop: Wi‑Fi e IP costumam dar 50–500 m.
 * Ainda razoável com raio de busca em km.
 */
export const MAX_GPS_ACCURACY_NEARBY_UI_METERS = 1500;

/**
 * Verifica se a precisão do GPS é aceitável.
 * @param accuracy accuracy em metros (position.coords.accuracy); pode ser null se o dispositivo não informar.
 * @param maxMeters teto em metros; omitido = RN04 (15 m).
 */
export function isGpsAccuracyAcceptable(
  accuracy: number | null | undefined,
  maxMeters: number = MAX_GPS_ACCURACY_METERS,
): boolean {
  if (accuracy == null) return false;
  return Number.isFinite(accuracy) && accuracy <= maxMeters;
}
