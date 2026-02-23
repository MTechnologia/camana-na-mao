import { lazy, Suspense, useState, useEffect, useCallback } from 'react';
import { SimulatedMap } from './SimulatedMap';
import { Skeleton } from '@/components/ui/skeleton';

const GoogleMapView = lazy(() => import('./GoogleMapView').then(module => ({ default: module.GoogleMapView })));
const MapboxMap = lazy(() => import('./MapboxMap').then(module => ({ default: module.MapboxMap })));

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
}

const MapLoader = () => (
  <div className="relative w-full h-[500px] rounded-lg overflow-hidden">
    <Skeleton className="absolute inset-0" />
    <div className="absolute inset-0 flex items-center justify-center">
      <p className="text-sm text-muted-foreground">Carregando mapa...</p>
    </div>
  </div>
);

export const MapView = ({ userLocation, services, onServiceClick }: MapViewProps) => {
  const [hasMapboxToken, setHasMapboxToken] = useState(false);
  const googleMapsKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;
  const useGoogleMaps = !!(googleMapsKey && googleMapsKey.trim().length > 0);

  useEffect(() => {
    const envToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
    const localToken = localStorage.getItem('mapbox_token');
    setHasMapboxToken(!!(envToken || localToken));
  }, []);

  const handleTokenSaved = useCallback(() => setHasMapboxToken(true), []);

  // Preferência: Google Maps (GCP) > Mapbox > Simulado
  if (useGoogleMaps) {
    return (
      <Suspense fallback={<MapLoader />}>
        <GoogleMapView
          userLocation={userLocation}
          services={services}
          onServiceClick={onServiceClick}
        />
      </Suspense>
    );
  }

  if (!hasMapboxToken) {
    return (
      <SimulatedMap
        userLocation={userLocation}
        services={services}
        onServiceClick={onServiceClick}
        onTokenSaved={handleTokenSaved}
      />
    );
  }

  return (
    <Suspense fallback={<MapLoader />}>
      <MapboxMap
        userLocation={userLocation}
        services={services}
        onServiceClick={onServiceClick}
      />
    </Suspense>
  );
};
