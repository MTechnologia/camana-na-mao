import { Card, CardContent } from "@/components/ui/card";
import { MapPin, Phone, ExternalLink, Clock, Info } from "lucide-react";
import { RatingStars } from "./RatingStars";
import { cn } from "@/lib/utils";
import { formatDistance, formatDistanceStraightLine, buildGoogleMapsUrl, getAddressDisplay, getOpeningHoursText } from "@/lib/mapUtils";

interface ServiceCardProps {
  id: string;
  name: string;
  serviceType: string;
  address: string;
  district: string;
  distance?: number;
  /** "walking" = a pé; "driving" = de carro; "straight" = em linha reta */
  distanceLabel?: "walking" | "driving" | "straight";
  averageRating: number;
  totalRatings: number;
  phone?: string | null;
  /** Coordenadas do serviço para link "Abrir no Google Maps" */
  latitude?: number;
  longitude?: number;
  /** Localização do usuário para "Como chegar" (rotas) */
  userLatitude?: number | null;
  userLongitude?: number | null;
  /** Horário de funcionamento (JSONB com .text ou string) */
  openingHours?: unknown;
  /** O que o serviço oferece (descrição) */
  servicesOffered?: string | null;
  onClick?: () => void;
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

const serviceLabels: Record<string, string> = {
  ubs: "UBS",
  school: "Escola",
  ceu: "CEU",
  hospital: "Hospital",
  library: "Biblioteca",
  sports_center: "Centro Esportivo",
  street_market: "Feira",
  community_center: "Centro Comunitário",
  daycare: "Creche",
  park: "Parque",
  social_assistance: "Assistência Social",
  police_station: "Delegacia",
  transit_station: "Transporte",
  market: "Mercado",
  city_market: "Mercado Municipal",
  theater: "Teatro/Cinema",
  museum: "Museu",
  cemetery: "Cemitério",
  accessibility: "Acessibilidade",
  recycling_point: "Reciclagem/Limpeza",
  fire_station: "Bombeiros",
  other: "Outro"
};

export const ServiceCard = ({
  name,
  serviceType,
  address,
  district,
  distance,
  distanceLabel = "straight",
  averageRating,
  totalRatings,
  phone,
  latitude,
  longitude,
  userLatitude,
  userLongitude,
  openingHours,
  servicesOffered,
  onClick
}: ServiceCardProps) => {
  const openingHoursText = getOpeningHoursText(openingHours);
  const hasCoords = typeof latitude === "number" && typeof longitude === "number" && !Number.isNaN(latitude) && !Number.isNaN(longitude);
  const hasUserCoords = typeof userLatitude === "number" && typeof userLongitude === "number" && !Number.isNaN(userLatitude) && !Number.isNaN(userLongitude);
  const mapsUrl = hasCoords
    ? hasUserCoords
      ? buildGoogleMapsUrl(userLatitude!, userLongitude!, latitude!, longitude!)
      : `https://www.google.com/maps?q=${latitude},${longitude}`
    : null;

  return (
    <Card 
      className={cn(
        "transition-all hover:shadow-md",
        onClick && "cursor-pointer"
      )}
      onClick={onClick}
      data-testid="service-card"
    >
      <CardContent className="p-4">
        <div className="flex gap-3">
          <div className="text-3xl" aria-hidden="true">
            {serviceIcons[serviceType] || serviceIcons.other}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-1">
              <h3 className="font-semibold text-foreground line-clamp-2">
                {name}
              </h3>
              {distance !== undefined && (
                <span
                  className="text-xs font-medium text-primary whitespace-nowrap"
                  title={distanceLabel === "walking" ? "Distância a pé (rota real)" : distanceLabel === "driving" ? "Distância de carro (rota real)" : "Distância em linha reta. A rota no mapa pode ser maior."}
                >
                  {distanceLabel === "straight" ? formatDistanceStraightLine(distance) : formatDistance(distance)}
                </span>
              )}
            </div>
            
            <p className="text-xs text-muted-foreground mb-1">
              {serviceLabels[serviceType] || "Serviço Público"}
            </p>
            
            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
              <MapPin className="w-3 h-3 shrink-0" />
              <span className="line-clamp-1">{getAddressDisplay(address, district)}</span>
            </div>

            {openingHoursText && (
              <div className="flex items-start gap-1 text-xs text-muted-foreground mb-1">
                <Clock className="w-3 h-3 shrink-0 mt-0.5" />
                <span className="line-clamp-2">{openingHoursText}</span>
              </div>
            )}
            {servicesOffered?.trim() && (
              <div className="flex items-start gap-1 text-xs text-muted-foreground mb-2">
                <Info className="w-3 h-3 shrink-0 mt-0.5" />
                <span className="line-clamp-3">{servicesOffered.trim()}</span>
              </div>
            )}

            {mapsUrl && (
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline mb-2"
                onClick={(e) => e.stopPropagation()}
              >
                <ExternalLink className="w-3 h-3" />
                {hasUserCoords ? "Como chegar" : "Abrir no Google Maps"}
              </a>
            )}
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <RatingStars rating={averageRating} readonly size="sm" />
                <span className="text-xs text-muted-foreground">
                  ({totalRatings})
                </span>
              </div>
              
              {phone && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Phone className="w-3 h-3" />
                  <span>{phone}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
