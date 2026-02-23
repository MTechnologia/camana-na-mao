import { useEffect, useRef, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Navigation, MapPin } from 'lucide-react';
import { useLoadGoogleMaps } from '@/hooks/useLoadGoogleMaps';

interface Service {
  id: string;
  name: string;
  service_type: string;
  latitude: number;
  longitude: number;
  distance?: number;
  address?: string;
}

interface GoogleMapViewProps {
  userLocation: { latitude: number; longitude: number } | null;
  services: Service[];
  onServiceClick: (serviceId: string) => void;
}

const serviceIcons: Record<string, string> = {
  ubs: '🏥',
  school: '🏫',
  ceu: '🎭',
  hospital: '🏥',
  library: '📚',
  sports_center: '⚽',
  other: '📍',
};

export const GoogleMapView = ({ userLocation, services, onServiceClick }: GoogleMapViewProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;
  const { isLoaded, error } = useLoadGoogleMaps(apiKey);

  useEffect(() => {
    if (!isLoaded || !mapRef.current || !window.google?.maps) return;

    const center = userLocation
      ? { lat: userLocation.latitude, lng: userLocation.longitude }
      : { lat: -23.5505, lng: -46.6333 };

    const map = new google.maps.Map(mapRef.current, {
      center,
      zoom: 14,
      mapTypeControl: true,
      streetViewControl: false,
      fullscreenControl: true,
      zoomControl: true,
    });

    mapInstanceRef.current = map;

    return () => {
      markersRef.current.forEach((m) => m.setMap(null));
      markersRef.current = [];
      mapInstanceRef.current = null;
    };
  }, [isLoaded, userLocation?.latitude, userLocation?.longitude]);

  // User location marker
  useEffect(() => {
    if (!mapInstanceRef.current || !userLocation || !window.google?.maps) return;

    const marker = new google.maps.Marker({
      position: { lat: userLocation.latitude, lng: userLocation.longitude },
      map: mapInstanceRef.current,
      title: 'Você está aqui',
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 10,
        fillColor: '#3b82f6',
        fillOpacity: 1,
        strokeColor: '#fff',
        strokeWeight: 3,
      },
    });

    mapInstanceRef.current.setCenter({ lat: userLocation.latitude, lng: userLocation.longitude });

    return () => marker.setMap(null);
  }, [isLoaded, userLocation]);

  // Service markers
  useEffect(() => {
    if (!mapInstanceRef.current || !window.google?.maps) return;

    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    services.forEach((service) => {
      const marker = new google.maps.Marker({
        position: { lat: service.latitude, lng: service.longitude },
        map: mapInstanceRef.current!,
        title: service.name,
        label: {
          text: serviceIcons[service.service_type] || serviceIcons.other,
          fontSize: '20px',
        },
      });

      const infoContent = `
        <div style="padding:8px;min-width:160px;">
          <p style="font-weight:600;margin:0 0 4px;">${service.name}</p>
          ${service.distance != null ? `<p style="font-size:12px;color:#666;">${service.distance < 1000 ? Math.round(service.distance) + 'm' : (service.distance / 1000).toFixed(1) + 'km'}</p>` : ''}
        </div>
      `;
      const info = new google.maps.InfoWindow({ content: infoContent });

      marker.addListener('click', () => {
        info.open(mapInstanceRef.current!, marker);
        onServiceClick(service.id);
      });

      markersRef.current.push(marker);
    });
  }, [isLoaded, services, onServiceClick]);

  useEffect(() => {
    setLoadError(error ?? null);
  }, [error]);

  if (!apiKey) {
    return (
      <div className="flex items-center justify-center h-[500px] rounded-lg bg-muted text-muted-foreground text-sm">
        Chave Google Maps não configurada (VITE_GOOGLE_MAPS_API_KEY).
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex items-center justify-center h-[500px] rounded-lg bg-destructive/10 text-destructive text-sm">
        {loadError}
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="relative w-full h-[500px] rounded-lg overflow-hidden flex items-center justify-center bg-muted">
        <p className="text-sm text-muted-foreground">Carregando mapa...</p>
      </div>
    );
  }

  return (
    <>
      <div className="relative w-full h-[500px] rounded-lg overflow-hidden">
        <div ref={mapRef} className="absolute inset-0 w-full h-full" />

        <Card className="absolute bottom-4 left-4 p-3 shadow-lg z-10">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
            <div className="w-3 h-3 bg-primary rounded-full" />
            <span>Você está aqui</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <MapPin className="w-3 h-3" />
            <span>Serviços públicos</span>
          </div>
        </Card>

        {userLocation && (
          <Card
            className="absolute top-4 right-4 p-2 cursor-pointer hover:bg-secondary transition-colors z-10"
            onClick={() => {
              mapInstanceRef.current?.panTo({ lat: userLocation.latitude, lng: userLocation.longitude });
              mapInstanceRef.current?.setZoom(14);
            }}
          >
            <Navigation className="w-5 h-5 text-foreground" />
          </Card>
        )}
      </div>
    </>
  );
};
