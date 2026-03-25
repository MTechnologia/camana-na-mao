import type { NearbyService } from "@/hooks/useNearbyServices";

const metersToDegrees = (meters: number) => meters / 111_320;

/** Bounding box em graus aproximada para um raio em metros (centro WGS84). */
export function getBoundingBoxForRadiusMeters(lat: number, lng: number, radius: number) {
  const latDelta = metersToDegrees(radius);
  const lngDeltaRaw = metersToDegrees(radius) / Math.cos((lat * Math.PI) / 180);
  const lngDelta = Number.isFinite(lngDeltaRaw) ? lngDeltaRaw : latDelta;
  return {
    minLat: lat - latDelta,
    maxLat: lat + latDelta,
    minLng: lng - lngDelta,
    maxLng: lng + lngDelta,
  };
}

const parseNumber = (value: unknown): number | null => {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const isValidCoordinate = (value: unknown): value is number =>
  typeof value === "number" && !Number.isNaN(value) && Number.isFinite(value);

const haversineMeters = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371000;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/** Converte linha do Supabase (public_services) em NearbyService com distância ao ponto de referência. */
export function mapPublicServiceRowToNearbyService(
  raw: Record<string, unknown>,
  refLat: number,
  refLng: number,
): NearbyService | null {
  const id = String(raw.id ?? "").trim();
  if (!id) return null;
  const lat = parseNumber(raw.latitude);
  const lng = parseNumber(raw.longitude);
  if (!isValidCoordinate(lat) || !isValidCoordinate(lng)) return null;
  return {
    id,
    name: String(raw.name ?? ""),
    service_type: String(raw.service_type ?? "other"),
    address: String(raw.address ?? ""),
    district: String(raw.district ?? ""),
    latitude: lat,
    longitude: lng,
    phone: (raw.phone as string | null) ?? null,
    average_rating: parseNumber(raw.average_rating) ?? 0,
    total_ratings: parseNumber(raw.total_ratings) ?? 0,
    distance: haversineMeters(refLat, refLng, lat, lng),
    opening_hours: (raw.opening_hours as NearbyService["opening_hours"]) ?? null,
    services_offered: (raw.services_offered as string | null) ?? null,
    operational_status: (raw.operational_status as NearbyService["operational_status"]) ?? null,
  };
}
