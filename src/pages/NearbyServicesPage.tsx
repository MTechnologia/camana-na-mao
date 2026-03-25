import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import PageHeader from "@/components/ui/page-header";
import { toast } from "sonner";

import { ServiceCard } from "@/components/evaluation/ServiceCard";
import {
  ServiceTypeFilter,
  type ServiceTypeFilterValue,
} from "@/components/evaluation/ServiceTypeFilter";
import { RatingFilter, type MinRatingFilter } from "@/components/evaluation/RatingFilter";
import { OperationalStatusFilterChips } from "@/components/evaluation/OperationalStatusFilterChips";
import { ServiceSortSelect, type ServiceSortOption } from "@/components/evaluation/ServiceSortSelect";
import { useGeolocation } from "@/hooks/useGeolocation";
import {
  useNearbyServices,
  NEARBY_FULLTEXT_MIN_LENGTH,
  type NearbyService,
} from "@/hooks/useNearbyServices";
import { useGoogleDistanceMatrix } from "@/hooks/useGoogleDistanceMatrix";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { useReverseGeocodeForServices } from "@/hooks/useReverseGeocodeForServices";
import { useVisitDetection } from "@/hooks/useVisitDetection";
import { useAuth } from "@/contexts/AuthContext";
import { useFavoriteServiceIds } from "@/hooks/useServiceFavorites";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin, AlertCircle, Map, List, ChevronLeft, ChevronRight, Clock, WifiOff, Database, Loader2 } from "lucide-react";
import { MapView } from "@/components/map/MapView";
import { RadiusSelector } from "@/components/map/RadiusSelector";
import { LocationSearchCard, type NearbyLocationUiPhase } from "@/components/map/LocationSearchCard";
import { NearbyEquipmentSearchInput } from "@/components/map/NearbyEquipmentSearchInput";
import type { CepCenter } from "@/components/map/CepSearchCard";
import { getServiceDisplayName, getOpeningHoursTextWithDefault, parseOpeningHoursToRange } from "@/lib/mapUtils";
import { textMatchesSearchQuery } from "@/lib/searchTextMatch";
import { clampNearbyRadiusMeters, getNearbyDistanceBand } from "@/lib/nearbyRadiusBands";
import { MAX_GPS_ACCURACY_NEARBY_UI_METERS } from "@/lib/gpsAccuracy";
import { NEARBY_DEFAULT_SERVICE_TYPES } from "@/lib/nearbyDefaultServiceTypes";
import { getUserPrimaryAddressCenter } from "@/lib/userPrimaryAddressCenter";
import { cn } from "@/lib/utils";
import { getGoogleMapsApiKey, getGoogleMapsNotConfiguredMessage } from "@/lib/googleMapsKey";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export default function NearbyServicesPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { favoriteIds, toggleFavorite } = useFavoriteServiceIds();
  const [favoriteBusyId, setFavoriteBusyId] = useState<string | null>(null);
  const [operationalStatusFilter, setOperationalStatusFilter] = useState<"all" | "open" | "closed" | "maintenance">("all");
  const [selectedTypes, setSelectedTypes] = useState<ServiceTypeFilterValue[]>(() => [
    ...NEARBY_DEFAULT_SERVICE_TYPES,
  ]);
  const [radiusMeters, setRadiusMeters] = useState(() => clampNearbyRadiusMeters(2000));
  const [minRating, setMinRating] = useState<MinRatingFilter>("all");
  const [sortBy, setSortBy] = useState<ServiceSortOption>("distance");
  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  const [cepCenter, setCepCenter] = useState<CepCenter | null>(null);
  const [locationMode, setLocationMode] = useState<NearbyLocationMode>("unset");
  const [locationUiPhase, setLocationUiPhase] = useState<NearbyLocationUiPhase>("picking");
  const [savedProfileCenter, setSavedProfileCenter] = useState<CepCenter | null>(null);
  const [profileAddressLoading, setProfileAddressLoading] = useState(false);
  /** Logado: aguarda tentativa de carregar endereço primário antes da busca */
  const [addressBootstrapDone, setAddressBootstrapDone] = useState(false);
  const [searchByName, setSearchByName] = useState("");
  const [onlyWithOpeningHours, setOnlyWithOpeningHours] = useState(false);
  const [openingTimeFilter, setOpeningTimeFilter] = useState<string>("");
  const [closingTimeFilter, setClosingTimeFilter] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);

  const PAGE_SIZE = 20;

  const { latitude, longitude, loading: geoLoading, error: geoError, refetch: refetchLocation } =
    useGeolocation({ autoRequest: false, maxAccuracyMeters: MAX_GPS_ACCURACY_NEARBY_UI_METERS });
  const searchLat = locationMode === "gps" ? latitude : cepCenter?.latitude ?? null;
  const searchLng = locationMode === "gps" ? longitude : cepCenter?.longitude ?? null;

  useEffect(() => {
    if (authLoading) return;
    if (!user?.id) {
      setAddressBootstrapDone(true);
      setLocationUiPhase("picking");
      setLocationMode("unset");
      setCepCenter(null);
      setSavedProfileCenter(null);
      return;
    }
    let cancelled = false;
    setAddressBootstrapDone(false);
    void (async () => {
      try {
        const center = await getUserPrimaryAddressCenter(user.id, getGoogleMapsApiKey());
        if (cancelled) return;
        if (center) {
          setSavedProfileCenter(center);
          setCepCenter(center);
          setLocationMode("profile_address");
          setLocationUiPhase("locked");
        } else {
          setSavedProfileCenter(null);
          setCepCenter(null);
          setLocationMode("unset");
          setLocationUiPhase("picking");
        }
      } finally {
        if (!cancelled) setAddressBootstrapDone(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authLoading, user?.id]);

  const skipNearbyFetch =
    authLoading ||
    (!!user?.id && !addressBootstrapDone) ||
    searchLat == null ||
    searchLng == null;

  const lockedLabel = useMemo(() => {
    if (locationUiPhase !== "locked") return null;
    if (locationMode === "gps" && latitude != null && longitude != null) return "Minha localização atual";
    if (cepCenter?.label) return cepCenter.label;
    return null;
  }, [locationUiPhase, locationMode, latitude, longitude, cepCenter]);

  const handleAlterarLocal = useCallback(() => {
    setLocationUiPhase("picking");
    setLocationMode("unset");
    setCepCenter(null);
  }, []);

  const handleRequestGps = useCallback(() => {
    setLocationMode("gps");
    setCepCenter(null);
    refetchLocation();
  }, [refetchLocation]);

  const handleUseProfileAddress = useCallback(async () => {
    if (savedProfileCenter) {
      setCepCenter(savedProfileCenter);
      setLocationMode("profile_address");
      setLocationUiPhase("locked");
      return;
    }
    if (!user?.id) {
      toast.error("Faça login para usar o endereço cadastrado.");
      return;
    }
    const apiKey = getGoogleMapsApiKey();
    setProfileAddressLoading(true);
    try {
      const center = await getUserPrimaryAddressCenter(user.id, apiKey);
      if (center) {
        setSavedProfileCenter(center);
        setCepCenter(center);
        setLocationMode("profile_address");
        setLocationUiPhase("locked");
      } else {
        if (!apiKey?.trim()) {
          toast.error(getGoogleMapsNotConfiguredMessage());
        } else {
          toast.error("Você ainda não tem endereço cadastrado. Cadastre em Perfil → Endereço.");
        }
      }
    } catch (e) {
      console.error(e);
      toast.error("Erro ao carregar endereço cadastrado");
    } finally {
      setProfileAddressLoading(false);
    }
  }, [savedProfileCenter, user?.id]);

  const handleCepSearchComplete = useCallback((center: CepCenter) => {
    setCepCenter(center);
    setLocationMode("cep_lookup");
    setLocationUiPhase("locked");
  }, []);

  useEffect(() => {
    if (locationMode !== "gps") return;
    if (geoLoading) return;
    if (latitude != null && longitude != null && !geoError) {
      setLocationUiPhase("locked");
    }
  }, [locationMode, geoLoading, latitude, longitude, geoError]);

  useEffect(() => {
    if (locationMode !== "gps" || geoLoading) return;
    if (geoError) {
      toast.error(geoError);
      setLocationMode("unset");
      setLocationUiPhase("picking");
    }
  }, [locationMode, geoLoading, geoError]);

  const googleMapsApiKey = getGoogleMapsApiKey();
  const hasGoogleMapsKey = !!googleMapsApiKey;

  const { isOnline } = useNetworkStatus();

  const hasTypeFilter = selectedTypes.length > 0;
  /** Sem tipo: informa o mínimo da faixa (anel) para a RPC; com tipo: não envia (usa só filtro de tipo no servidor). */
  const minRadiusForHook = !hasTypeFilter
    ? getNearbyDistanceBand(radiusMeters, false).min
    : undefined;

  const { services, loading: servicesLoading, error: servicesError } = useNearbyServices({
    latitude: searchLat,
    longitude: searchLng,
    radiusMeters,
    serviceTypes: selectedTypes.length > 0 ? selectedTypes : undefined,
    fullTextQuery: searchByName,
    minRadiusMeters: minRadiusForHook,
    skipFetch: skipNearbyFetch,
  });
  const isCacheOrOfflineMessage = servicesError != null && (
    servicesError.includes("cache") || servicesError.includes("Sem conexão")
  );
  /** Sem filtro de tipo: faixas em anel; com filtro de tipo: disco 0..raio */
  const servicesInBand = useMemo(() => {
    const band = getNearbyDistanceBand(radiusMeters, hasTypeFilter);
    return services.filter((s) => {
      const d = s.distance ?? 0;
      return d >= band.min && d <= band.max;
    });
  }, [services, radiusMeters, hasTypeFilter]);

  const filteredByRating = minRating === "all"
    ? servicesInBand
    : servicesInBand.filter((s) => (s.average_rating ?? 0) >= minRating);

  // Antes do filtro textual: equipamentos tipo "Outro" (e similares) costumam vir sem address no banco;
  // o card mostra endereço do reverse geocode — a busca precisa usar o mesmo texto.
  const resolvedAddresses = useReverseGeocodeForServices(filteredByRating, {
    apiKey: getGoogleMapsApiKey(),
    throttleMs: 200,
    maxConcurrent: 2,
  });

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
  /** Referência estável para o mapa (evita reexecução desnecessária de efeitos no GoogleMap). */
  const stableMapUserLocation = useMemo(
    () =>
      searchLat != null && searchLng != null ? { latitude: searchLat, longitude: searchLng } : null,
    [searchLat, searchLng],
  );

  const [equipmentMapFocusKey, setEquipmentMapFocusKey] = useState(0);
  const [equipmentMapFocusCoords, setEquipmentMapFocusCoords] = useState<{ lat: number; lng: number } | null>(
    null,
  );

  /** Usar distância por rota a pé em todos os raios para manter consistência das faixas. */
  const matrixProfile = "walking";
  const { walkingDistances, loading: walkingLoading } = useGoogleDistanceMatrix(
    mapCenter,
    sortedServicesByHaversine,
    hasGoogleMapsKey ? googleMapsApiKey : undefined,
    matrixProfile
  );

  const { sortedServices, routeFilterFallback } = useMemo(() => {
    const band = getNearbyDistanceBand(radiusMeters, hasTypeFilter);
    const inBand = (d: number) => d >= band.min && d <= band.max;

    const hasRouteData = walkingDistances && walkingDistances.size > 0;
    const withRouteDistance = hasRouteData
      ? sortedServicesByHaversine.map((s) => ({
          ...s,
          distance: walkingDistances.get(s.id) ?? s.distance,
        }))
      : sortedServicesByHaversine.map((s) => ({ ...s }));

    let withinRadius = withRouteDistance.filter((s) => inBand(s.distance ?? 0));

    // Sem filtro de tipo há muitos serviços; após rota a pé quase todos ficam fora da faixa. Fallback: mostrar por linha reta (Haversine) dentro da faixa.
    const fallback =
      hasRouteData && withinRadius.length === 0 && sortedServicesByHaversine.length > 0;
    if (fallback) {
      withinRadius = sortedServicesByHaversine.filter((s) => inBand(s.distance ?? 0));
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
  }, [sortedServicesByHaversine, walkingDistances, sortBy, radiusMeters, hasTypeFilter]);

  const useRouteDistance = !!(walkingDistances && walkingDistances.size > 0);
  const distanceLabelMode = useRouteDistance && !routeFilterFallback ? matrixProfile : "straight";

  const filteredByOperationalStatus = useMemo(() => {
    if (operationalStatusFilter === "all") return sortedServices;
    return sortedServices.filter((s) => s.operational_status === operationalStatusFilter);
  }, [sortedServices, operationalStatusFilter]);

  // Filtro de horário é independente do tipo: aplicado a todos os serviços já listados (por tipo, raio, etc.).
  // "Abertura a partir de X" = equipamentos que já estão abertos naquele horário (abrem ≤ X e fecham ≥ X).
  const filteredByOpeningHours = useMemo(() => {
    let list = filteredByOperationalStatus;
    if (onlyWithOpeningHours) {
      list = list.filter((s) => getOpeningHoursTextWithDefault(s.opening_hours, s.service_type) != null);
    }
    const openFilterMinutes = openingTimeFilter
      ? (() => {
          const [h, m] = openingTimeFilter.split(":").map(Number);
          return h * 60 + (m ?? 0);
        })()
      : null;
    const closeFilterMinutes =
      closingTimeFilter && closingTimeFilter.trim() !== "" && closingTimeFilter !== "00:00"
        ? (() => {
            const [h, m] = closingTimeFilter.split(":").map(Number);
            return h * 60 + (m ?? 0);
          })()
        : null;
    if (openFilterMinutes == null && closeFilterMinutes == null) return list;
    return list.filter((s) => {
      const text = getOpeningHoursTextWithDefault(s.opening_hours, s.service_type);
      const { openMinutes, closeMinutes } = parseOpeningHoursToRange(text);
      if (openFilterMinutes != null) {
        if (openMinutes == null || closeMinutes == null) return false;
        if (openMinutes > openFilterMinutes) return false;
        if (closeMinutes < openFilterMinutes) return false;
      }
      if (closeFilterMinutes != null) {
        if (closeMinutes == null) return false;
        if (closeMinutes < closeFilterMinutes) return false;
        if (openMinutes != null && openMinutes > closeFilterMinutes) return false;
      }
      return true;
    });
  }, [filteredByOperationalStatus, onlyWithOpeningHours, openingTimeFilter, closingTimeFilter]);

  const filteredByName = useMemo(() => {
    const qRaw = searchByName.trim();
    const base = filteredByOpeningHours;
    if (!qRaw) return base;
    // Online + 2+ caracteres: lista já veio filtrada por FTS/ILIKE no banco; refinamos por palavras no cliente.
    if (qRaw.length >= NEARBY_FULLTEXT_MIN_LENGTH && isOnline) {
      return base.filter((s) => {
        const haystack = [
          s.name,
          s.address,
          s.district,
          resolvedAddresses[s.id] ?? "",
          s.services_offered ?? "",
        ].join(" ");
        return textMatchesSearchQuery(haystack, qRaw);
      });
    }
    return base.filter((s) => {
      const haystack = [
        s.name,
        s.address,
        s.district,
        resolvedAddresses[s.id] ?? "",
        s.services_offered ?? "",
      ].join(" ");
      return textMatchesSearchQuery(haystack, qRaw);
    });
  }, [filteredByOpeningHours, searchByName, resolvedAddresses, isOnline]);

  const focusMapOnEquipment = useCallback((s: NearbyService) => {
    setCepCenter({
      latitude: s.latitude,
      longitude: s.longitude,
      label: getServiceDisplayName({
        name: s.name,
        address: s.address,
        district: s.district,
        service_type: s.service_type,
      }),
    });
    setLocationMode("cep_lookup");
    setLocationUiPhase("locked");
    setEquipmentMapFocusCoords({ lat: s.latitude, lng: s.longitude });
    setEquipmentMapFocusKey((k) => k + 1);
    setViewMode("map");
  }, []);

  /** Um único equipamento após filtro textual: centralizar mapa após debounce (usuário ainda digitando). */
  const loneTextFilterMatch = useMemo(() => {
    const q = searchByName.trim();
    if (q.length < 3 || filteredByName.length !== 1) return null;
    return filteredByName[0];
  }, [searchByName, filteredByName]);

  useEffect(() => {
    if (!searchByName.trim()) {
      setEquipmentMapFocusCoords(null);
    }
  }, [searchByName]);

  useEffect(() => {
    if (!loneTextFilterMatch) return;
    const t = window.setTimeout(() => {
      setEquipmentMapFocusCoords({ lat: loneTextFilterMatch.latitude, lng: loneTextFilterMatch.longitude });
      setEquipmentMapFocusKey((k) => k + 1);
    }, 450);
    return () => clearTimeout(t);
    // Só reagir quando o único resultado possível mudar (id), não a cada novo array filteredByName
    // eslint-disable-next-line react-hooks/exhaustive-deps -- loneTextFilterMatch.id é o gatilho desejado
  }, [loneTextFilterMatch?.id]);

  const mapFocusPayload = useMemo(
    () =>
      equipmentMapFocusCoords
        ? {
            latitude: equipmentMapFocusCoords.lat,
            longitude: equipmentMapFocusCoords.lng,
            focusKey: equipmentMapFocusKey,
          }
        : null,
    [equipmentMapFocusCoords, equipmentMapFocusKey],
  );

  const totalFiltered = filteredByName.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / PAGE_SIZE));
  const paginatedServices = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredByName.slice(start, start + PAGE_SIZE);
  }, [filteredByName, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchByName, selectedTypes, radiusMeters, minRating, sortBy, operationalStatusFilter, onlyWithOpeningHours, openingTimeFilter, closingTimeFilter]);

  // Lista estável para o hook de detecção; displayName evita mostrar ID técnico (ex.: ponto_onibus.fid--...) em toast/notificação
  const servicesForVisit = useMemo(
    () =>
      servicesInBand.map((s) => ({
        id: s.id,
        name: s.name,
        displayName: getServiceDisplayName({ name: s.name, address: s.address, district: s.district, service_type: s.service_type }),
        latitude: s.latitude,
        longitude: s.longitude,
      })),
    [servicesInBand]
  );

  const { detectedVisit, onAcknowledged, isChecking } = useVisitDetection({
    latitude: locationMode === "gps" ? latitude : null,
    longitude: locationMode === "gps" ? longitude : null,
    services: servicesForVisit,
    userId: user?.id,
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
  const isInitialLoading = servicesLoading && services.length === 0;
  const isListRefreshing = servicesLoading && services.length > 0;

  return (
    <div className="min-h-screen bg-background pb-24 pt-[60px]">
      <PageHeader title="Perto de Você" />
      
      <div className="max-w-screen-xl mx-auto p-4 lg:p-6 space-y-4">
        {!isOnline && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 flex items-start gap-3">
            <WifiOff className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                Você está offline
              </p>
              <p className="text-xs text-muted-foreground">
                Os dados exibidos podem ser do último acesso. Ative a internet para atualizar a lista.
              </p>
            </div>
          </div>
        )}

        {isOnline && isCacheOrOfflineMessage && (
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 flex items-start gap-3">
            <Database className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                Dados em cache
              </p>
              <p className="text-xs text-muted-foreground">{servicesError}</p>
            </div>
          </div>
        )}

        {isOnline && servicesError != null && !isCacheOrOfflineMessage && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
            <p className="text-sm text-destructive">{servicesError}</p>
          </div>
        )}

        {(searchLat != null && searchLng != null) && (
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
            {user && locationMode === "gps" && services.length > 0 && (
              <p className="text-xs text-muted-foreground">
                Detecção de visitas ativa: permaneça 10 min perto de um serviço para receber o aviso de avaliação.
              </p>
            )}
            {hasGoogleMapsKey && walkingLoading && sortedServices.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {matrixProfile === "driving" ? "Atualizando distâncias de carro…" : "Atualizando distâncias a pé…"}
              </p>
            )}
          </>
        )}

        <LocationSearchCard
          phase={locationUiPhase}
          lockedLabel={lockedLabel}
          onAlterarLocal={handleAlterarLocal}
          onRequestGps={handleRequestGps}
          onUseProfileAddress={handleUseProfileAddress}
          profileAddressLoading={profileAddressLoading}
          onCepSearchComplete={handleCepSearchComplete}
          geoLoading={geoLoading}
          gpsError={locationUiPhase === "picking" ? geoError : null}
        />
        <RadiusSelector
          radius={radiusMeters}
          onRadiusChange={(r) => setRadiusMeters(clampNearbyRadiusMeters(r))}
          showBandHint={!hasTypeFilter}
        />

        <ServiceTypeFilter selectedTypes={selectedTypes} onTypesChange={setSelectedTypes} />

        <RatingFilter value={minRating} onChange={setMinRating} />

        <div className="space-y-2">
          <OperationalStatusFilterChips
            value={operationalStatusFilter}
            onChange={setOperationalStatusFilter}
            label="Status operacional:"
          />
          <p className="text-xs text-muted-foreground">
            Exibe apenas serviços com status operacional identificado no GeoSampa.
          </p>
        </div>

        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground shrink-0" aria-hidden />
            <span className="text-sm text-muted-foreground shrink-0">Horário:</span>
            <Badge
              variant={onlyWithOpeningHours ? "default" : "outline"}
              className={cn(
                "cursor-pointer whitespace-nowrap transition-all",
                onlyWithOpeningHours ? "bg-primary text-primary-foreground" : "hover:bg-secondary"
              )}
              onClick={() => setOnlyWithOpeningHours((v) => !v)}
              title={onlyWithOpeningHours ? "Exibir todos (remover filtro)" : "Mostrar apenas equipamentos com horário de funcionamento cadastrado"}
            >
              Com horário informado
            </Badge>
            <span className="text-xs text-muted-foreground">
              (não precisa selecionar tipo; vale para todos os equipamentos)
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <label htmlFor="opening-time-filter" className="text-sm text-muted-foreground whitespace-nowrap">
                Abertura a partir de
              </label>
              <Input
                id="opening-time-filter"
                type="time"
                value={openingTimeFilter}
                onChange={(e) => setOpeningTimeFilter(e.target.value)}
                className="w-[8rem]"
                title="Mostrar equipamentos que abrem ou já estão abertos neste horário (vale para todos os tipos selecionados)"
              />
            </div>
            <div className="flex items-center gap-2">
              <label htmlFor="closing-time-filter" className="text-sm text-muted-foreground whitespace-nowrap">
                Fechamento até
              </label>
              <Input
                id="closing-time-filter"
                type="time"
                value={closingTimeFilter}
                onChange={(e) => setClosingTimeFilter(e.target.value)}
                className="w-[8rem]"
                title="Mostrar equipamentos que ainda estão abertos neste horário (vale para todos os tipos selecionados)"
              />
            </div>
            {(openingTimeFilter || closingTimeFilter) && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setOpeningTimeFilter("");
                  setClosingTimeFilter("");
                }}
              >
                Limpar horários
              </Button>
            )}
          </div>
        </div>

        <NearbyEquipmentSearchInput
          value={searchByName}
          onChange={setSearchByName}
          servicesInArea={filteredByOpeningHours}
          resolvedAddresses={resolvedAddresses}
          searchCenterLat={searchLat}
          searchCenterLng={searchLng}
          serviceTypesFilter={selectedTypes.length > 0 ? selectedTypes : undefined}
          onPlaceCenterSelected={(center) => {
            setCepCenter(center);
            setLocationMode("cep_lookup");
            setLocationUiPhase("locked");
            setSearchByName("");
          }}
          onEquipmentMapFocus={focusMapOnEquipment}
        />

        {isListRefreshing && (
          <div
            className="flex items-center gap-2 rounded-md border border-border/60 bg-muted/40 px-3 py-2 text-sm text-muted-foreground"
            role="status"
            aria-live="polite"
          >
            <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
            Atualizando equipamentos conforme o filtro…
          </div>
        )}

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
            {isInitialLoading ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
                {[...Array(6)].map((_, i) => (
                  <Skeleton key={i} className="h-32 w-full" />
                ))}
              </div>
            ) : filteredByName.length === 0 ? (
              <div className="text-center py-12">
                <div className="mb-3 flex justify-center" aria-hidden>
                  <MapPin className="h-12 w-12 text-muted-foreground" />
                </div>
                <h3 className="font-semibold text-foreground mb-1">Nenhum serviço encontrado</h3>
                <p className="text-sm text-muted-foreground">
                  {searchByName.trim()
                    ? "Tente outro termo de busca ou relaxe os filtros."
                    : operationalStatusFilter !== "all"
                      ? "Nenhum serviço com esse status operacional neste raio. Tente outro status ou aumente o raio."
                      : onlyWithOpeningHours || openingTimeFilter || closingTimeFilter
                      ? "Nenhum serviço atende aos filtros de horário neste raio. Tente aumentar o raio, ajustar ou limpar os horários de abertura/fechamento."
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
                    operationalStatus={service.operational_status}
                    isFavorite={user ? favoriteIds.has(service.id) : false}
                    favoriteDisabled={favoriteBusyId === service.id}
                    onFavoriteClick={async () => {
                      if (!user) {
                        toast.error("Faça login para usar favoritos.");
                        return;
                      }
                      setFavoriteBusyId(service.id);
                      try {
                        await toggleFavorite(service.id);
                      } finally {
                        setFavoriteBusyId(null);
                      }
                    }}
                    onClick={() =>
                      navigate(`/servico/${service.id}`, {
                        state: {
                          originLat: searchLat ?? null,
                          originLng: searchLng ?? null,
                        },
                      })
                    }
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
            <div className="sticky top-[64px] z-20 mb-3">
              <div className="rounded-lg border bg-background/95 backdrop-blur p-2">
                <OperationalStatusFilterChips
                  value={operationalStatusFilter}
                  onChange={setOperationalStatusFilter}
                  label="Status:"
                  compact
                />
              </div>
            </div>
            {!isOnline ? (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-8 text-center">
                <WifiOff className="mx-auto h-12 w-12 text-amber-600 dark:text-amber-400 mb-3" aria-hidden />
                <h3 className="font-semibold text-foreground mb-1">Mapa indisponível offline</h3>
                <p className="text-sm text-muted-foreground">
                  O mapa precisa de conexão para carregar. Use a aba <strong>Lista</strong> para ver os equipamentos em cache.
                </p>
              </div>
            ) : isInitialLoading ? (
              <Skeleton className="h-[500px] w-full rounded-lg" />
            ) : mapCenter ? (
              <MapView
                userLocation={stableMapUserLocation}
                services={filteredByName}
                onServiceClick={(serviceId) => navigate(`/servico/${serviceId}`)}
                distanceLabel={distanceLabelMode}
                activeServiceTypes={selectedTypes}
                focusOnService={mapFocusPayload}
              />
            ) : (
              <div className="text-center py-12">
                <div className="mb-3 flex justify-center" aria-hidden>
                  <MapPin className="h-12 w-12 text-muted-foreground" />
                </div>
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
