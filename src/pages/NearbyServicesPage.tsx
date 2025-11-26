import { useState } from "react";
import { useNavigate } from "react-router-dom";
import PageHeader from "@/components/ui/page-header";
import FloatingNavbar from "@/components/FloatingNavbar";
import { ServiceCard } from "@/components/evaluation/ServiceCard";
import { ServiceTypeFilter } from "@/components/evaluation/ServiceTypeFilter";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useNearbyServices } from "@/hooks/useNearbyServices";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin, AlertCircle } from "lucide-react";

type ServiceType = "all" | "ubs" | "school" | "ceu" | "hospital" | "library" | "sports_center";

export default function NearbyServicesPage() {
  const navigate = useNavigate();
  const [selectedType, setSelectedType] = useState<ServiceType>("all");
  
  const { latitude, longitude, loading: geoLoading, error: geoError, refetch: refetchLocation } = useGeolocation();
  const { services, loading: servicesLoading } = useNearbyServices({
    latitude,
    longitude,
    radiusMeters: 5000,
    serviceType: selectedType === "all" ? undefined : selectedType
  });

  const isLoading = geoLoading || servicesLoading;

  return (
    <div className="min-h-screen bg-background pb-24 pt-[60px]">
      <PageHeader title="Perto de Você" />
      
      <div className="p-4 space-y-4">
        {geoError && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-destructive mb-1">
                Não foi possível obter sua localização
              </p>
              <p className="text-xs text-muted-foreground mb-2">{geoError}</p>
              <Button size="sm" variant="outline" onClick={refetchLocation}>
                Tentar novamente
              </Button>
            </div>
          </div>
        )}

        {latitude && longitude && !geoError && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="w-4 h-4" />
            <span>Buscando serviços em um raio de 5km</span>
          </div>
        )}

        <ServiceTypeFilter selectedType={selectedType} onTypeChange={setSelectedType} />

        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        ) : services.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-3">📍</div>
            <h3 className="font-semibold text-foreground mb-1">Nenhum serviço encontrado</h3>
            <p className="text-sm text-muted-foreground">
              Tente aumentar o raio de busca ou selecionar outro tipo de serviço
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {services.map((service) => (
              <ServiceCard
                key={service.id}
                id={service.id}
                name={service.name}
                serviceType={service.service_type}
                address={service.address}
                district={service.district}
                distance={service.distance}
                averageRating={service.average_rating}
                totalRatings={service.total_ratings}
                phone={service.phone}
                onClick={() => navigate(`/servico/${service.id}`)}
              />
            ))}
          </div>
        )}
      </div>

      <FloatingNavbar />
    </div>
  );
}
