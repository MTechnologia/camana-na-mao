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
  // O teto ESTRITO (RN04, ≤15 m) vale APENAS para relato crítico (urbano/transporte), onde
  // a localização precisa do problema importa. Para QUALQUER busca de serviços/equipamentos
  // (UBS, escolas, parques, etc.) e para rotas, 30–100 m+ é aceitável (raio em km) — teto
  // permissivo. Detecção por contexto de relato (marcador OU frase), seja o prompt do atalho
  // determinístico ou gerado pela LLM — evita regressão quando a frase muda.
  const isCriticalReportPrompt =
    content.includes("[collection_progress:urban_report") ||
    content.includes("[collection_progress:transport_report") ||
    content.includes("onde fica o problema") ||
    content.includes("onde fica o ocorrido");
  return isCriticalReportPrompt ? MAX_GPS_ACCURACY_METERS : MAX_GPS_ACCURACY_NEARBY_UI_METERS;
}
