/**
 * Reverse geocode no cliente (Google Geocoding API): GPS → endereço legível.
 * Usado pelo chat (InlineLocationMethodPicker) e por useReverseGeocodeForServices (Perto de você).
 * Cache em memória compartilhado por coordenada arredondada. Requer VITE_GOOGLE_MAPS_API_KEY.
 */

import { getGoogleMapsApiKey } from "@/lib/googleMapsKey";

const cache = new Map<string, string>();

const roundCoord = (v: number, decimals = 5) => Number(v.toFixed(decimals));

/** Chave de cache alinhada ao hook de serviços próximos. */
export function reverseGeocodeClientCacheKey(lat: number, lng: number): string {
  return `${roundCoord(lat)},${roundCoord(lng)}`;
}

/** Endereço já resolvido para o par lat/lng (evita nova chamada à API). */
export function getCachedReverseGeocodeClient(lat: number, lng: number): string | undefined {
  return cache.get(reverseGeocodeClientCacheKey(lat, lng));
}

/**
 * @param apiKeyOverride — opcional (ex.: hook com options.apiKey); senão usa getGoogleMapsApiKey().
 */
export async function reverseGeocodeLatLngClient(
  lat: number,
  lng: number,
  apiKeyOverride?: string
): Promise<string | null> {
  const apiKey = (apiKeyOverride ?? getGoogleMapsApiKey())?.trim();
  if (!apiKey || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const key = reverseGeocodeClientCacheKey(lat, lng);
  if (cache.has(key)) return cache.get(key)!;

  const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${encodeURIComponent(apiKey)}&language=pt-BR`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    if (data.status === "OK" && data.results?.[0]?.formatted_address) {
      const addr = String(data.results[0].formatted_address).trim();
      if (addr) {
        cache.set(key, addr);
        return addr;
      }
    }
    if (import.meta.env.DEV && data.status && data.status !== "ZERO_RESULTS") {
      console.warn("[reverseGeocodeLatLngClient]", data.status, data.error_message ?? "");
    }
    return null;
  } catch (e) {
    if (import.meta.env.DEV) console.warn("[reverseGeocodeLatLngClient] request failed", e);
    return null;
  }
}
