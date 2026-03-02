import { useState, useEffect, useRef } from "react";

/** Máximo de destinos por request (Mapbox: 25 coordenadas totais = 1 origem + 24 destinos). */
const MAX_DESTINATIONS_PER_REQUEST = 24;

interface ServiceWithCoords {
  id: string;
  longitude: number;
  latitude: number;
  distance?: number;
}

interface MatrixResponse {
  code: string;
  durations?: number[][];
  distances?: number[][];
}

export type RoutingProfile = "walking" | "driving";

/**
 * Obtém distâncias reais por rota (Mapbox Matrix API): a pé ou de carro.
 * Para raios 5km/10km use profile "driving"; para 500m/1km use "walking".
 * Retorna um mapa serviceId -> distância em metros; se a API falhar ou não houver token, retorna null (use Haversine).
 */
export function useWalkingDistancesMatrix(
  userLocation: { latitude: number; longitude: number } | null,
  services: ServiceWithCoords[],
  mapboxToken: string | null,
  profile: RoutingProfile = "walking"
): { walkingDistances: Map<string, number> | null; loading: boolean; error: string | null } {
  const [walkingDistances, setWalkingDistances] = useState<Map<string, number> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (!userLocation || !mapboxToken || services.length === 0) {
      setWalkingDistances(null);
      setLoading(false);
      setError(null);
      return;
    }

    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError(null);

    const { latitude: userLat, longitude: userLng } = userLocation;
    const mapboxProfile = profile === "driving" ? "mapbox/driving" : "mapbox/walking";

    async function fetchMatrix() {
      const results = new Map<string, number>();

      const chunks: ServiceWithCoords[][] = [];
      for (let i = 0; i < services.length; i += MAX_DESTINATIONS_PER_REQUEST) {
        chunks.push(services.slice(i, i + MAX_DESTINATIONS_PER_REQUEST));
      }

      for (const chunk of chunks) {
        if (requestIdRef.current !== requestId) return;

        // Mapbox Matrix exige mínimo 2 elementos (1 origem × 2 destinos). 1×1 retorna 422.
        const dests = chunk.length >= 2 ? chunk : [chunk[0], { id: "__origin__", longitude: userLng, latitude: userLat } as ServiceWithCoords];
        const destList = chunk.length >= 2 ? chunk : dests;

        const coords = [
          [userLng, userLat],
          ...destList.map((s) => [s.longitude, s.latitude] as [number, number]),
        ];
        const coordinates = coords.map(([lng, lat]) => `${lng},${lat}`).join(";");
        const sources = "0";
        const destinations = destList.map((_, i) => i + 1).join(";");
        const url = `https://api.mapbox.com/directions-matrix/v1/${mapboxProfile}/${coordinates}?sources=${sources}&destinations=${destinations}&annotations=distance,duration&access_token=${mapboxToken}`;

        try {
          const response = await fetch(url);
          if (!response.ok) {
            const errText = await response.text();
            throw new Error(errText || `HTTP ${response.status}`);
          }
          const data: MatrixResponse = await response.json();
          if (data.code !== "Ok" || !data.distances?.[0]) continue;

          data.distances[0].forEach((meters, i) => {
            const service = chunk[i];
            if (service && typeof meters === "number" && Number.isFinite(meters)) {
              results.set(service.id, Math.round(meters));
            }
          });
        } catch (err) {
          if (requestIdRef.current === requestId) {
            setError(err instanceof Error ? err.message : `Erro ao buscar distâncias (${profile === "driving" ? "carro" : "a pé"})`);
          }
          return;
        }
      }

      if (requestIdRef.current === requestId) {
        setWalkingDistances(results.size > 0 ? results : null);
        setError(null);
      }
    }

    fetchMatrix().finally(() => {
      if (requestIdRef.current === requestId) setLoading(false);
    });
  }, [userLocation?.latitude, userLocation?.longitude, mapboxToken, services, profile]);

  return { walkingDistances, loading, error };
}
