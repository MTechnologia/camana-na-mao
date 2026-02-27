import { lazy, Suspense, useState } from 'react';
import { SimulatedMap } from './SimulatedMap';
import { Skeleton } from '@/components/ui/skeleton';
import { MapOverlayLayersPanel } from './MapOverlayLayersPanel';
import { useGeoSampaOverlay } from '@/hooks/useGeoSampaOverlay';

const GoogleMapView = lazy(() => import('./GoogleMapView').then(module => ({ default: module.GoogleMapView })));

interface Service {
  id: string;
  name: string;
  service_type: string;
  latitude: number;
  longitude: number;
  distance?: number;
}

interface MapViewProps {
  userLocation: { latitude: number; longitude: number } | null;
  services: Service[];
  onServiceClick: (serviceId: string) => void;
  /** Quando true, a distância exibida é a pé (rota real); caso contrário mostra "(em linha reta)" */
  distanceLabel?: "walking" | "straight";
}

const MapLoader = () => (
  <div className="relative w-full h-[500px] rounded-lg overflow-hidden">
    <Skeleton className="absolute inset-0" />
    <div className="absolute inset-0 flex items-center justify-center">
      <p className="text-sm text-muted-foreground">Carregando mapa...</p>
    </div>
  </div>
);

export const MapView = ({ userLocation, services, onServiceClick, distanceLabel = "straight" }: MapViewProps) => {
  const googleMapsKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;
  const useGoogleMaps = !!(googleMapsKey && googleMapsKey.trim().length > 0);

  const [enabledOverlayIds, setEnabledOverlayIds] = useState<string[]>([]);
  const overlayLayers = useGeoSampaOverlay(enabledOverlayIds);

  if (useGoogleMaps) {
    return (
      <Suspense fallback={<MapLoader />}>
        <div className="relative">
          <GoogleMapView
            userLocation={userLocation}
            services={services}
            onServiceClick={onServiceClick}
            distanceLabel={distanceLabel}
            overlayLayers={overlayLayers}
          />
          <MapOverlayLayersPanel
            enabledLayerIds={enabledOverlayIds}
            onEnabledChange={setEnabledOverlayIds}
            layerStates={overlayLayers}
          />
        </div>
      </Suspense>
    );
  }

  return (
    <SimulatedMap
      userLocation={userLocation}
      services={services}
      onServiceClick={onServiceClick}
      distanceLabel={distanceLabel}
    />
  );
};
