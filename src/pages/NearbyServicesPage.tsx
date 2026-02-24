import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import PageHeader from "@/components/ui/page-header";
import { toast } from "sonner";

import { ServiceCard } from "@/components/evaluation/ServiceCard";
import { ServiceTypeFilter } from "@/components/evaluation/ServiceTypeFilter";
import { RatingFilter, type MinRatingFilter } from "@/components/evaluation/RatingFilter";
import { ServiceSortSelect, type ServiceSortOption } from "@/components/evaluation/ServiceSortSelect";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useNearbyServices } from "@/hooks/useNearbyServices";
import { useVisitDetection } from "@/hooks/useVisitDetection";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin, AlertCircle, Map, List } from "lucide-react";
import { MapView } from "@/components/map/MapView";
import { RadiusSelector } from "@/components/map/RadiusSelector";
import { getServiceDisplayName } from "@/lib/mapUtils";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

type ServiceType = "all" | "ubs" | "school" | "ceu" | "hospital" | "library" | "sports_center";

export default function NearbyServicesPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedType, setSelectedType] = useState<ServiceType>("all");
  const [radiusMeters, setRadiusMeters] = useState(5000);
  const [minRating, setMinRating] = useState<MinRatingFilter>("all");
  const [sortBy, setSortBy] = useState<ServiceSortOption>("distance");
  const [viewMode, setViewMode] = useState<"list" | "map">("list");

  const { latitude, longitude, loading: geoLoading, error: geoError, refetch: refetchLocation, isSimulated } = useGeolocation();
  const { services, loading: servicesLoading } = useNearbyServices({
    latitude,
    longitude,
    radiusMeters,
    serviceType: selectedType === "all" ? undefined : selectedType
  });

  const filteredByRating = minRating === "all"
    ? services
    : services.filter((s) => (s.average_rating ?? 0) >= minRating);

  const sortedServices = [...filteredByRating].sort((a, b) => {
    if (sortBy === "rating") {
      const ra = a.average_rating ?? 0;
      const rb = b.average_rating ?? 0;
      if (rb !== ra) return rb - ra;
    }
    return (a.distance ?? 0) - (b.distance ?? 0);
  });

  const { detectedVisit, onAcknowledged, isChecking } = useVisitDetection({
    latitude,
    longitude,
    services: services.map((s) => ({ id: s.id, name: s.name, latitude: s.latitude, longitude: s.longitude })),
    userId: user?.id,
    isSimulated,
  });

  const handleVisitAvaliar = useCallback(() => {
    if (detectedVisit) {
      onAcknowledged();
      navigate(`/avaliar/${detectedVisit.visitId}`);
    }
  }, [detectedVisit, onAcknowledged, navigate]);

  useEffect(() => {
    if (!detectedVisit) return;
    toast.info(
      `Você visitou ${detectedVisit.serviceName}. Gostaria de avaliar?`,
      {
        duration: 15_000,
        id: "visit-detected",
        action: {
          label: "Avaliar",
          onClick: handleVisitAvaliar,
        },
      }
    );
  }, [detectedVisit, handleVisitAvaliar]);
  const isLoading = servicesLoading && services.length === 0;
  const userLocation = latitude && longitude ? { latitude, longitude } : null;

  return (
    <div className="min-h-screen bg-background pb-24 pt-[60px]">
      <PageHeader title="Perto de Você" />
      
      <div className="max-w-screen-xl mx-auto p-4 lg:p-6 space-y-4">
        {isSimulated && (
          <div className="bg-accent/10 border border-accent/30 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-accent-foreground shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground mb-1">
                Modo Demonstração
              </p>
              <p className="text-xs text-muted-foreground">
                Usando localização simulada (Centro de São Paulo) com os serviços cadastrados no sistema
              </p>
            </div>
          </div>
        )}

        {geoError && !isSimulated && (
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
          <>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="w-4 h-4" />
                <span>
                  {sortedServices.length} {sortedServices.length === 1 ? "serviço encontrado" : "serviços encontrados"}
                </span>
              </div>
              <ServiceSortSelect value={sortBy} onValueChange={setSortBy} />
            </div>
            {user && !isSimulated && services.length > 0 && (
              <p className="text-xs text-muted-foreground">
                Detecção de visitas ativa: permaneça 10 min perto de um serviço para receber o aviso de avaliação.
              </p>
            )}
          </>
        )}

        <RadiusSelector radius={radiusMeters} onRadiusChange={setRadiusMeters} />

        <ServiceTypeFilter selectedType={selectedType} onTypeChange={setSelectedType} />

        <RatingFilter value={minRating} onChange={setMinRating} />

        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "list" | "map")} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="list" className="flex items-center gap-2">
              <List className="w-4 h-4" />
              Lista
            </TabsTrigger>
            <TabsTrigger value="map" className="flex items-center gap-2">
              <Map className="w-4 h-4" />
              Mapa
            </TabsTrigger>
          </TabsList>

          <TabsContent value="list" className="mt-0">
            {isLoading ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
                {[...Array(6)].map((_, i) => (
                  <Skeleton key={i} className="h-32 w-full" />
                ))}
              </div>
            ) : sortedServices.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-4xl mb-3">📍</div>
                <h3 className="font-semibold text-foreground mb-1">Nenhum serviço encontrado</h3>
                <p className="text-sm text-muted-foreground">
                  Tente aumentar o raio de busca, selecionar outro tipo de serviço ou relaxar o filtro de avaliação
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
                {sortedServices.map((service) => (
                  <ServiceCard
                    key={service.id}
                    id={service.id}
                    name={getServiceDisplayName({ name: service.name, address: service.address, district: service.district, service_type: service.service_type })}
                    serviceType={service.service_type}
                    address={service.address}
                    district={service.district}
                    distance={service.distance}
                    averageRating={service.average_rating}
                    totalRatings={service.total_ratings}
                    phone={service.phone}
                    latitude={service.latitude}
                    longitude={service.longitude}
                    userLatitude={latitude}
                    userLongitude={longitude}
                    onClick={() => navigate(`/servico/${service.id}`)}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="map" className="mt-0">
            {isLoading ? (
              <Skeleton className="h-[500px] w-full rounded-lg" />
            ) : userLocation ? (
              <MapView
                userLocation={userLocation}
                services={sortedServices}
                onServiceClick={(serviceId) => navigate(`/servico/${serviceId}`)}
              />
            ) : (
              <div className="text-center py-12">
                <div className="text-4xl mb-3">📍</div>
                <h3 className="font-semibold text-foreground mb-1">Localização necessária</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Precisamos da sua localização para mostrar o mapa
                </p>
                <Button onClick={refetchLocation}>
                  Ativar localização
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

    </div>
  );
}
