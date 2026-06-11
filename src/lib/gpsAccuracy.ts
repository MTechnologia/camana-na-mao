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

/**
 * Escolhe o teto de precisão para o seletor de localização do chat conforme a jornada.
 *
 * Busca de serviços próximos ("perto de você") NÃO é relato crítico: não exige a
 * precisão RN04 (≤15 m) — no celular 30–60 m é comum (indoor / 1º fix) e basta para
 * listar serviços num raio de km. Relatos urbanos/transporte continuam no teto estrito.
 *
 * @param promptContent texto da mensagem do assistente que acompanha o [LOCATION_METHOD_PICKER].
 */
export function maxGpsAccuracyForLocationPrompt(promptContent: string): number {
  const content = (promptContent ?? "").toLowerCase();
  const isNearbyServicesPrompt =
    // Sinal robusto: o picker de localização da jornada de SERVIÇOS sempre carrega o
    // marcador de progresso de serviços, independentemente do texto exato do prompt
    // (evita regressão quando a frase do assistente muda).
    content.includes("[collection_progress:services:") ||
    content.includes("buscar serviços próximos") ||
    content.includes("buscar servicos proximos") ||
    content.includes("informar sua localização para buscar") ||
    content.includes("informar sua localizacao para buscar");
  return isNearbyServicesPrompt ? MAX_GPS_ACCURACY_NEARBY_UI_METERS : MAX_GPS_ACCURACY_METERS;
}
