import type { ZonaVolumeOuDesconhecida } from "@/lib/regionMapping";

/**
 * HU-4.1 — Centroides aproximados das zonas de São Paulo.
 *
 * Usado para gerar coordenadas em transport_reports (que não têm lat/lng), de
 * forma a permitir representação no mapa de calor. A precisão é deliberadamente
 * baixa — pontos da mesma zona caem todos no centro dela. Para o objetivo de
 * "densidade de uso por região", isso atende.
 *
 * Coordenadas: extraídas do centroide aproximado do polígono de cada zona da
 * subprefeitura, conforme bibliografia GeoSampa.
 */
export const SP_ZONE_CENTROIDS: Record<string, { lat: number; lng: number }> = {
  Centro: { lat: -23.5475, lng: -46.6361 },
  "Zona Norte": { lat: -23.4814, lng: -46.6308 },
  "Zona Sul": { lat: -23.6489, lng: -46.7 },
  "Zona Leste": { lat: -23.5505, lng: -46.4861 },
  "Zona Oeste": { lat: -23.5705, lng: -46.7286 },
};

/**
 * Retorna lat/lng do centroide da zona, ou null se a zona for desconhecida.
 */
export function centroidForZone(
  zone: ZonaVolumeOuDesconhecida | string | null | undefined,
): { lat: number; lng: number } | null {
  if (!zone) return null;
  return SP_ZONE_CENTROIDS[String(zone)] ?? null;
}
