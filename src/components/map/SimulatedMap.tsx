import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Navigation } from "lucide-react";

interface Service {
  id: string;
  name: string;
  service_type: string;
  latitude: number;
  longitude: number;
  distance?: number;
}

interface SimulatedMapProps {
  userLocation: { latitude: number; longitude: number } | null;
  services: Service[];
  onServiceClick: (serviceId: string) => void;
}

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
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(meters / 1000).toFixed(1)}km`;
};

export const SimulatedMap = ({ userLocation, services, onServiceClick }: SimulatedMapProps) => {
  return (
    <div className="relative w-full h-[500px] bg-gradient-to-br from-secondary/20 via-background to-secondary/10 rounded-lg border-2 border-dashed border-muted-foreground/30 overflow-hidden">
      {/* Background grid pattern */}
      <div className="absolute inset-0" style={{
        backgroundImage: `
          linear-gradient(to right, hsl(var(--muted-foreground) / 0.05) 1px, transparent 1px),
          linear-gradient(to bottom, hsl(var(--muted-foreground) / 0.05) 1px, transparent 1px)
        `,
        backgroundSize: '30px 30px'
      }} />

      {/* Demo banner */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10">
        <Badge variant="secondary" className="shadow-lg">
          <Navigation className="w-3 h-3 mr-1" />
          Mapa de Demonstração
        </Badge>
      </div>

      {/* User location marker */}
      {userLocation && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 z-20">
          <div className="relative">
            <div className="w-12 h-12 bg-primary rounded-full shadow-xl flex items-center justify-center animate-pulse">
              <MapPin className="w-6 h-6 text-primary-foreground" />
            </div>
            <Badge variant="default" className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap shadow-md">
              Você está aqui
            </Badge>
          </div>
        </div>
      )}

      {/* Services list overlay */}
      <div className="absolute inset-x-4 bottom-4 max-h-[300px] overflow-y-auto space-y-2">
        {services.slice(0, 8).map((service, index) => (
          <Card
            key={service.id}
            className="cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02] bg-background/95 backdrop-blur-sm"
            onClick={() => onServiceClick(service.id)}
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <CardContent className="p-3 flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-2xl shrink-0">
                {serviceIcons[service.service_type] || serviceIcons.other}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-foreground line-clamp-1">
                  {service.name}
                </p>
                {service.distance && (
                  <p className="text-xs text-muted-foreground">
                    {formatDistance(service.distance)}
                  </p>
                )}
              </div>
              <Badge variant="outline" className="shrink-0">
                Ver
              </Badge>
            </CardContent>
          </Card>
        ))}
        {services.length > 8 && (
          <p className="text-xs text-center text-muted-foreground py-2">
            +{services.length - 8} serviços adicionais
          </p>
        )}
      </div>

      {/* Decorative elements */}
      <div className="absolute top-32 right-8 w-16 h-16 bg-primary/5 rounded-full blur-xl" />
      <div className="absolute bottom-32 left-8 w-20 h-20 bg-accent/10 rounded-full blur-xl" />
    </div>
  );
};
