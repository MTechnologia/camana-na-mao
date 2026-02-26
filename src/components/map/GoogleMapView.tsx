import { useEffect, useRef, useState } from 'react';
import { MarkerClusterer } from '@googlemaps/markerclusterer';
import { Card } from '@/components/ui/card';
import { Navigation, MapPin } from 'lucide-react';
import { useLoadGoogleMaps } from '@/hooks/useLoadGoogleMaps';
import { getServiceDisplayName, buildGoogleMapsUrl, formatDistance, formatDistanceStraightLine } from '@/lib/mapUtils';

interface Service {
  id: string;
  name: string;
  service_type: string;
  latitude: number;
  longitude: number;
  distance?: number;
  address?: string;
  district?: string;
}

interface GoogleMapViewProps {
  userLocation: { latitude: number; longitude: number } | null;
  services: Service[];
  onServiceClick: (serviceId: string) => void;
  distanceLabel?: 'walking' | 'straight';
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

export const GoogleMapView = ({ userLocation, services, onServiceClick, distanceLabel = 'straight' }: GoogleMapViewProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const clustererRef = useRef<MarkerClusterer | null>(null);
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
      clustererRef.current?.clearMarkers();
      clustererRef.current = null;
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

  // Service markers com clustering (evita sobreposição quando há muitos equipamentos)
  useEffect(() => {
    if (!mapInstanceRef.current || !window.google?.maps) return;

    clustererRef.current?.clearMarkers();
    clustererRef.current = null;
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    const markers: google.maps.Marker[] = [];
    services.forEach((service) => {
      const displayName = getServiceDisplayName({
        name: service.name,
        address: service.address,
        district: service.district,
        service_type: service.service_type,
      });
      const marker = new google.maps.Marker({
        position: { lat: service.latitude, lng: service.longitude },
        title: displayName,
        label: {
          text: serviceIcons[service.service_type] || serviceIcons.other,
          fontSize: '20px',
        },
      });

      const mapsUrl = userLocation
        ? buildGoogleMapsUrl(userLocation.latitude, userLocation.longitude, service.latitude, service.longitude)
        : `https://www.google.com/maps?q=${service.latitude},${service.longitude}`;
      const distanceText = service.distance != null
        ? (distanceLabel === 'walking' ? formatDistance(service.distance) : formatDistanceStraightLine(service.distance))
        : '';
      const infoContent = `
        <div style="padding:8px;min-width:180px;">
          <p style="font-weight:600;margin:0 0 4px;">${displayName.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>
          ${distanceText ? `<p style="font-size:12px;color:#666;">${distanceText.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>` : ''}
          <a href="${mapsUrl.replace(/&/g, '&amp;').replace(/"/g, '&quot;')}" target="_blank" rel="noopener noreferrer" style="font-size:12px;color:#1976d2;margin-top:6px;display:inline-block;">Como chegar</a>
        </div>
      `;
      const info = new google.maps.InfoWindow({ content: infoContent });

      marker.addListener('click', () => {
        info.open(mapInstanceRef.current!, marker);
        onServiceClick(service.id);
      });

      markers.push(marker);
    });

    markersRef.current = markers;
    if (markers.length > 0) {
      clustererRef.current = new MarkerClusterer({
        map: mapInstanceRef.current,
        markers,
        // Renderer padrão: círculos com contagem; ao dar zoom os clusters se separam em marcadores individuais
      });
    }
  }, [isLoaded, services, onServiceClick, userLocation]);

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
