import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  getNearbyServicesCache,
  saveNearbyServicesCache,
  type CachedNearbyService,
} from "@/lib/nearbyServicesCache";
import {
  getBoundingBoxForRadiusMeters,
  mapPublicServiceRowToNearbyService,
} from "@/lib/nearbyServiceRow";

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
 * Mínimo de caracteres para usar RPC `search_public_services_fulltext` (FTS + fallback ILIKE).
 * Com 1 caractere: só bbox (sem filtro textual no servidor).
 */
export const NEARBY_FULLTEXT_MIN_LENGTH = 2;

interface UseNearbyServicesProps {
  latitude: number | null;
  longitude: number | null;
  radiusMeters?: number;
  /** Um único tipo (legado) ou lista de tipos. Vazio/undefined = todos */
  serviceType?: ServiceType;
  /** Múltiplos tipos (multiseleção). Vazio = todos. Tem precedência sobre serviceType */
  serviceTypes?: ServiceType[];
  /**
   * Texto >= NEARBY_FULLTEXT_MIN_LENGTH dispara FTS na RPC; filtro por tipo(s) também usa a mesma RPC
   * (evita timeout do REST só com bbox + service_type).
   */
  fullTextQuery?: string;
  /**
   * Distância mínima (Haversine) em metros na RPC — obrigatório como número quando não há filtro de tipo
   * (faixas em anel); evita LIMIT 5000 arbitrário do REST sem anel completo.
   */
  minRadiusMeters?: number;
  /** Evita fetch (ex.: aguardando endereço primário do usuário) sem erro de localização */
  skipFetch?: boolean;
}

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
  minRadiusMeters,
  skipFetch = false,
}: UseNearbyServicesProps) => {
  // useRef para manter última localização válida e evitar recálculos desnecessários (sem fallback em ponto fixo)
  const lastValidLocation = useRef<{ lat: number; lng: number } | null>(null);

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
    if (skipFetch) {
      setServices([]);
      setLoading(false);
      setError(null);
      return;
    }

    const userLat = lastValidLocation.current?.lat;
    const userLng = lastValidLocation.current?.lng;

    if (!isValidCoordinate(userLat) || !isValidCoordinate(userLng)) {
      setServices([]);
      setError("Localização inválida para buscar serviços.");
      return;
    }

    setLoading(true);
    setError(null);

    const safeRadius = Math.max(radiusMeters, 100);

    if (!navigator.onLine) {
      try {
        const cached = await getNearbyServicesCache();
        if (cached?.services?.length) {
          const centerLat = cached.centerLat;
          const centerLng = cached.centerLng;
          const withDistance = excludeGenericOtherType(
            applyCacheWithDistance(cached.services, centerLat, centerLng),
          );
          setServices(withDistance);
        } else {
          setServices([]);
        }
      } catch {
        setServices([]);
      }
      setLoading(false);
      setError("Sem conexão. Exibindo equipamentos em cache quando disponível.");
      return;
    }

    const requestId = ++fetchRequestIdRef.current;

    try {
      const { minLat, maxLat, minLng, maxLng } = getBoundingBoxForRadiusMeters(
        userLat,
        userLng,
        safeRadius
      );

      const types = serviceTypes?.filter((t) => t !== "all") ?? [];
      const singleType = !serviceType || serviceType === "all" ? undefined : serviceType;
      const effectiveTypes =
        types.length > 0 ? types : singleType ? [singleType] : [];
      const isAllTypes = effectiveTypes.length === 0;
      /** Com filtro de tipo a RPC já é mais seletiva; 400 basta ao raio e reduz Haversine + Routes API. */
      const limit = isAllTypes ? 5000 : 400;

      const ftsTrimmed = (fullTextQuery ?? "").trim();
      const hasTextSearch = ftsTrimmed.length >= NEARBY_FULLTEXT_MIN_LENGTH;
      /**
       * RPC: texto, tipo(s), ou faixa mínima explícita (anel sem tipo — número em minRadiusMeters).
       * REST com LIMIT sem ORDER BY distância omitia equipamentos nas faixas 501 m–1 km, 1,1–2 km, 2,1–5 km.
       */
      const useLocationRpc =
        hasTextSearch ||
        effectiveTypes.length > 0 ||
        typeof minRadiusMeters === "number";

      const minRadiusRpc =
        typeof minRadiusMeters === "number" && minRadiusMeters > 0 ? minRadiusMeters : null;

      let data: unknown[] | null = null;
      let fetchError: { message?: string } | null = null;

      if (useLocationRpc) {
        const { data: rpcData, error: rpcError } = await supabase.rpc("search_public_services_fulltext", {
          min_lat: minLat,
          max_lat: maxLat,
          min_lng: minLng,
          max_lng: maxLng,
          center_lat: userLat,
          center_lng: userLng,
          radius_meters: safeRadius,
          search_query: hasTextSearch ? ftsTrimmed : null,
          service_types: effectiveTypes.length > 0 ? effectiveTypes : null,
          result_limit: limit,
          min_radius_meters: minRadiusRpc,
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
          // PostgREST pode responder 500 com `service_type=in.(ubs)` (único valor em enum);
          // usar `.eq` quando há só um tipo evita o erro.
          query =
            effectiveTypes.length === 1
              ? query.eq("service_type", effectiveTypes[0] as string)
              : query.in("service_type", effectiveTypes as string[]);
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
        .map((raw) =>
          mapPublicServiceRowToNearbyService(raw as Record<string, unknown>, userLat, userLng),
        )
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
      void saveNearbyServicesCache(deduped, userLat, userLng, safeRadius).catch((err) => {
        console.warn("Falha ao gravar cache de equipamentos próximos:", err);
      });
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
  }, [radiusMeters, serviceType, serviceTypes, applyCacheWithDistance, fullTextQuery, minRadiusMeters, skipFetch]);

  useEffect(() => {
    fetchServices();
  }, [fetchServices, latitude, longitude, skipFetch]);

  return {
    services,
    loading,
    error,
    refetch: fetchServices,
  };
};
