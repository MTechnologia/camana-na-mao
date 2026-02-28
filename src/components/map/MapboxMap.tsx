import { useEffect, useMemo, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Card } from '@/components/ui/card';
import { Navigation, MapPin, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DirectionsDrawer } from './DirectionsDrawer';
import { useMapboxDirections } from '@/hooks/useMapboxDirections';
import { formatDistanceStraightLine } from '@/lib/mapUtils';

interface Service {
  id: string;
  name: string;
  service_type: string;
  latitude: number;
  longitude: number;
  distance?: number;
  address?: string;
}

interface MapboxMapProps {
  userLocation: { latitude: number; longitude: number } | null;
  services: Service[];
  onServiceClick: (serviceId: string) => void;
}

const getInitialToken = (): string => {
  const env = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
  if (env && typeof env === 'string' && env.startsWith('pk.')) return env;
  return typeof localStorage !== 'undefined' ? localStorage.getItem('mapbox_token') || '' : '';
};

export const MapboxMap = ({ userLocation, services, onServiceClick }: MapboxMapProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapboxToken, setMapboxToken] = useState<string>(getInitialToken);
  const [tokenSaved, setTokenSaved] = useState(() => {
    const t = getInitialToken();
    return !!(t && t.startsWith('pk.'));
  });
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [showDirections, setShowDirections] = useState(false);
  const [transportMode, setTransportMode] = useState<'walking' | 'driving' | 'cycling'>('walking');
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const routeLayerIdRef = useRef<string | null>(null);
  const servicesSourceId = 'services-cluster-source';
  const servicesClusterLayerId = 'services-clusters';
  const servicesClusterCountId = 'services-cluster-count';
  const servicesUnclusteredId = 'services-unclustered';
  const clickListenerRef = useRef<(() => void) | null>(null);

  const { getDirections, directions, loading, error } = useMapboxDirections(
    tokenSaved ? mapboxToken : null
  );

  const serviceIcons = useMemo<Record<string, string>>(() => ({
    ubs: "🏥",
    school: "🏫",
    ceu: "🎭",
    hospital: "🏥",
    library: "📚",
    sports_center: "⚽",
    street_market: "🛒",
    community_center: "🏘️",
    daycare: "🍼",
    park: "🌳",
    social_assistance: "🤝",
    police_station: "🚔",
    transit_station: "🚌",
    market: "🛒",
    city_market: "🏪",
    theater: "🎬",
    museum: "🏛️",
    cemetery: "🪦",
    accessibility: "♿",
    recycling_point: "♻️",
    fire_station: "🚒",
    other: "📍"
  }), []);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || !tokenSaved || !mapboxToken) return;

    mapboxgl.accessToken = mapboxToken;
    
    const center: [number, number] = userLocation 
      ? [userLocation.longitude, userLocation.latitude]
      : [-46.6333, -23.5505]; // São Paulo center

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center,
      zoom: 14,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    return () => {
      map.current?.remove();
    };
  }, [tokenSaved, mapboxToken, userLocation]);

  // Add user location marker
  useEffect(() => {
    if (!map.current || !userLocation) return;

    const el = document.createElement('div');
    el.className = 'user-location-marker';
    el.style.width = '20px';
    el.style.height = '20px';
    el.style.borderRadius = '50%';
    el.style.backgroundColor = '#3b82f6';
    el.style.border = '3px solid white';
    el.style.boxShadow = '0 0 10px rgba(59, 130, 246, 0.5)';

    new mapboxgl.Marker(el)
      .setLngLat([userLocation.longitude, userLocation.latitude])
      .addTo(map.current);

    map.current.flyTo({
      center: [userLocation.longitude, userLocation.latitude],
      zoom: 14,
    });
  }, [userLocation, tokenSaved]);

  // Serviços como source GeoJSON com clustering (evita sobreposição quando há muitos equipamentos)
  useEffect(() => {
    if (!map.current || !tokenSaved) return;

    const geojson: GeoJSON.FeatureCollection<GeoJSON.Point> = {
      type: 'FeatureCollection',
      features: services.map((s) => ({
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: [s.longitude, s.latitude] },
        properties: {
          id: s.id,
          name: s.name,
          service_type: s.service_type,
          distance: s.distance,
          icon: serviceIcons[s.service_type] || serviceIcons.other,
        },
      })),
    };

    const setupLayers = () => {
      if (!map.current) return;
      const mapInstance = map.current;

      if (mapInstance.getSource(servicesSourceId)) {
        mapInstance.removeLayer(servicesUnclusteredId);
        mapInstance.removeLayer(servicesClusterCountId);
        mapInstance.removeLayer(servicesClusterLayerId);
        mapInstance.removeSource(servicesSourceId);
      }

      mapInstance.addSource(servicesSourceId, {
        type: 'geojson',
        data: geojson,
        cluster: true,
        clusterMaxZoom: 16,
        clusterRadius: 50,
      });

      mapInstance.addLayer({
        id: servicesClusterLayerId,
        type: 'circle',
        source: servicesSourceId,
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': ['step', ['get', 'point_count'], 'hsl(var(--primary))', 10, '#ea580c', 50, '#b91c1c'],
          'circle-radius': ['step', ['get', 'point_count'], 20, 10, 28, 50, 36],
          'circle-stroke-width': 2,
          'circle-stroke-color': '#fff',
        },
      });

      mapInstance.addLayer({
        id: servicesClusterCountId,
        type: 'symbol',
        source: servicesSourceId,
        filter: ['has', 'point_count'],
        layout: {
          'text-field': ['get', 'point_count_abbreviated'],
          'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
          'text-size': 14,
        },
        paint: { 'text-color': '#fff' },
      });

      mapInstance.addLayer({
        id: servicesUnclusteredId,
        type: 'circle',
        source: servicesSourceId,
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-color': 'hsl(var(--primary))',
          'circle-radius': 10,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#fff',
        },
      });

      clickListenerRef.current?.();
      clickListenerRef.current = () => {
        mapInstance.off('click', servicesClusterLayerId, onClusterClick);
        mapInstance.off('click', servicesUnclusteredId, onPointClick);
      };

      const onClusterClick = (e: mapboxgl.MapMouseEvent) => {
        e.originalEvent.stopPropagation();
        const features = mapInstance.queryRenderedFeatures(e.point, { layers: [servicesClusterLayerId] });
        if (!features.length) return;
        const clusterId = features[0].properties?.cluster_id;
        if (clusterId == null) return;
        const source = mapInstance.getSource(servicesSourceId) as mapboxgl.GeoJSONSource;
        source.getClusterExpansionZoom(clusterId, (err, zoom) => {
          if (err || zoom == null) return;
          const geometry = features[0].geometry as GeoJSON.Point;
          mapInstance.flyTo({ center: geometry.coordinates as [number, number], zoom });
        });
      };

      const onPointClick = (e: mapboxgl.MapMouseEvent) => {
        e.originalEvent.stopPropagation();
        const features = mapInstance.queryRenderedFeatures(e.point, { layers: [servicesUnclusteredId] });
        if (!features.length) return;
        const props = features[0].properties;
        const serviceId = props?.id as string | undefined;
        if (!serviceId) return;
        const service = services.find((s) => s.id === serviceId);
        if (!service) return;
        setSelectedService(service);
        setShowDirections(true);
        if (userLocation) {
          getDirections(
            [userLocation.longitude, userLocation.latitude],
            [service.longitude, service.latitude],
            transportMode
          );
        }
        onServiceClick(service.id);

        const distanceText = service.distance != null ? formatDistanceStraightLine(service.distance) : '';
        const popup = new mapboxgl.Popup({ offset: 25 })
          .setHTML(
            `<div style="padding:8px;"><p style="font-weight:600;margin-bottom:4px;">${service.name}</p>${distanceText ? `<p style="font-size:12px;color:#666;">${distanceText}</p>` : ''}</div>`
          )
          .setLngLat([service.longitude, service.latitude])
          .addTo(mapInstance);
        setTimeout(() => popup.remove(), 3000);
      };

      mapInstance.on('click', servicesClusterLayerId, onClusterClick);
      mapInstance.on('click', servicesUnclusteredId, onPointClick);
      mapInstance.getCanvas().style.cursor = 'pointer';
    };

    if (map.current.isStyleLoaded()) {
      setupLayers();
    } else {
      map.current.once('load', setupLayers);
    }

    return () => {
      clickListenerRef.current?.();
      if (map.current?.getSource(servicesSourceId)) {
        map.current.removeLayer(servicesUnclusteredId);
        map.current.removeLayer(servicesClusterCountId);
        map.current.removeLayer(servicesClusterLayerId);
        map.current.removeSource(servicesSourceId);
      }
    };
  }, [services, tokenSaved, userLocation, transportMode]);

  // Draw route on map
  useEffect(() => {
    if (!map.current || !directions) return;

    // Remove existing route layer
    if (routeLayerIdRef.current && map.current.getLayer(routeLayerIdRef.current)) {
      map.current.removeLayer(routeLayerIdRef.current);
      map.current.removeSource(routeLayerIdRef.current);
    }

    const routeLayerId = 'route-' + Date.now();
    routeLayerIdRef.current = routeLayerId;

    map.current.addSource(routeLayerId, {
      type: 'geojson',
      data: directions.route as GeoJSON.Feature,
    });

    map.current.addLayer({
      id: routeLayerId,
      type: 'line',
      source: routeLayerId,
      layout: {
        'line-join': 'round',
        'line-cap': 'round',
      },
      paint: {
        'line-color': '#3b82f6',
        'line-width': 4,
        'line-opacity': 0.8,
      },
    });

    // Fit map to route bounds
    const coordinates = (directions.route.geometry as GeoJSON.LineString).coordinates;
    const bounds = coordinates.reduce((bounds: mapboxgl.LngLatBounds, coord: [number, number]) => {
      return bounds.extend(coord as [number, number]);
    }, new mapboxgl.LngLatBounds(coordinates[0], coordinates[0]));

    map.current.fitBounds(bounds, { padding: 50 });
  }, [directions]);

  const handleModeChange = (mode: 'walking' | 'driving' | 'cycling') => {
    setTransportMode(mode);
    if (selectedService && userLocation) {
      getDirections(
        [userLocation.longitude, userLocation.latitude],
        [selectedService.longitude, selectedService.latitude],
        mode
      );
    }
  };

  if (!tokenSaved) {
    return (
      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-primary mt-1" />
            <div>
              <h3 className="font-semibold text-foreground mb-2">
                Configure o token do Mapbox
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Para usar o mapa interativo com rotas, você precisa de um token público do Mapbox.
                Crie uma conta gratuita em{' '}
                <a 
                  href="https://mapbox.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  mapbox.com
                </a>
                {' '}e obtenha seu token na seção Tokens.
              </p>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="mapbox-token">Token Público do Mapbox</Label>
            <Input
              id="mapbox-token"
              type="text"
              placeholder="pk.eyJ1..."
              value={mapboxToken}
              onChange={(e) => setMapboxToken(e.target.value)}
            />
          </div>
          
          <Button
            onClick={() => {
              if (mapboxToken.startsWith('pk.')) {
                try {
                  localStorage.setItem('mapbox_token', mapboxToken);
                } catch (_) { /* ignore */ }
                setTokenSaved(true);
              }
            }}
            disabled={!mapboxToken.startsWith('pk.')}
            className="w-full"
          >
            Salvar e Carregar Mapa
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <>
      <div className="relative w-full h-[500px] rounded-lg overflow-hidden">
        <div ref={mapContainer} className="absolute inset-0" />

        {/* Legend */}
        <Card className="absolute bottom-4 left-4 p-3 shadow-lg">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
            <div className="w-3 h-3 bg-primary rounded-full" />
            <span>Você está aqui</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <MapPin className="w-3 h-3" />
            <span>Serviços públicos</span>
          </div>
        </Card>

        {/* Recenter button */}
        {userLocation && (
          <Card 
            className="absolute top-4 right-4 p-2 cursor-pointer hover:bg-secondary transition-colors"
            onClick={() => {
              if (map.current && userLocation) {
                map.current.flyTo({
                  center: [userLocation.longitude, userLocation.latitude],
                  zoom: 14,
                });
              }
            }}
          >
            <Navigation className="w-5 h-5 text-foreground" />
          </Card>
        )}

        {loading && (
          <Card className="absolute top-4 left-1/2 -translate-x-1/2 p-3 shadow-lg">
            <p className="text-sm text-foreground">Calculando rota...</p>
          </Card>
        )}

        {error && (
          <Card className="absolute top-4 left-1/2 -translate-x-1/2 p-3 shadow-lg bg-destructive/10 border-destructive">
            <p className="text-sm text-destructive">{error}</p>
          </Card>
        )}
      </div>

      {selectedService && (
        <DirectionsDrawer
          open={showDirections}
          onClose={() => {
            setShowDirections(false);
            setSelectedService(null);
            // Remove route layer
            if (map.current && routeLayerIdRef.current) {
              if (map.current.getLayer(routeLayerIdRef.current)) {
                map.current.removeLayer(routeLayerIdRef.current);
                map.current.removeSource(routeLayerIdRef.current);
              }
              routeLayerIdRef.current = null;
            }
          }}
          directions={directions}
          serviceName={selectedService.name}
          serviceAddress={selectedService.address || 'Endereço não disponível'}
          origin={userLocation ? [userLocation.longitude, userLocation.latitude] : [0, 0]}
          destination={[selectedService.longitude, selectedService.latitude]}
          onModeChange={handleModeChange}
          currentMode={transportMode}
        />
      )}
    </>
  );
};
