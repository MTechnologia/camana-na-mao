import { useEffect, useState, useMemo } from "react";
import {
  reverseGeocodeLatLngClient,
  reverseGeocodeClientCacheKey,
  getCachedReverseGeocodeClient,
} from "@/lib/reverseGeocodeLatLngClient";

const cacheKey = reverseGeocodeClientCacheKey;

const isAddressMissing = (address: string | undefined | null): boolean => {
  const a = (address ?? "").trim();
  if (!a) return true;
  return /endere[cç]o\s*n[aã]o\s*informado/i.test(a);
};

export interface ServiceForGeocode {
  id: string;
  latitude: number;
  longitude: number;
  address?: string | null;
}

/**
 * Para cada serviço com coordenadas mas sem endereço válido, faz reverse geocode
 * (Google Geocoding API) e retorna um mapa id -> endereço formatado.
 * Usa o mesmo cache que o chat (GPS → endereço) e throttle para não estourar cota.
 */
export function useReverseGeocodeForServices(
  services: ServiceForGeocode[],
  options?: { apiKey?: string; throttleMs?: number; maxConcurrent?: number }
): Record<string, string> {
  const [resolved, setResolved] = useState<Record<string, string>>({});
  const apiKey = options?.apiKey ?? (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined);
  const throttleMs = options?.throttleMs ?? 150;
  const maxConcurrent = options?.maxConcurrent ?? 3;

  const servicesSignature = useMemo(
    () =>
      services
        .filter(
          (s) =>
            typeof s.latitude === "number" &&
            typeof s.longitude === "number" &&
            isAddressMissing(s.address)
        )
        .map((s) => `${s.id}:${cacheKey(s.latitude, s.longitude)}`)
        .sort()
        .join("|"),
    [services]
  );

  useEffect(() => {
    const hasKey = !!(apiKey && apiKey.trim());
    const toFetch = services.filter(
      (s) =>
        typeof s.latitude === "number" &&
        typeof s.longitude === "number" &&
        isAddressMissing(s.address)
    );

    if (import.meta.env.DEV) {
      console.log("[Geocoding] Chave presente:", hasKey, "| Serviços sem endereço:", toFetch.length, "| Total serviços:", services.length);
    }

    if (!hasKey) {
      if (import.meta.env.DEV && toFetch.length > 0)
        console.warn("[Geocoding] Chave da API não configurada (VITE_GOOGLE_MAPS_API_KEY). Reinicie o servidor (npm run dev) após conferir o .env.");
      return;
    }

    if (toFetch.length === 0) {
      setResolved({});
      return;
    }

    let cancelled = false;
    const keyToIds = new Map<string, string[]>();
    toFetch.forEach((s) => {
      const key = cacheKey(s.latitude, s.longitude);
      if (!keyToIds.has(key)) keyToIds.set(key, []);
      keyToIds.get(key)!.push(s.id);
    });

    const keysToResolve = Array.from(keyToIds.keys()).filter((k) => {
      const [lat, lng] = k.split(",").map(Number);
      return !getCachedReverseGeocodeClient(lat, lng);
    });

    if (keysToResolve.length === 0) {
      const initial: Record<string, string> = {};
      toFetch.forEach((s) => {
        const addr = getCachedReverseGeocodeClient(s.latitude, s.longitude);
        if (addr) initial[s.id] = addr;
      });
      if (!cancelled) setResolved(initial);
      return;
    }

    if (import.meta.env.DEV)
      console.log("[Geocoding] Resolvendo endereços para", keysToResolve.length, "coordenada(s). Requisições em maps.googleapis.com");

    const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

    (async () => {
      const next: Record<string, string> = {};
      toFetch.forEach((s) => {
        const addr = getCachedReverseGeocodeClient(s.latitude, s.longitude);
        if (addr) next[s.id] = addr;
      });
      if (Object.keys(next).length > 0 && !cancelled) setResolved((prev) => ({ ...prev, ...next }));

      for (let i = 0; i < keysToResolve.length && !cancelled; i += maxConcurrent) {
        const batch = keysToResolve.slice(i, i + maxConcurrent);
        const results = await Promise.all(
          batch.map((key) => {
            const [lat, lng] = key.split(",").map(Number);
            return reverseGeocodeLatLngClient(lat, lng, apiKey);
          })
        );

        batch.forEach((key, idx) => {
          const addr = results[idx];
          if (addr) {
            keyToIds.get(key)?.forEach((id) => (next[id] = addr));
          }
        });

        if (!cancelled) setResolved((prev) => ({ ...prev, ...next }));
        if (i + maxConcurrent < keysToResolve.length) await delay(throttleMs);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [apiKey, throttleMs, maxConcurrent, servicesSignature, services.length]);

  return resolved;
}
