import { useState, useEffect } from "react";
import { toast } from "sonner";
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
  distance?: number; // in meters
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
  service_type: (item.metadata?.serviceType || "other") as any,
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
  const [services, setServices] = useState<NearbyService[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNearbyServices = async () => {
    // Usar localização simulada padrão se não houver coordenadas
    const userLat = latitude || -23.5505; // Praça da Sé
    const userLng = longitude || -46.6333;

    setLoading(true);
    setError(null);

    try {
      // Usar apenas dados mockados (simulação)
      let mockedData = servicosProximos.map(convertMockedToService);

      // Filtrar por tipo de serviço se especificado
      if (serviceType && serviceType !== "all") {
        mockedData = mockedData.filter(service => service.service_type === serviceType);
      }

      // Calcular distância e filtrar por raio
      const servicesWithDistance = mockedData
        .map(service => ({
          ...service,
          distance: calculateDistance(
            userLat,
            userLng,
            Number(service.latitude),
            Number(service.longitude)
          ),
        }))
        .filter(service => service.distance <= radiusMeters)
        .sort((a, b) => a.distance - b.distance);

      setServices(servicesWithDistance);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erro ao buscar serviços";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNearbyServices();
  }, [latitude, longitude, radiusMeters, serviceType]);

  return {
    services,
    loading,
    error,
    refetch: fetchNearbyServices,
  };
};
