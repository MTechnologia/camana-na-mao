/**
 * Mapeamento de região para o módulo de Analytics de Relatos (HU-1.1, HU-3.1).
 *
 * Estratégia de classificação por zona da cidade, em ordem de prioridade:
 *   1. Coordenadas geográficas (lat/lng) via point-in-bounding-box — mais
 *      preciso, recomendado quando o relato tem coords (urban_reports e
 *      public_services tipicamente têm).
 *   2. Keywords no texto livre do bairro/local (compartilhadas com
 *      `audienciaZonas.ts`).
 *   3. "Não informada" como fallback final — preferimos sinalizar a ausência
 *      de classificação a forçar o registro para Centro (default antigo).
 */

import { ZONAS_SAO_PAULO, type ZonaSP, localParaZonaOuNull } from "@/lib/audienciaZonas";
import { coordinatesToZone } from "@/lib/spZonePolygons";

export const ZONAS_VOLUME = ZONAS_SAO_PAULO;
export type ZonaVolume = ZonaSP;

/**
 * Sentinel value used when nenhum texto de localização foi informado em um
 * relato OU as coordenadas estão fora do município de SP. Mantemos um bucket
 * próprio para não mascarar a cobertura real dos dados — caso esse bucket
 * fique grande, há sinal de qualidade de dados.
 */
export const ZONA_DESCONHECIDA = "Não informada" as const;

export type ZonaVolumeOuDesconhecida = ZonaVolume | typeof ZONA_DESCONHECIDA;

/**
 * Resolve a zona de SP combinando coordenadas (preferencial) e texto livre
 * de bairro/local. Retorna `ZONA_DESCONHECIDA` quando nada bate.
 *
 * @param texto Bairro, endereço ou texto livre de localização.
 * @param lat Latitude do relato (opcional). Se fornecida, tem prioridade.
 * @param lng Longitude do relato (opcional). Necessária junto com `lat`.
 */
/** Normaliza lat/lng vindos do banco (string, sinal invertido ou eixos trocados). */
export function normalizeReportCoordinates(
  lat: number | string | null | undefined,
  lng: number | string | null | undefined,
): { lat: number | null; lng: number | null } {
  const la = lat == null || lat === "" ? NaN : Number(lat);
  const lo = lng == null || lng === "" ? NaN : Number(lng);
  if (!Number.isFinite(la) || !Number.isFinite(lo)) {
    return { lat: null, lng: null };
  }
  let normLat = la;
  let normLng = lo;
  if (normLat > 0) normLat = -normLat;
  if (normLng > 0 && Math.abs(normLat) < 10) {
    normLng = normLng > 0 ? -normLng : normLng;
  }
  // latitude no campo longitude (comum em APIs que retornam lng,lat)
  if (Math.abs(normLat) > 10 && Math.abs(normLng) < 10) {
    const swappedLat = normLng > 0 ? -normLng : normLng;
    const swappedLng = normLat;
    normLat = swappedLat;
    normLng = swappedLng;
  }
  return { lat: normLat, lng: normLng };
}

export function bairroParaZona(
  texto: string | null | undefined,
  lat?: number | string | null,
  lng?: number | string | null,
): ZonaVolumeOuDesconhecida {
  const { lat: normLat, lng: normLng } = normalizeReportCoordinates(lat, lng);
  // 1) Geolocalização tem prioridade — mais precisa
  if (normLat != null && normLng != null) {
    const fromCoords = coordinatesToZone(normLat, normLng);
    if (fromCoords) return fromCoords;
  }

  // 2) Keywords no texto livre
  const fromText = localParaZonaOuNull(texto);
  if (fromText) return fromText;

  // 3) Não informada
  return ZONA_DESCONHECIDA;
}

/**
 * Lista canônica de zonas a serem exibidas em filtros, na ordem desejada.
 */
export const ZONAS_FILTRO: readonly ZonaVolumeOuDesconhecida[] = [
  ...ZONAS_SAO_PAULO,
  ZONA_DESCONHECIDA,
] as const;
