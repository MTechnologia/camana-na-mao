import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import PageHeader from "@/components/ui/page-header";
import { toast } from "sonner";

import { ServiceCard } from "@/components/evaluation/ServiceCard";
import { ServiceTypeFilter, type ServiceTypeFilterValue } from "@/components/evaluation/ServiceTypeFilter";
import { RatingFilter, type MinRatingFilter } from "@/components/evaluation/RatingFilter";
import { ServiceSortSelect, type ServiceSortOption } from "@/components/evaluation/ServiceSortSelect";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useNearbyServices } from "@/hooks/useNearbyServices";
import { useWalkingDistancesMatrix } from "@/hooks/useWalkingDistancesMatrix";
import { useMapboxToken } from "@/hooks/useMapboxToken";
import { useReverseGeocodeForServices } from "@/hooks/useReverseGeocodeForServices";
import { useVisitDetection } from "@/hooks/useVisitDetection";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin, AlertCircle, Map, List, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { MapView } from "@/components/map/MapView";
import { RadiusSelector } from "@/components/map/RadiusSelector";
import { LocationSearchCard } from "@/components/map/LocationSearchCard";
import type { CepCenter } from "@/components/map/CepSearchCard";
import { getServiceDisplayName } from "@/lib/mapUtils";
import { getGoogleMapsApiKey } from "@/lib/googleMapsKey";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export default function NearbyServicesPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedTypes, setSelectedTypes] = useState<ServiceTypeFilterValue[]>([]);
  const [radiusMeters, setRadiusMeters] = useState(5000);
  const [minRating, setMinRating] = useState<MinRatingFilter>("all");
  const [sortBy, setSortBy] = useState<ServiceSortOption>("distance");
  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  const [cepCenter, setCepCenter] = useState<CepCenter | null>(null);
  const [searchByName, setSearchByName] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const PAGE_SIZE = 20;

  const { latitude, longitude, loading: geoLoading, error: geoError, refetch: refetchLocation, isSimulated } = useGeolocation();
  const searchLat = cepCenter?.latitude ?? latitude;
  const searchLng = cepCenter?.longitude ?? longitude;

  const mapboxToken = useMapboxToken();
  const hasMapboxToken = !!(mapboxToken && mapboxToken.startsWith("pk."));

  const { services, loading: servicesLoading } = useNearbyServices({
    latitude: searchLat,
    longitude: searchLng,
    radiusMeters,
    serviceTypes: selectedTypes.length > 0 ? selectedTypes : undefined
  });

  const filteredByRating = minRating === "all"
    ? services
    : services.filter((s) => (s.average_rating ?? 0) >= minRating);

  const sortedServicesByHaversine = useMemo(
    () =>
      [...filteredByRating].sort((a, b) => {
        if (sortBy === "rating") {
          const ra = a.average_rating ?? 0;
          const rb = b.average_rating ?? 0;
          if (rb !== ra) return rb - ra;
        }
        return (a.distance ?? 0) - (b.distance ?? 0);
      }),
    [filteredByRating, sortBy]
  );

  const mapCenter = searchLat != null && searchLng != null ? { latitude: searchLat, longitude: searchLng } : null;
  const { walkingDistances, loading: walkingLoading } = useWalkingDistancesMatrix(
    mapCenter,
    sortedServicesByHaversine,
    hasMapboxToken ? mapboxToken : null,
    "walking"
  );

  const { sortedServices, routeFilterFallback } = useMemo(() => {
    const hasRouteData = walkingDistances && walkingDistances.size > 0;
    const withRouteDistance = hasRouteData
      ? sortedServicesByHaversine.map((s) => ({
          ...s,
          distance: walkingDistances.get(s.id) ?? s.distance,
        }))
      : sortedServicesByHaversine.map((s) => ({ ...s }));

    let withinRadius = withRouteDistance.filter((s) => (s.distance ?? 0) <= radiusMeters);

    // Sem filtro de tipo há muitos serviços; após rota a pé quase todos ficam > raio e a lista zera. Fallback: mostrar por linha reta.
    const fallback =
      hasRouteData && withinRadius.length === 0 && sortedServicesByHaversine.length > 0;
    if (fallback) {
      withinRadius = sortedServicesByHaversine.filter((s) => (s.distance ?? 0) <= radiusMeters);
    }

    const sorted = [...withinRadius].sort((a, b) => {
      if (sortBy === "rating") {
        const ra = a.average_rating ?? 0;
        const rb = b.average_rating ?? 0;
        if (rb !== ra) return rb - ra;
      }
      return (a.distance ?? 0) - (b.distance ?? 0);
    });
    return { sortedServices: sorted, routeFilterFallback: fallback };
  }, [sortedServicesByHaversine, walkingDistances, sortBy, radiusMeters]);

  const useRouteDistance = !!(walkingDistances && walkingDistances.size > 0);
  const distanceLabelMode = useRouteDistance && !routeFilterFallback ? "walking" : "straight";

  const filteredByName = useMemo(() => {
    const q = searchByName.trim().toLowerCase();
    if (!q) return sortedServices;
    return sortedServices.filter((s) => {
      const name = (s.name ?? "").toLowerCase();
      const address = (s.address ?? "").toLowerCase();
      const district = (s.district ?? "").toLowerCase();
      return name.includes(q) || address.includes(q) || district.includes(q);
    });
  }, [sortedServices, searchByName]);

  const totalFiltered = filteredByName.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / PAGE_SIZE));
  const paginatedServices = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredByName.slice(start, start + PAGE_SIZE);
  }, [filteredByName, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchByName, selectedTypes, radiusMeters, minRating, sortBy]);

  // Usar lista que já tem dados (filteredByRating), não sortedServices que pode estar vazio por raio/distância a pé
  const resolvedAddresses = useReverseGeocodeForServices(filteredByRating, {
    apiKey: getGoogleMapsApiKey(),
    throttleMs: 200,
    maxConcurrent: 2,
  });

  // Lista estável para o hook de detecção; displayName evita mostrar ID técnico (ex.: ponto_onibus.fid--...) em toast/notificação
  const servicesForVisit = useMemo(
    () =>
      services.map((s) => ({
        id: s.id,
        name: s.name,
        displayName: getServiceDisplayName({ name: s.name, address: s.address, district: s.district, service_type: s.service_type }),
        latitude: s.latitude,
        longitude: s.longitude,
      })),
    [services]
  );

  const { detectedVisit, onAcknowledged, isChecking } = useVisitDetection({
    latitude: latitude ?? undefined,
    longitude: longitude ?? undefined,
    services: servicesForVisit,
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

        {(searchLat != null && searchLng != null) && !geoError && (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="w-4 h-4" />
                <span>
                  {totalPages > 1
                    ? `${(currentPage - 1) * PAGE_SIZE + 1}-${Math.min(currentPage * PAGE_SIZE, totalFiltered)} de ${totalFiltered}`
                    : `${totalFiltered} ${totalFiltered === 1 ? "serviço encontrado" : "serviços encontrados"}`}
                </span>
              </div>
              <ServiceSortSelect value={sortBy} onValueChange={setSortBy} />
            </div>
            {user && !isSimulated && services.length > 0 && (
              <p className="text-xs text-muted-foreground">
                Detecção de visitas ativa: permaneça 10 min perto de um serviço para receber o aviso de avaliação.
              </p>
            )}
            {hasMapboxToken && walkingLoading && sortedServices.length > 0 && (
              <p className="text-xs text-muted-foreground">
                Atualizando distâncias a pé…
              </p>
            )}
            {routeFilterFallback && (
              <p className="text-xs text-amber-600 dark:text-amber-500">
                Exibindo distâncias em linha reta; rota a pé indisponível para todos neste raio.
              </p>
            )}
          </>
        )}

        <LocationSearchCard cepCenter={cepCenter} onCepCenterChange={setCepCenter} disabled={!!geoError} />
        <RadiusSelector radius={radiusMeters} onRadiusChange={setRadiusMeters} />

        <ServiceTypeFilter selectedTypes={selectedTypes} onTypesChange={setSelectedTypes} />

        <RatingFilter value={minRating} onChange={setMinRating} />

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Buscar por nome, endereço ou bairro"
            value={searchByName}
            onChange={(e) => setSearchByName(e.target.value)}
            className="pl-9"
          />
        </div>

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
            ) : filteredByName.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-4xl mb-3">📍</div>
                <h3 className="font-semibold text-foreground mb-1">Nenhum serviço encontrado</h3>
                <p className="text-sm text-muted-foreground">
                  {searchByName.trim()
                    ? "Tente outro termo de busca ou relaxe os filtros."
                    : "Tente aumentar o raio de busca, selecionar outro tipo de serviço ou relaxar o filtro de avaliação"}
                </p>
              </div>
            ) : (
              <>
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
                {paginatedServices.map((service) => (
                  <ServiceCard
                    key={service.id}
                    id={service.id}
                    name={getServiceDisplayName({ name: service.name, address: service.address, district: service.district, service_type: service.service_type })}
                    serviceType={service.service_type}
                    address={resolvedAddresses[service.id] ?? service.address}
                    district={resolvedAddresses[service.id] ? undefined : service.district}
                    distance={service.distance}
                    distanceLabel={distanceLabelMode}
                    averageRating={service.average_rating}
                    totalRatings={service.total_ratings}
                    phone={service.phone}
                    latitude={service.latitude}
                    longitude={service.longitude}
                    userLatitude={searchLat ?? undefined}
                    userLongitude={searchLng ?? undefined}
                    openingHours={service.opening_hours}
                    servicesOffered={service.services_offered}
                    onClick={() => navigate(`/servico/${service.id}`)}
                  />
                ))}
              </div>
              {totalPages > 1 && (
                <div className="flex flex-wrap items-center justify-center gap-2 mt-6">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage <= 1}
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Anterior
                  </Button>
                  <span className="text-sm text-muted-foreground px-2">
                    Página {currentPage} de {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage >= totalPages}
                  >
                    Próxima
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              )}
              </>
            )}
          </TabsContent>

          <TabsContent value="map" className="mt-0">
            {isLoading ? (
              <Skeleton className="h-[500px] w-full rounded-lg" />
            ) : mapCenter ? (
              <MapView
                userLocation={mapCenter}
                services={filteredByName}
                onServiceClick={(serviceId) => navigate(`/servico/${serviceId}`)}
                distanceLabel={distanceLabelMode}
              />
            ) : (
              <div className="text-center py-12">
                <div className="text-4xl mb-3">📍</div>
                <h3 className="font-semibold text-foreground mb-1">Localização necessária</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Informe um CEP acima ou ative sua localização para ver o mapa
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
