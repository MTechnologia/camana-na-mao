import { useState, useEffect, useRef } from "react";
import { useLoadGoogleMaps } from "@/hooks/useLoadGoogleMaps";
import { supabase } from "@/integrations/supabase/client";

/** Máximo de destinos por request (Routes API: até 25 destinos com 1 origem). */
const MAX_DESTINATIONS_PER_REQUEST = 25;
/** Limite total de destinos por execução para reduzir custo de matrix. */
const MAX_DESTINATIONS_TOTAL = 50;
/** Requisições em paralelo (antes sequenciais: N chunks × latência ≈ vários segundos). */
const ROUTE_MATRIX_CONCURRENCY = 4;
/** TTL de cache em memória para evitar recomputar mesmos destinos/origem. */
const ROUTE_CACHE_TTL_MS = 10 * 60 * 1000;

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
  profile: RoutingProfile = "walking",
  userId?: string,
): { walkingDistances: Map<string, number> | null; loading: boolean; error: string | null } {
  const [walkingDistances, setWalkingDistances] = useState<Map<string, number> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);
  const cacheRef = useRef<Map<string, { at: number; distances: Map<string, number> }>>(new Map());

  const insertUsageMetrics = (row: {
    context: string;
    profile: string;
    cache_hit: boolean;
    destinations_count: number;
    elements_count: number;
    chunk_requests: number;
    user_id: string | null;
    origin_lat: number | null;
    origin_lng: number | null;
  }) => {
    void supabase
      .from("routes_usage_metrics")
      .insert(row)
      .then(({ error }) => {
        if (error) {
          // Não quebrar UX do app; apenas evidenciar o problema de telemetria.
          console.warn("[routes_usage_metrics] insert failed:", error.message);
        }
      });
  };

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

    const normalizedServices = [...services]
      .sort((a, b) => a.id.localeCompare(b.id))
      .slice(0, MAX_DESTINATIONS_TOTAL);
    const destinationsCount = normalizedServices.length;
    const elementsCount = destinationsCount; // 1 origem x N destinos
    const originKey = `${userLocation.latitude.toFixed(4)},${userLocation.longitude.toFixed(4)}`;
    const destinationsKey = normalizedServices.map((s) => s.id).join(",");
    const cacheKey = `${profile}|${originKey}|${destinationsKey}`;
    const now = Date.now();
    const cached = cacheRef.current.get(cacheKey);
    if (cached && now - cached.at <= ROUTE_CACHE_TTL_MS) {
      setWalkingDistances(new Map(cached.distances));
      setError(null);
      setLoading(false);
      insertUsageMetrics({
        user_id: userId ?? null,
        context: "nearby_services",
        profile,
        cache_hit: true,
        destinations_count: destinationsCount,
        elements_count: elementsCount,
        chunk_requests: 0,
        origin_lat: userLocation.latitude,
        origin_lng: userLocation.longitude,
      });
      return;
    }

    const travelMode = profile === "driving" ? "DRIVING" : "WALKING";

    const chunks: ServiceWithCoords[][] = [];
    for (let i = 0; i < normalizedServices.length; i += MAX_DESTINATIONS_PER_REQUEST) {
      chunks.push(normalizedServices.slice(i, i + MAX_DESTINATIONS_PER_REQUEST));
    }

    const results = new Map<string, number>();

    const runChunks = async () => {
      try {
        const { RouteMatrix } = (await google.maps.importLibrary(
          "routes",
        )) as google.maps.RoutesLibrary;
        let totalChunkRequests = 0;

        const origin = { lat: userLocation.latitude, lng: userLocation.longitude };

        for (
          let batchStart = 0;
          batchStart < chunks.length;
          batchStart += ROUTE_MATRIX_CONCURRENCY
        ) {
          if (requestIdRef.current !== requestId) return;

          const batch = chunks.slice(batchStart, batchStart + ROUTE_MATRIX_CONCURRENCY);

          await Promise.all(
            batch.map(async (chunk) => {
              const destinations = chunk.map((s) => ({ lat: s.latitude, lng: s.longitude }));
              totalChunkRequests += 1;

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
                  const ok = item.condition === "ROUTE_EXISTS" || (dist != null && !item.error);
                  if (s && dist != null && Number.isFinite(dist) && ok) {
                    results.set(s.id, Math.round(dist));
                  }
                });
              }
            }),
          );
        }

        if (requestIdRef.current !== requestId) return;
        setWalkingDistances(results.size > 0 ? results : null);
        cacheRef.current.set(cacheKey, { at: Date.now(), distances: new Map(results) });
        if (cacheRef.current.size > 120) {
          const oldestKey = cacheRef.current.keys().next().value;
          if (oldestKey) cacheRef.current.delete(oldestKey);
        }
        insertUsageMetrics({
          user_id: userId ?? null,
          context: "nearby_services",
          profile,
          cache_hit: false,
          destinations_count: destinationsCount,
          elements_count: elementsCount,
          chunk_requests: totalChunkRequests,
          origin_lat: userLocation.latitude,
          origin_lng: userLocation.longitude,
        });
        setError(null);
        setLoading(false);
      } catch (err) {
        if (requestIdRef.current !== requestId) return;
        const msg = err instanceof Error ? err.message : "Erro ao buscar distâncias";
        const status =
          err && typeof err === "object" && "status" in err
            ? (err as { status?: number }).status
            : null;
        const is403 = status === 403 || msg.includes("403") || msg.includes("Forbidden");
        const isDenied =
          is403 ||
          msg.includes("not enabled") ||
          msg.includes("REQUEST_DENIED") ||
          msg.includes("permission") ||
          msg.includes("Legacy");
        setError(
          isDenied
            ? "Routes API retornou acesso negado (403). Habilite a Routes API no GCP, inclua-a na restrição da chave e verifique se o billing está ativo no projeto."
            : msg,
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
    userId,
  ]);

  return { walkingDistances, loading, error };
}
