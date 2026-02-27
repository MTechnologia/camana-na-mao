import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Navigation } from "lucide-react";
import { formatDistance, formatDistanceStraightLine, getServiceDisplayName } from "@/lib/mapUtils";

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

interface SimulatedMapProps {
  userLocation: { latitude: number; longitude: number } | null;
  services: Service[];
  onServiceClick: (serviceId: string) => void;
  distanceLabel?: "walking" | "straight";
}

const serviceIcons: Record<string, string> = {
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
};

/** Agrupa serviços por proximidade (grid ~200m) para reduzir sobreposição visual. */
function clusterServicesByProximity(services: Service[], maxItems: number): { type: "single"; service: Service } | { type: "cluster"; services: Service[] }[] {
  if (services.length <= maxItems) {
    return services.map((service) => ({ type: "single" as const, service }));
  }
  const grid = new Map<string, Service[]>();
  const precision = 1e3; // ~100m
  for (const s of services) {
    const key = `${Math.round(s.latitude * precision)}_${Math.round(s.longitude * precision)}`;
    if (!grid.has(key)) grid.set(key, []);
    grid.get(key)!.push(s);
  }
  const clusters = Array.from(grid.values())
    .map((list): { type: "cluster"; services: Service[] } => ({ type: "cluster", services: list }))
    .sort((a, b) => b.services.length - a.services.length);
  const result: ({ type: "single"; service: Service } | { type: "cluster"; services: Service[] })[] = [];
  for (const c of clusters) {
    if (result.length >= maxItems) break;
    if (c.services.length === 1) result.push({ type: "single", service: c.services[0] });
    else result.push(c);
  }
  return result;
}

export const SimulatedMap = ({ userLocation, services, onServiceClick, distanceLabel = "straight" }: SimulatedMapProps) => {
  const displayItems = clusterServicesByProximity(services, 8);

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

      {/* Demo banner + instrução Google Maps */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2 text-center px-4">
        <Badge variant="secondary" className="shadow-lg">
          <Navigation className="w-3 h-3 mr-1" />
          Mapa de Demonstração
        </Badge>
        <p className="text-xs text-muted-foreground max-w-xs">
          Para ver o mapa com ruas: em <strong>desenvolvimento</strong>, configure{" "}
          <code className="text-[10px] bg-muted px-1 rounded">VITE_GOOGLE_MAPS_API_KEY</code> no{" "}
          <code className="text-[10px] bg-muted px-1 rounded">.env</code> e reinicie{" "}
          <code className="text-[10px] bg-muted px-1 rounded">npm run dev</code>. Em{" "}
          <strong>build/deploy</strong>, defina a variável no momento do build (ex.: variáveis de substituição do Cloud Build).
        </p>
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

      {/* Services list overlay com clustering (evita muitos cards sobrepostos) */}
      <div className="absolute inset-x-4 bottom-4 max-h-[300px] overflow-y-auto space-y-2">
        {displayItems.map((item, index) => {
          if (item.type === "single") {
            const service = item.service;
            return (
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
                      {getServiceDisplayName({ name: service.name, address: service.address, district: service.district, service_type: service.service_type })}
                    </p>
                    {service.distance != null && (
                      <p className="text-xs text-muted-foreground">
                        {distanceLabel === "walking" ? formatDistance(service.distance) : formatDistanceStraightLine(service.distance)}
                      </p>
                    )}
                  </div>
                  <Badge variant="outline" className="shrink-0">
                    Ver
                  </Badge>
                </CardContent>
              </Card>
            );
          }
          const [first, ...rest] = item.services;
          const count = item.services.length;
          return (
            <Card
              key={`cluster-${first.id}-${count}`}
              className="cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02] bg-background/95 backdrop-blur-sm border-primary/30"
              onClick={() => onServiceClick(first.id)}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <CardContent className="p-3 flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center text-lg font-bold text-primary shrink-0">
                  {count}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-foreground line-clamp-1">
                    {count} equipamentos próximos
                  </p>
                  <p className="text-xs text-muted-foreground line-clamp-1">
                    {getServiceDisplayName({ name: first.name, address: first.address, district: first.district, service_type: first.service_type })}{rest.length ? " e outros" : ""}
                  </p>
                </div>
                <Badge variant="secondary" className="shrink-0">
                  Ver
                </Badge>
              </CardContent>
            </Card>
          );
        })}
        {services.length > 0 && displayItems.length === 0 && (
          <p className="text-xs text-center text-muted-foreground py-2">
            Nenhum card exibido (agrupamento ativo)
          </p>
        )}
      </div>

      {/* Decorative elements */}
      <div className="absolute top-32 right-8 w-16 h-16 bg-primary/5 rounded-full blur-xl" />
      <div className="absolute bottom-32 left-8 w-20 h-20 bg-accent/10 rounded-full blur-xl" />
    </div>
  );
};
