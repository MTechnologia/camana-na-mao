import { useMemo, useRef } from "react";
import { servicosProximos, type SearchResult } from "@/data/searchData";

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
}

type ServiceType = "ubs" | "school" | "ceu" | "hospital" | "library" | "sports_center" | "other" | "all";

interface UseNearbyServicesProps {
  latitude: number | null;
  longitude: number | null;
  radiusMeters?: number;
  serviceType?: ServiceType;
}

// Coordenadas padrão: Praça da Sé, centro de São Paulo
const CENTRO_SP = { lat: -23.5505, lng: -46.6333 };

// Convert mocked SearchResult to NearbyService format
const convertMockedToService = (item: SearchResult): NearbyService => ({
  id: item.id,
  name: item.title,
  service_type: (item.metadata?.serviceType ?? "other") as string,
  address: item.description,
  district: item.metadata?.district ?? "",
  // Usar ?? para fallback seguro (|| trata 0 como falsy)
  latitude: item.metadata?.latitude ?? CENTRO_SP.lat,
  longitude: item.metadata?.longitude ?? CENTRO_SP.lng,
  phone: item.metadata?.phone ?? null,
  average_rating: item.metadata?.rating ?? 0,
  total_ratings: item.metadata?.totalRatings ?? 0,
});

// Haversine formula to calculate distance between two points
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

export const useNearbyServices = ({
  latitude,
  longitude,
  radiusMeters = 5000,
  serviceType,
}: UseNearbyServicesProps) => {
  // useRef para manter última localização válida e evitar recálculos desnecessários
  const lastValidLocation = useRef({ lat: CENTRO_SP.lat, lng: CENTRO_SP.lng });

  // Atualizar ref apenas se receber localização válida
  if (isValidCoordinate(latitude) && isValidCoordinate(longitude)) {
    lastValidLocation.current = { lat: latitude, lng: longitude };
  }

  // Sempre usar localização válida (atual ou última conhecida)
  const userLat = lastValidLocation.current.lat;
  const userLng = lastValidLocation.current.lng;

  // Memoizar o cálculo dos serviços
  const services = useMemo(() => {
    if (!servicosProximos || servicosProximos.length === 0) {
      return [];
    }

    // Converter todos os dados mockados
    let mockedData = servicosProximos.map(convertMockedToService);

    // Filtrar por tipo de serviço
    if (serviceType && serviceType !== "all") {
      mockedData = mockedData.filter(service => service.service_type === serviceType);
    }

    // Calcular distância e adicionar aos serviços
    const withDistance = mockedData.map(service => {
      const serviceLat = service.latitude;
      const serviceLng = service.longitude;

      // Verificação robusta: usar typeof e isNaN
      const isValidLat = isValidCoordinate(serviceLat);
      const isValidLng = isValidCoordinate(serviceLng);

      if (!isValidLat || !isValidLng) {
        return { ...service, distance: 999999 };
      }

      const distance = calculateDistance(userLat, userLng, serviceLat, serviceLng);
      return { ...service, distance };
    });

    // Para dados MOCK: NÃO filtrar por raio, apenas ordenar por distância
    // Todos os serviços sempre visíveis
    return withDistance.sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0));
  }, [userLat, userLng, serviceType]);

  return {
    services,
    loading: false,
    error: null,
    refetch: () => {},
  };
};
