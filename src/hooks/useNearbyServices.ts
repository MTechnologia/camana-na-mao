import { useMemo } from "react";
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

// Convert mocked SearchResult to NearbyService format
const convertMockedToService = (item: SearchResult): NearbyService => ({
  id: item.id,
  name: item.title,
  service_type: (item.metadata?.serviceType || "other") as string,
  address: item.description,
  district: item.metadata?.district || "",
  latitude: item.metadata?.latitude || 0,
  longitude: item.metadata?.longitude || 0,
  phone: item.metadata?.phone || null,
  average_rating: item.metadata?.rating || 0,
  total_ratings: item.metadata?.totalRatings || 0,
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

export const useNearbyServices = ({
  latitude,
  longitude,
  radiusMeters = 5000,
  serviceType,
}: UseNearbyServicesProps) => {
  // Usar localização padrão (Praça da Sé) se não fornecida
  const userLat = latitude ?? -23.5505;
  const userLng = longitude ?? -46.6333;

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
      
      // Se coordenadas inválidas, usar distância grande
      if (!serviceLat || !serviceLng || (serviceLat === 0 && serviceLng === 0)) {
        return { ...service, distance: 999999 };
      }

      const distance = calculateDistance(userLat, userLng, serviceLat, serviceLng);
      return { ...service, distance };
    });

    // Filtrar por raio de busca
    const filtered = withDistance.filter(service => {
      const d = service.distance;
      return d !== undefined && d <= radiusMeters;
    });

    // Ordenar por distância
    return filtered.sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0));
  }, [userLat, userLng, radiusMeters, serviceType]);

  return {
    services,
    loading: false,
    error: null,
    refetch: () => {},
  };
};
