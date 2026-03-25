import { useState, useEffect, useRef } from "react";
import { useLoadGoogleMaps } from "@/hooks/useLoadGoogleMaps";

/** Máximo de destinos por request (Routes API: até 25 destinos com 1 origem). */
const MAX_DESTINATIONS_PER_REQUEST = 25;
/** Requisições em paralelo (antes sequenciais: N chunks × latência ≈ vários segundos). */
const ROUTE_MATRIX_CONCURRENCY = 4;

interface ServiceWithCoords {
  id: string;
  longitude: number;
  latitude: number;
  distance?: number;
}

export type RoutingProfile = "walking" | "driving";

/**
 * Obtém distâncias reais por rota via Routes API (RouteMatrix.computeRouteMatrix).
 * Substitui a API legada Distance Matrix, que está em depreciação e exige habilitação separada.
 * Para raios maiores use profile "driving"; para 500m/1km use "walking".
 * Retorna um mapa serviceId -> distância em metros; se falhar ou não houver chave, retorna null.
 */
export function useGoogleDistanceMatrix(
  userLocation: { latitude: number; longitude: number } | null,
  services: ServiceWithCoords[],
  apiKey: string | undefined,
  profile: RoutingProfile = "walking"
): { walkingDistances: Map<string, number> | null; loading: boolean; error: string | null } {
  const [walkingDistances, setWalkingDistances] = useState<Map<string, number> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const { isLoaded: mapsLoaded, error: mapsError } = useLoadGoogleMaps(apiKey);

  useEffect(() => {
    if (!userLocation || !apiKey || services.length === 0) {
      setWalkingDistances(null);
      setLoading(false);
      setError(null);
      return;
    }

    if (!mapsLoaded || !window.google?.maps) {
      setLoading(!!apiKey);
      setError(mapsError ?? null);
      return;
    }

    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError(null);

    const travelMode =
      profile === "driving"
        ? "DRIVING"
        : "WALKING";

    const chunks: ServiceWithCoords[][] = [];
    for (let i = 0; i < services.length; i += MAX_DESTINATIONS_PER_REQUEST) {
      chunks.push(services.slice(i, i + MAX_DESTINATIONS_PER_REQUEST));
    }

    const results = new Map<string, number>();

    const runChunks = async () => {
      try {
        const { RouteMatrix } = (await google.maps.importLibrary(
          "routes"
        )) as google.maps.RoutesLibrary;

        const origin = { lat: userLocation.latitude, lng: userLocation.longitude };

        for (let batchStart = 0; batchStart < chunks.length; batchStart += ROUTE_MATRIX_CONCURRENCY) {
          if (requestIdRef.current !== requestId) return;

          const batch = chunks.slice(batchStart, batchStart + ROUTE_MATRIX_CONCURRENCY);

          await Promise.all(
            batch.map(async (chunk) => {
              const destinations = chunk.map((s) => ({ lat: s.latitude, lng: s.longitude }));

              const { matrix } = await RouteMatrix.computeRouteMatrix({
                origins: [origin],
                destinations,
                travelMode: travelMode as google.maps.TravelMode,
                fields: ["distanceMeters", "durationMillis", "condition"],
              });

              if (requestIdRef.current !== requestId) return;

              const row = matrix.rows?.[0];
              if (row?.items) {
                row.items.forEach((item, i) => {
                  const s = chunk[i];
                  const dist = item.distanceMeters;
                  const ok =
                    item.condition === "ROUTE_EXISTS" ||
                    (dist != null && !item.error);
                  if (s && dist != null && Number.isFinite(dist) && ok) {
                    results.set(s.id, Math.round(dist));
                  }
                });
              }
            })
          );
        }

        if (requestIdRef.current !== requestId) return;
        setWalkingDistances(results.size > 0 ? results : null);
        setError(null);
        setLoading(false);
      } catch (err) {
        if (requestIdRef.current !== requestId) return;
        const msg =
          err instanceof Error ? err.message : "Erro ao buscar distâncias";
        const status =
          err && typeof err === "object" && "status" in err
            ? (err as { status?: number }).status
            : null;
        const is403 =
          status === 403 ||
          msg.includes("403") ||
          msg.includes("Forbidden");
        const isDenied =
          is403 ||
          msg.includes("not enabled") ||
          msg.includes("REQUEST_DENIED") ||
          msg.includes("permission") ||
          msg.includes("Legacy");
        setError(
          isDenied
            ? "Routes API retornou acesso negado (403). Habilite a Routes API no GCP, inclua-a na restrição da chave e verifique se o billing está ativo no projeto."
            : msg
        );
        setLoading(false);
      }
    };

    void runChunks();
  }, [
    userLocation?.latitude,
    userLocation?.longitude,
    apiKey,
    services,
    profile,
    mapsLoaded,
    mapsError,
  ]);

  return { walkingDistances, loading, error };
}
