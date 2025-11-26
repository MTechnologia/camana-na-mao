import { useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { MapPin, Navigation } from 'lucide-react';

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
  const mapContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Aqui será implementada a integração com um serviço de mapas
    // Por enquanto, mostramos uma visualização estática
  }, [userLocation, services]);

  const serviceIcons: Record<string, string> = {
    ubs: "🏥",
    school: "🏫",
    ceu: "🎭",
    hospital: "🏥",
    library: "📚",
    sports_center: "⚽",
    other: "📍"
  };

  const formatDistance = (meters?: number) => {
    if (!meters) return '';
    if (meters < 1000) {
      return `${Math.round(meters)}m`;
    }
    return `${(meters / 1000).toFixed(1)}km`;
  };

  return (
    <div className="relative w-full h-[500px] rounded-lg overflow-hidden">
      {/* Map Container */}
      <div 
        ref={mapContainerRef}
        className="absolute inset-0 bg-secondary/30"
        style={{
          backgroundImage: `
            linear-gradient(to right, hsl(var(--border)) 1px, transparent 1px),
            linear-gradient(to bottom, hsl(var(--border)) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px'
        }}
      >
        {/* User Location Marker */}
        {userLocation && (
          <div 
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10"
            style={{ animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' }}
          >
            <div className="relative">
              <div className="w-4 h-4 bg-primary rounded-full border-2 border-white shadow-lg" />
              <div className="absolute inset-0 w-4 h-4 bg-primary rounded-full animate-ping opacity-75" />
            </div>
          </div>
        )}

        {/* Service Markers */}
        {services.map((service, index) => {
          // Calculate position relative to user (simplified visualization)
          const angle = (index * (360 / services.length)) * (Math.PI / 180);
          const radius = 100 + (service.distance || 0) / 50;
          const x = 50 + radius * Math.cos(angle);
          const y = 50 + radius * Math.sin(angle);

          return (
            <div
              key={service.id}
              className="absolute cursor-pointer group"
              style={{
                left: `${x}%`,
                top: `${y}%`,
                transform: 'translate(-50%, -50%)'
              }}
              onClick={() => onServiceClick(service.id)}
            >
              <div className="relative">
                {/* Marker */}
                <div className="w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center text-lg border-2 border-primary group-hover:scale-110 transition-transform">
                  {serviceIcons[service.service_type] || serviceIcons.other}
                </div>
                
                {/* Info Card on Hover */}
                <Card className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 p-2 min-w-[150px] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-lg">
                  <p className="text-xs font-semibold text-foreground line-clamp-2">
                    {service.name}
                  </p>
                  {service.distance && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDistance(service.distance)}
                    </p>
                  )}
                </Card>
              </div>
            </div>
          );
        })}
      </div>

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

      {/* Controls */}
      <div className="absolute top-4 right-4 flex flex-col gap-2">
        <Card className="p-2 cursor-pointer hover:bg-secondary transition-colors">
          <Navigation className="w-5 h-5 text-foreground" />
        </Card>
      </div>
    </div>
  );
};
