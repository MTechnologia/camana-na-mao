import { useEffect, useState, useRef } from "react";

/** Serviço com coordenadas para consulta à Distance Matrix. */
export interface ServiceWithCoords {
  id: string;
  latitude: number;
  longitude: number;
  distance?: number;
  [key: string]: unknown;
}

const DESTINATIONS_PER_REQUEST = 25;

declare global {
  interface Window {
    google?: {
      maps: {
        TravelMode: { WALKING: string };
        UnitSystem: { METRIC: number };
        DistanceMatrixService: new () => {
          getDistanceMatrix: (
            request: {
              origins: { lat: () => number; lng: () => number }[] | { lat: number; lng: number }[];
              destinations:
                | { lat: () => number; lng: () => number }[]
                | { lat: number; lng: number }[];
              travelMode: string;
              unitSystem?: number;
            },
            callback: (
              response: {
                rows: { elements: { distance?: { value: number }; status: string }[] }[];
              },
              status: string,
            ) => void,
          ) => void;
        };
      };
    };
  }
}

/**
 * Preenche distância real a pé (Google Distance Matrix, modo WALKING) para uma lista de serviços.
 * Faz requisições em lotes de 25 destinos. Enquanto a API não responde, mantém a distância em linha reta.
 * Requer: Google Maps JS carregado (mesma chave do mapa) e Distance Matrix API habilitada no projeto.
 */
export function useWalkingDistances<T extends ServiceWithCoords>(
  services: T[],
  userLocation: { latitude: number; longitude: number } | null,
  options: { enabled?: boolean } = {},
): { servicesWithWalkingDistance: T[]; loading: boolean } {
  const { enabled = true } = options;
  const [distances, setDistances] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const abortRef = useRef(false);

  useEffect(() => {
    if (
      !enabled ||
      !userLocation ||
      services.length === 0 ||
      !window.google?.maps?.DistanceMatrixService
    ) {
      setDistances({});
      setLoading(false);
      return;
    }

    abortRef.current = false;
    setLoading(true);

    const origin = new window.google.maps.LatLng(userLocation.latitude, userLocation.longitude);
    const chunks: T[][] = [];
    for (let i = 0; i < services.length; i += DESTINATIONS_PER_REQUEST) {
      chunks.push(services.slice(i, i + DESTINATIONS_PER_REQUEST));
    }

    const allResults: Record<string, number> = {};
    let pending = chunks.length;

    const onDone = () => {
      if (--pending === 0 && !abortRef.current) {
        setDistances((prev) => ({ ...prev, ...allResults }));
        setLoading(false);
      }
    };

    chunks.forEach((chunk) => {
      const destinations = chunk.map(
        (s) => new window.google!.maps.LatLng(s.latitude, s.longitude),
      );
      const service = new window.google.maps.DistanceMatrixService();
      service.getDistanceMatrix(
        {
          origins: [origin],
          destinations,
          travelMode: window.google.maps.TravelMode.WALKING,
          unitSystem: window.google.maps.UnitSystem.METRIC,
        },
        (response, status) => {
          if (abortRef.current) {
            onDone();
            return;
          }
          if (status === "OK" && response?.rows?.[0]?.elements) {
            response.rows[0].elements.forEach((el, i) => {
              const serviceId = chunk[i]?.id;
              if (serviceId && el.status === "OK" && el.distance?.value != null) {
                allResults[serviceId] = el.distance.value;
              }
            });
          }
          onDone();
        },
      );
    });

    return () => {
      abortRef.current = true;
    };
  }, [enabled, userLocation?.latitude, userLocation?.longitude, services]);

  const servicesWithWalkingDistance: T[] = services.map((s) => {
    const walkingM = distances[s.id];
    if (walkingM != null) {
      return { ...s, distance: walkingM };
    }
    return s;
  });

  return { servicesWithWalkingDistance, loading };
}
