import { lazy, Suspense, useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { SimulatedMap } from './SimulatedMap';
import type { MapFocusOnService } from './GoogleMapView';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { MapOverlayLayersPanel } from './MapOverlayLayersPanel';
import { useGeoSampaOverlay } from '@/hooks/useGeoSampaOverlay';
import { getGoogleMapsApiKey } from '@/lib/googleMapsKey';

const GoogleMapView = lazy(() => import('./GoogleMapView').then(module => ({ default: module.GoogleMapView })));

interface Service {
  id: string;
  name: string;
  service_type: string;
  latitude: number;
  longitude: number;
  distance?: number;
  /** Agregados public_services (avaliações publicadas) — mapa pode sinalizar média baixa */
  average_rating?: number;
  total_ratings?: number;
  address?: string;
  district?: string;
}

interface MapViewProps {
  userLocation: { latitude: number; longitude: number } | null;
  services: Service[];
  onServiceClick: (serviceId: string) => void;
  /** Quando true, a distância exibida é a pé (rota real); caso contrário mostra "(em linha reta)" */
  distanceLabel?: "walking" | "driving" | "straight";
  /** Tipos de serviço ativos no filtro – a legenda do mapa lista estes (OS-05). */
  activeServiceTypes?: string[];
  /** Google Maps: centralizar no equipamento após busca/seleção (ignorado no mapa simulado). */
  focusOnService?: MapFocusOnService | null;
}

const MapLoader = () => (
  <div className="relative w-full h-[500px] rounded-lg overflow-hidden">
    <Skeleton className="absolute inset-0" />
    <div className="absolute inset-0 flex items-center justify-center">
      <p className="text-sm text-muted-foreground">Carregando mapa...</p>
    </div>
  </div>
);

function MapFavoritesButton() {
  return (
    <Button variant="secondary" size="sm" className="shadow-sm gap-2" asChild>
      <Link to="/servicos/favoritos" aria-label="Ir para Meus Favoritos">
        <Heart className="h-4 w-4 shrink-0" aria-hidden />
        Meus Favoritos
      </Link>
    </Button>
  );
}

export const MapView = ({
  userLocation,
  services,
  onServiceClick,
  distanceLabel = "straight",
  activeServiceTypes = [],
  focusOnService = null,
}: MapViewProps) => {
  const googleMapsKey = getGoogleMapsApiKey();
  const useGoogleMaps = !!googleMapsKey;

  const [enabledOverlayIds, setEnabledOverlayIds] = useState<string[]>([]);
  const [wmsImageamentoEnabled, setWmsImageamentoEnabled] = useState(false);
  const overlayLayers = useGeoSampaOverlay(enabledOverlayIds);

  if (useGoogleMaps) {
    return (
      <Suspense fallback={<MapLoader />}>
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <MapOverlayLayersPanel
              enabledLayerIds={enabledOverlayIds}
              onEnabledChange={setEnabledOverlayIds}
              layerStates={overlayLayers}
              wmsImageamentoEnabled={wmsImageamentoEnabled}
              onWmsImageamentoChange={setWmsImageamentoEnabled}
            />
            <MapFavoritesButton />
          </div>
          <GoogleMapView
            userLocation={userLocation}
            services={services}
            onServiceClick={onServiceClick}
            distanceLabel={distanceLabel}
            activeServiceTypes={activeServiceTypes}
            overlayLayers={overlayLayers}
            wmsImageamentoEnabled={wmsImageamentoEnabled}
            focusOnService={focusOnService}
          />
        </div>
      </Suspense>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <MapFavoritesButton />
      </div>
      <SimulatedMap
        userLocation={userLocation}
        services={services}
        onServiceClick={onServiceClick}
        distanceLabel={distanceLabel}
        activeServiceTypes={activeServiceTypes}
      />
    </div>
  );
};
