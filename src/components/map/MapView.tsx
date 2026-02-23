import { lazy, Suspense } from 'react';
import { SimulatedMap } from './SimulatedMap';
import { Skeleton } from '@/components/ui/skeleton';

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
  const googleMapsKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;
  const useGoogleMaps = !!(googleMapsKey && googleMapsKey.trim().length > 0);

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

  return (
    <SimulatedMap
      userLocation={userLocation}
      services={services}
      onServiceClick={onServiceClick}
    />
  );
};
