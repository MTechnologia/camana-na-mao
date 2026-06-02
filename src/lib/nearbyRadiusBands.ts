/**
 * Presets do slider: cada um corresponde a uma faixa em anel (Haversine), não disco cumulativo.
 */
export const NEARBY_RADIUS_PRESETS = [500, 1000, 2000, 5000] as const;
export type NearbyRadiusPreset = (typeof NEARBY_RADIUS_PRESETS)[number];

export function clampNearbyRadiusMeters(m: number): NearbyRadiusPreset {
  const allowed = [...NEARBY_RADIUS_PRESETS];
  if (m <= allowed[0]) return allowed[0];
  if (m >= allowed[allowed.length - 1]) return allowed[allowed.length - 1];
  return allowed.reduce(
    (prev, cur) => (Math.abs(cur - m) < Math.abs(prev - m) ? cur : prev),
    allowed[0],
  );
}

/**
 * Faixa de distância (m) para o preset ativo.
 * @param _hasTypeFilter mantido por compatibilidade de assinatura (faixa é a mesma com ou sem filtro de tipo)
 */
export function getNearbyDistanceBand(
  presetMeters: number,
  _hasTypeFilter?: boolean,
): { min: number; max: number } {
  const r = clampNearbyRadiusMeters(presetMeters);
  switch (r) {
    case 500:
      return { min: 0, max: 500 };
    case 1000:
      return { min: 501, max: 1000 };
    case 2000:
      return { min: 1100, max: 2000 };
    case 5000:
      return { min: 2100, max: 5000 };
    default:
      return { min: 0, max: r };
  }
}

/** Texto curto para a faixa ativa (anel). */
export function nearbyBandHint(presetMeters: number): string {
  switch (clampNearbyRadiusMeters(presetMeters)) {
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
