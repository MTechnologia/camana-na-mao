import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface NearbyService {
  id: string;
  name: string;
  service_type: string;
  address: string;
  district: string;
  latitude: number;
  longitude: number;
  phone: string | null;
  average_rating: number;
  total_ratings: number;
  distance?: number;
  opening_hours: { text?: string } | string | null;
  services_offered: string | null;
}

type ServiceType = "ubs" | "school" | "ceu" | "hospital" | "library" | "sports_center" | "street_market"
  | "community_center" | "daycare" | "park" | "social_assistance" | "police_station" | "transit_station"
  | "market" | "city_market" | "theater" | "museum" | "cemetery" | "other" | "all";

interface UseNearbyServicesProps {
  latitude: number | null;
  longitude: number | null;
  radiusMeters?: number;
  serviceType?: ServiceType;
}

// Coordenadas padrão: Praça da Sé, centro de São Paulo
const CENTRO_SP = { lat: -23.5505, lng: -46.6333 };

// Haversine: distância em linha reta (não é a distância da rota a pé/carro). A UI exibe "(em linha reta)" para evitar confusão com o Maps.
const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371000; // Earth's radius in meters
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

// Verificação robusta de coordenada válida
const isValidCoordinate = (value: unknown): value is number => {
  return typeof value === 'number' && !isNaN(value) && isFinite(value);
};

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

const metersToDegrees = (meters: number) => meters / 111_320;

const getBoundingBox = (lat: number, lng: number, radius: number) => {
  const latDelta = metersToDegrees(radius);
  const lngDeltaRaw = metersToDegrees(radius) / Math.cos((lat * Math.PI) / 180);
  const lngDelta = Number.isFinite(lngDeltaRaw) ? lngDeltaRaw : latDelta;

  return {
    minLat: lat - latDelta,
    maxLat: lat + latDelta,
    minLng: lng - lngDelta,
    maxLng: lng + lngDelta,
  };
};

/** Chave de localização para deduplicar serviços no mesmo ponto (evita cards repetidos). */
const locationKey = (lat: number, lng: number, decimals = 5) =>
  `${Number(lat.toFixed(decimals))},${Number(lng.toFixed(decimals))}`;

export const useNearbyServices = ({
  latitude,
  longitude,
  radiusMeters = 5000,
  serviceType,
}: UseNearbyServicesProps) => {
  // useRef para manter última localização válida e evitar recálculos desnecessários
  const lastValidLocation = useRef({ lat: CENTRO_SP.lat, lng: CENTRO_SP.lng });

  const [services, setServices] = useState<NearbyService[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Atualizar ref apenas se receber localização válida
  if (isValidCoordinate(latitude) && isValidCoordinate(longitude)) {
    lastValidLocation.current = { lat: latitude, lng: longitude };
  }

  const fetchServices = useCallback(async () => {
    const userLat = lastValidLocation.current.lat;
    const userLng = lastValidLocation.current.lng;

    if (!isValidCoordinate(userLat) || !isValidCoordinate(userLng)) {
      setServices([]);
      setError("Localização inválida para buscar serviços.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const safeRadius = Math.max(radiusMeters, 100);
      const { minLat, maxLat, minLng, maxLng } = getBoundingBox(
        userLat,
        userLng,
        safeRadius
      );

      const isAllTypes = !serviceType || serviceType === "all";
      const limit = isAllTypes ? 800 : 200;

      let query = supabase
        .from("public_services")
        .select(
          "id, name, service_type, address, district, latitude, longitude, phone, average_rating, total_ratings, opening_hours, services_offered"
        )
        .gte("latitude", minLat)
        .lte("latitude", maxLat)
        .gte("longitude", minLng)
        .lte("longitude", maxLng)
        .limit(limit);

      if (serviceType && serviceType !== "all") {
        query = query.eq("service_type", serviceType as any);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) {
        throw fetchError;
      }

      const formatted = (data || [])
        .map((service) => {
          const lat = parseNumber(service.latitude);
          const lng = parseNumber(service.longitude);

          if (!isValidCoordinate(lat) || !isValidCoordinate(lng)) {
            return null;
          }

          return {
            id: service.id,
            name: service.name,
            service_type: service.service_type,
            address: service.address,
            district: service.district,
            latitude: lat,
            longitude: lng,
            phone: service.phone ?? null,
            average_rating: service.average_rating ?? 0,
            total_ratings: service.total_ratings ?? 0,
            distance: calculateDistance(userLat, userLng, lat, lng),
            opening_hours: service.opening_hours ?? null,
            services_offered: service.services_offered ?? null,
          } as NearbyService;
        })
        .filter((service): service is NearbyService => service !== null);

      const withinRadius = formatted
        .filter((service) => (service.distance ?? 0) <= safeRadius)
        .sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0));

      // Um serviço por localização (evita duplicados no mesmo ponto)
      const seen = new Set<string>();
      const deduped = withinRadius.filter((s) => {
        const key = locationKey(s.latitude, s.longitude);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      setServices(deduped.slice(0, 200));
    } catch (fetchError) {
      console.error("Error fetching nearby services:", fetchError);
      setServices([]);
      setError("Erro ao buscar serviços próximos.");
    } finally {
      setLoading(false);
    }
  }, [radiusMeters, serviceType]);

  useEffect(() => {
    fetchServices();
  }, [fetchServices, latitude, longitude]);

  return {
    services,
    loading,
    error,
    refetch: fetchServices,
  };
};
