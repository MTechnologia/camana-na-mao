import { MapboxMap } from './MapboxMap';
import { SimulatedMap } from './SimulatedMap';
import { useState, useEffect } from 'react';

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

  // Use real Mapbox map if token is configured
  return (
    <MapboxMap
      userLocation={userLocation}
      services={services}
      onServiceClick={onServiceClick}
    />
  );
};
