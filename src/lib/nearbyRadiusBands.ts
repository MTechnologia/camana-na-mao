/**
 * Raio "Perto de você" sem filtro de tipo: faixas em anel (não disco 0–R),
 * para distribuir equipamentos por distância. Com filtro de tipo: disco 0–R.
 */
export const NEARBY_RADIUS_PRESETS = [500, 1000, 2000, 5000] as const;
export type NearbyRadiusPreset = (typeof NEARBY_RADIUS_PRESETS)[number];

export function clampNearbyRadiusMeters(m: number): NearbyRadiusPreset {
  const allowed = [...NEARBY_RADIUS_PRESETS];
  if (m <= allowed[0]) return allowed[0];
  if (m >= allowed[allowed.length - 1]) return allowed[allowed.length - 1];
  return allowed.reduce((prev, cur) =>
    Math.abs(cur - m) < Math.abs(prev - m) ? cur : prev,
  allowed[0]);
}

/**
 * @param presetMeters valor do preset (500, 1000, 2000 ou 5000)
 * @param hasTypeFilter se true, intervalo [0, preset]; se false, faixa em anel conforme regra de produto
 */
export function getNearbyDistanceBand(
  presetMeters: number,
  hasTypeFilter: boolean,
): { min: number; max: number } {
  if (hasTypeFilter) {
    return { min: 0, max: presetMeters };
  }
  switch (presetMeters) {
    case 500:
      return { min: 0, max: 500 };
    case 1000:
      return { min: 501, max: 1000 };
    case 2000:
      return { min: 1100, max: 2000 };
    case 5000:
      return { min: 2100, max: 5000 };
    default:
      return { min: 0, max: clampNearbyRadiusMeters(presetMeters) };
  }
}

/** Texto curto quando não há filtro de tipo (faixa em anel) */
export function nearbyBandHint(presetMeters: number): string {
  switch (presetMeters) {
    case 500:
      return "Mostrando equipamentos entre 0 e 500 m";
    case 1000:
      return "Mostrando equipamentos entre 501 m e 1 km";
    case 2000:
      return "Mostrando equipamentos entre 1,1 km e 2 km";
    case 5000:
      return "Mostrando equipamentos entre 2,1 km e 5 km";
    default:
      return "";
  }
}
