import { useState } from "react";
import { useNavigate } from "react-router-dom";
import PageHeader from "@/components/ui/page-header";

import { ServiceCard } from "@/components/evaluation/ServiceCard";
import { ServiceTypeFilter } from "@/components/evaluation/ServiceTypeFilter";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useNearbyServices } from "@/hooks/useNearbyServices";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin, AlertCircle, Map, List } from "lucide-react";
import { MapView } from "@/components/map/MapView";
import { RadiusSelector } from "@/components/map/RadiusSelector";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

type ServiceType = "all" | "ubs" | "school" | "ceu" | "hospital" | "library" | "sports_center";

export default function NearbyServicesPage() {
  const navigate = useNavigate();
  const [selectedType, setSelectedType] = useState<ServiceType>("all");
  const [radiusMeters, setRadiusMeters] = useState(5000);
  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  
  const { latitude, longitude, loading: geoLoading, error: geoError, refetch: refetchLocation, isSimulated } = useGeolocation();
  const { services, loading: servicesLoading } = useNearbyServices({
    latitude,
    longitude,
    radiusMeters,
    serviceType: selectedType === "all" ? undefined : selectedType
  });

  const isLoading = servicesLoading && services.length === 0;
  const userLocation = latitude && longitude ? { latitude, longitude } : null;

  return (
    <div className="min-h-screen bg-background pb-24 pt-[60px]">
      <PageHeader title="Perto de Você" />
      
      <div className="p-4 space-y-4">
        {isSimulated && (
          <div className="bg-accent/10 border border-accent/30 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-accent-foreground shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground mb-1">
                Modo Demonstração
              </p>
              <p className="text-xs text-muted-foreground">
                Usando localização simulada (Centro de São Paulo) com dados mockados para demonstração
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
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="w-4 h-4" />
            <span>
              {services.length} {services.length === 1 ? 'serviço encontrado' : 'serviços encontrados'}
            </span>
          </div>
        )}

        <RadiusSelector radius={radiusMeters} onRadiusChange={setRadiusMeters} />

        <ServiceTypeFilter selectedType={selectedType} onTypeChange={setSelectedType} />

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
          </TabsContent>

          <TabsContent value="map" className="mt-0">
            {isLoading ? (
              <Skeleton className="h-[500px] w-full rounded-lg" />
            ) : userLocation ? (
              <MapView
                userLocation={userLocation}
                services={services}
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
