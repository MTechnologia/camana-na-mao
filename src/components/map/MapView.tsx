import { MapboxMap } from './MapboxMap';

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

export const MapView = ({ userLocation, services, onServiceClick }: MapViewProps) => {
  return (
    <MapboxMap
      userLocation={userLocation}
      services={services}
      onServiceClick={onServiceClick}
    />
  );
};
