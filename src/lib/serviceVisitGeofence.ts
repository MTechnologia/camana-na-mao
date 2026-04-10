/** Raio de geofence para visita a equipamento público (alinhado a useVisitDetection / detect-service-visit). */
export const SERVICE_VISIT_GEOFENCE_RADIUS_M = 50;

/**
 * Distância em metros entre dois pontos WGS84 (Haversine).
 */
export function serviceVisitDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6_371_000;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(Δφ / 2) ** 2 +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/** True se a distância indica saída do geofence (deve registrar departed_at). */
export function isOutsideServiceVisitGeofence(distanceMeters: number): boolean {
  return distanceMeters > SERVICE_VISIT_GEOFENCE_RADIUS_M;
}
