/**
 * Reverse geocode no cliente (Google Geocoding API).
 * Mesma API usada em useReverseGeocodeForServices; requer VITE_GOOGLE_MAPS_API_KEY.
 */
export async function reverseGeocodeLatLngClient(lat: number, lng: number): Promise<string | null> {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;
  if (!apiKey?.trim() || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}&language=pt-BR`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    if (data.status === "OK" && data.results?.[0]?.formatted_address) {
      return String(data.results[0].formatted_address).trim();
    }
    return null;
  } catch {
    return null;
  }
}
