import { lazy, Suspense, useState, useEffect } from 'react';
import { SimulatedMap } from './SimulatedMap';
import { Skeleton } from '@/components/ui/skeleton';

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

  useEffect(() => {
    // Check if Mapbox token exists in localStorage
    const token = localStorage.getItem('mapbox_token');
    setHasMapboxToken(!!token);
  }, []);

  // Use simulated map as default (no Mapbox token needed)
  if (!hasMapboxToken) {
    return (
      <SimulatedMap
        userLocation={userLocation}
        services={services}
        onServiceClick={onServiceClick}
      />
    );
  }

  // Use real Mapbox map if token is configured - lazy loaded
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
