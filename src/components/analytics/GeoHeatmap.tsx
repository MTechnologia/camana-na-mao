import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';

interface GeoPoint {
  id: string;
  latitude: number;
  longitude: number;
  category: string;
  severity: string;
  description?: string;
}

interface GeoHeatmapProps {
  data?: GeoPoint[];
  mapboxToken?: string;
  onPointClick?: (point: GeoPoint) => void;
}

export const GeoHeatmap = ({ data, mapboxToken, onPointClick }: GeoHeatmapProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [points, setPoints] = useState<GeoPoint[]>(data || []);
  const [isLoading, setIsLoading] = useState(!data);
  const [hasToken, setHasToken] = useState(!!mapboxToken);

  useEffect(() => {
    const loadPoints = async () => {
      if (data) {
        setPoints(data);
        setIsLoading(false);
        return;
      }

      try {
        const { data: urbanReports } = await supabase
          .from('urban_reports')
          .select('id, latitude, longitude, category, severity, description')
          .not('latitude', 'is', null)
          .not('longitude', 'is', null)
          .limit(500);

        const validPoints: GeoPoint[] = (urbanReports || [])
          .filter(r => r.latitude && r.longitude)
          .map(r => ({
            id: r.id,
            latitude: r.latitude!,
            longitude: r.longitude!,
            category: r.category,
            severity: r.severity || 'medium',
            description: r.description || undefined
          }));

        setPoints(validPoints);
      } catch (error) {
        console.error('Error loading geo points:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadPoints();
  }, [data]);

  useEffect(() => {
    if (!mapContainer.current || !mapboxToken || points.length === 0) return;

    mapboxgl.accessToken = mapboxToken;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: [-46.6333, -23.5505], // São Paulo center
      zoom: 11,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    map.current.on('load', () => {
      if (!map.current) return;

      // Add source
      map.current.addSource('reports', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: points.map(point => ({
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates: [point.longitude, point.latitude]
            },
            properties: {
              id: point.id,
              category: point.category,
              severity: point.severity,
              description: point.description
            }
          }))
        },
        cluster: true,
        clusterMaxZoom: 14,
        clusterRadius: 50
      });

      // Add cluster layer
      map.current.addLayer({
        id: 'clusters',
        type: 'circle',
        source: 'reports',
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': [
            'step',
            ['get', 'point_count'],
            'hsl(200, 70%, 50%)',
            10, 'hsl(45, 70%, 50%)',
            30, 'hsl(0, 70%, 50%)'
          ],
          'circle-radius': [
            'step',
            ['get', 'point_count'],
            20, 10, 30, 30, 40
          ]
        }
      });

      // Add cluster count text
      map.current.addLayer({
        id: 'cluster-count',
        type: 'symbol',
        source: 'reports',
        filter: ['has', 'point_count'],
        layout: {
          'text-field': ['get', 'point_count_abbreviated'],
          'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
          'text-size': 12
        },
        paint: {
          'text-color': '#ffffff'
        }
      });

      // Add unclustered points
      map.current.addLayer({
        id: 'unclustered-point',
        type: 'circle',
        source: 'reports',
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-color': [
            'match',
            ['get', 'severity'],
            'critical', '#ef4444',
            'high', '#f97316',
            'medium', '#eab308',
            'low', '#22c55e',
            '#3b82f6'
          ],
          'circle-radius': 8,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#fff'
        }
      });

      // Click events
      map.current.on('click', 'clusters', (e) => {
        const features = map.current!.queryRenderedFeatures(e.point, { layers: ['clusters'] });
        if (!features.length) return;
        
        const clusterId = features[0].properties?.cluster_id;
        const source = map.current!.getSource('reports') as mapboxgl.GeoJSONSource;
        
        source.getClusterExpansionZoom(clusterId, (err, zoom) => {
          if (err || !map.current) return;
          
          const geometry = features[0].geometry;
          if (geometry.type === 'Point') {
            map.current.easeTo({
              center: geometry.coordinates as [number, number],
              zoom: zoom || 14
            });
          }
        });
      });

      map.current.on('click', 'unclustered-point', (e) => {
        if (!e.features?.length) return;
        const props = e.features[0].properties;
        const point = points.find(p => p.id === props?.id);
        if (point && onPointClick) {
          onPointClick(point);
        }
      });

      // Cursor styles
      map.current.on('mouseenter', 'clusters', () => {
        if (map.current) map.current.getCanvas().style.cursor = 'pointer';
      });
      map.current.on('mouseleave', 'clusters', () => {
        if (map.current) map.current.getCanvas().style.cursor = '';
      });
      map.current.on('mouseenter', 'unclustered-point', () => {
        if (map.current) map.current.getCanvas().style.cursor = 'pointer';
      });
      map.current.on('mouseleave', 'unclustered-point', () => {
        if (map.current) map.current.getCanvas().style.cursor = '';
      });
    });

    return () => {
      map.current?.remove();
    };
  }, [points, mapboxToken, onPointClick]);

  if (isLoading) {
    return <Skeleton className="w-full h-full min-h-[400px]" />;
  }

  if (!mapboxToken) {
    return (
      <div className="w-full h-full min-h-[400px] flex flex-col items-center justify-center bg-muted/30 rounded-lg border border-dashed border-border">
        <p className="text-muted-foreground text-center mb-2">
          Token Mapbox não configurado
        </p>
        <p className="text-xs text-muted-foreground text-center max-w-md">
          Configure o token MAPBOX_PUBLIC_TOKEN nas configurações do backend para visualizar o mapa de calor.
        </p>
      </div>
    );
  }

  if (points.length === 0) {
    return (
      <div className="w-full h-full min-h-[400px] flex flex-col items-center justify-center bg-muted/30 rounded-lg border border-dashed border-border">
        <p className="text-muted-foreground text-center">
          Nenhum relato com geolocalização encontrado
        </p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full min-h-[400px]">
      <div ref={mapContainer} className="absolute inset-0 rounded-lg overflow-hidden" />
      
      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-background/90 backdrop-blur-sm rounded-lg p-3 border border-border">
        <p className="text-xs font-medium text-foreground mb-2">Severidade</p>
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#ef4444]" />
            <span className="text-xs text-muted-foreground">Crítico</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#f97316]" />
            <span className="text-xs text-muted-foreground">Alto</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#eab308]" />
            <span className="text-xs text-muted-foreground">Médio</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#22c55e]" />
            <span className="text-xs text-muted-foreground">Baixo</span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="absolute top-4 right-4">
        <Badge variant="secondary" className="bg-background/90 backdrop-blur-sm">
          {points.length} pontos
        </Badge>
      </div>
    </div>
  );
};
