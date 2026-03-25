import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  getNearbyServicesCache,
  saveNearbyServicesCache,
  type CachedNearbyService,
} from "@/lib/nearbyServicesCache";

export interface NearbyService {
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
  operational_status: "open" | "closed" | "maintenance" | null;
}

type ServiceType = "ubs" | "school" | "ceu" | "hospital" | "library" | "sports_center" | "street_market"
  | "community_center" | "daycare" | "park" | "market" | "city_market" | "theater" | "museum"
  | "social_assistance" | "transit_station" | "bicycle" | "subprefeitura" | "police_station" | "cemetery" | "accessibility" | "recycling_point"
  | "fire_station" | "other" | "all";

/**
 * Mínimo de caracteres para usar RPC full-text (`search_tsv`).
 * Abaixo disso: bbox + filtro no cliente (substring / endereço resolvido).
 * Com 2–3 letras o FTS em português não cobre prefixo ("Con" ≠ "Condomínio") e zerava a lista.
 */
export const NEARBY_FULLTEXT_MIN_LENGTH = 4;

interface UseNearbyServicesProps {
  latitude: number | null;
  longitude: number | null;
  radiusMeters?: number;
  /** Um único tipo (legado) ou lista de tipos. Vazio/undefined = todos */
  serviceType?: ServiceType;
  /** Múltiplos tipos (multiseleção). Vazio = todos. Tem precedência sobre serviceType */
  serviceTypes?: ServiceType[];
  /**
   * Comprimento >= NEARBY_FULLTEXT_MIN_LENGTH: usa RPC `search_public_services_fulltext` (FTS + bbox + raio).
   * Abaixo disso mantém a query por bounding box e filtro no cliente.
   */
  fullTextQuery?: string;
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

/** Categoria genérica `other` (GeoSampa) não entra na lista — reduz ruído na UI. */
const excludeGenericOtherType = <T extends { service_type: string }>(items: T[]): T[] =>
  items.filter((s) => s.service_type !== "other");

export const useNearbyServices = ({
  latitude,
  longitude,
  radiusMeters = 5000,
  serviceType,
  serviceTypes,
  fullTextQuery = "",
}: UseNearbyServicesProps) => {
  // useRef para manter última localização válida e evitar recálculos desnecessários
  const lastValidLocation = useRef({ lat: CENTRO_SP.lat, lng: CENTRO_SP.lng });

  const [services, setServices] = useState<NearbyService[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Evita que uma resposta antiga sobrescreva uma busca mais recente (digitação rápida). */
  const fetchRequestIdRef = useRef(0);

  // Atualizar ref apenas se receber localização válida
  if (isValidCoordinate(latitude) && isValidCoordinate(longitude)) {
    lastValidLocation.current = { lat: latitude, lng: longitude };
  }

  const applyCacheWithDistance = useCallback(
    (cached: CachedNearbyService[], userLat: number, userLng: number): NearbyService[] => {
      return cached.map((s) => ({
        ...s,
        distance: calculateDistance(userLat, userLng, s.latitude, s.longitude),
      }));
    },
    []
  );

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

    const safeRadius = Math.max(radiusMeters, 100);

    try {
      const cached = await getNearbyServicesCache();
      if (cached?.services?.length) {
        // Offline/cache: usar o centro salvo no cache para as distâncias, assim o filtro
        // por raio (2km, 10km) continua coerente com a região que foi buscada.
        const centerLat = cached.centerLat;
        const centerLng = cached.centerLng;
        const withDistance = excludeGenericOtherType(
          applyCacheWithDistance(cached.services, centerLat, centerLng),
        );
        setServices(withDistance);
      }
    } catch {
      // Ignore cache read errors
    }

    if (!navigator.onLine) {
      setLoading(false);
      setError("Sem conexão. Exibindo equipamentos em cache quando disponível.");
      return;
    }

    const requestId = ++fetchRequestIdRef.current;

    try {
      const { minLat, maxLat, minLng, maxLng } = getBoundingBox(
        userLat,
        userLng,
        safeRadius
      );

      const types = serviceTypes?.filter((t) => t !== "all") ?? [];
      const singleType = !serviceType || serviceType === "all" ? undefined : serviceType;
      const effectiveTypes =
        types.length > 0 ? types : singleType ? [singleType] : [];
      const isAllTypes = effectiveTypes.length === 0;
      const limit = isAllTypes ? 5000 : 800;

      const ftsTrimmed = (fullTextQuery ?? "").trim();
      const useFullTextRpc = ftsTrimmed.length >= NEARBY_FULLTEXT_MIN_LENGTH;

      let data: unknown[] | null = null;
      let fetchError: { message?: string } | null = null;

      if (useFullTextRpc) {
        const { data: rpcData, error: rpcError } = await supabase.rpc("search_public_services_fulltext", {
          min_lat: minLat,
          max_lat: maxLat,
          min_lng: minLng,
          max_lng: maxLng,
          center_lat: userLat,
          center_lng: userLng,
          radius_meters: safeRadius,
          search_query: ftsTrimmed,
          service_types: effectiveTypes.length > 0 ? effectiveTypes : null,
          result_limit: limit,
        });
        fetchError = rpcError;
        data = (rpcData ?? null) as unknown[] | null;
      } else {
        let query = supabase
          .from("public_services")
          .select(
            "id, name, service_type, address, district, latitude, longitude, phone, average_rating, total_ratings, opening_hours, services_offered, operational_status"
          )
          .gte("latitude", minLat)
          .lte("latitude", maxLat)
          .gte("longitude", minLng)
          .lte("longitude", maxLng)
          .limit(limit);

        if (effectiveTypes.length > 0) {
          query = query.in("service_type", effectiveTypes as string[]);
        } else {
          query = query.neq("service_type", "other");
        }

        const res = await query;
        fetchError = res.error;
        data = res.data as unknown[] | null;
      }

      if (fetchError) {
        throw fetchError;
      }

      const formatted = (data || [])
        .map((raw) => {
          const service = raw as Record<string, unknown>;
          const id = String(service.id ?? "").trim();
          if (!id) return null;

          const lat = parseNumber(service.latitude);
          const lng = parseNumber(service.longitude);

          if (!isValidCoordinate(lat) || !isValidCoordinate(lng)) {
            return null;
          }

          return {
            id,
            name: String(service.name ?? ""),
            service_type: String(service.service_type ?? "other"),
            address: String(service.address ?? ""),
            district: String(service.district ?? ""),
            latitude: lat,
            longitude: lng,
            phone: (service.phone as string | null) ?? null,
            average_rating: parseNumber(service.average_rating) ?? 0,
            total_ratings: parseNumber(service.total_ratings) ?? 0,
            distance: calculateDistance(userLat, userLng, lat, lng),
            opening_hours: (service.opening_hours as NearbyService["opening_hours"]) ?? null,
            services_offered: (service.services_offered as string | null) ?? null,
            operational_status: (service.operational_status as NearbyService["operational_status"]) ?? null,
          } as NearbyService;
        })
        .filter((service): service is NearbyService => service !== null);

      const withoutOther = excludeGenericOtherType(formatted);

      const withinRadius = withoutOther
        .filter((service) => (service.distance ?? 0) <= safeRadius)
        .sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0));

      const seen = new Set<string>();
      const deduped = withinRadius.filter((s) => {
        const key = locationKey(s.latitude, s.longitude);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      setServices(deduped);
      if (!useFullTextRpc) {
        await saveNearbyServicesCache(deduped, userLat, userLng, safeRadius);
      }
    } catch (fetchError) {
      console.error("Error fetching nearby services:", fetchError);
      if (requestId !== fetchRequestIdRef.current) {
        return;
      }
      const cached = await getNearbyServicesCache();
      if (cached?.services?.length) {
        // Usar centro do cache para distâncias coerentes com o raio (2km, 10km, etc.)
        const withDistance = excludeGenericOtherType(
          applyCacheWithDistance(cached.services, cached.centerLat, cached.centerLng),
        );
        setServices(withDistance);
        setError("Sem conexão. Exibindo equipamentos em cache.");
      } else {
        setServices([]);
        setError("Erro ao buscar serviços próximos.");
      }
    } finally {
      if (requestId === fetchRequestIdRef.current) {
        setLoading(false);
      }
    }
  }, [radiusMeters, serviceType, serviceTypes, applyCacheWithDistance, fullTextQuery]);

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
