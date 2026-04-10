import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Phone, ExternalLink, Clock, Info, Heart } from "lucide-react";
import { ServiceTypeIcon } from "@/components/icons";
import { RatingStars } from "./RatingStars";
import { cn } from "@/lib/utils";
import { formatDistance, formatDistanceStraightLine, buildGoogleMapsUrl, getAddressDisplay, getOpeningHoursText } from "@/lib/mapUtils";
import { Badge } from "@/components/ui/badge";
import { LowRatingVerificationBadge } from "@/components/services/LowRatingVerificationBadge";

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
  /** Status operacional vindo do banco */
  operationalStatus?: "open" | "closed" | "maintenance" | null;
  onClick?: () => void;
  /** Favorito (lista Perto de você) */
  isFavorite?: boolean;
  /** Clique no coração — use stopPropagation no handler */
  onFavoriteClick?: (e: MouseEvent<HTMLButtonElement>) => void | Promise<void>;
  favoriteDisabled?: boolean;
}

const operationalStatusLabels: Record<"open" | "closed" | "maintenance", string> = {
  open: "Aberto",
  closed: "Fechado",
  maintenance: "Em manutenção",
};

const operationalStatusStyles: Record<"open" | "closed" | "maintenance", string> = {
  open: "border-emerald-500/40 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  closed: "border-rose-500/40 bg-rose-500/15 text-rose-700 dark:text-rose-300",
  maintenance: "border-amber-500/40 bg-amber-500/15 text-amber-700 dark:text-amber-300",
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
  operationalStatus,
  onClick,
  isFavorite = false,
  onFavoriteClick,
  favoriteDisabled = false,
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
          <div className="shrink-0" aria-hidden="true">
            <ServiceTypeIcon serviceType={serviceType} size={40} />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-1">
              <h3 className="font-semibold text-foreground line-clamp-2 min-w-0 pr-1">
                {name}
              </h3>
              <div className="flex items-center gap-1 shrink-0">
                {onFavoriteClick && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-full text-muted-foreground hover:text-primary"
                    disabled={favoriteDisabled}
                    aria-label={isFavorite ? "Remover dos favoritos" : "Adicionar aos favoritos"}
                    aria-pressed={isFavorite}
                    onClick={(e) => {
                      e.stopPropagation();
                      onFavoriteClick(e);
                    }}
                  >
                    <Heart
                      className={cn("h-4 w-4", isFavorite && "fill-primary text-primary")}
                      aria-hidden
                    />
                  </Button>
                )}
                {distance !== undefined && (
                  <span
                    className="text-xs font-medium text-primary whitespace-nowrap"
                    title={distanceLabel === "walking" ? "Distância a pé (rota real)" : distanceLabel === "driving" ? "Distância de carro (rota real)" : "Distância aproximada"}
                  >
                    {distanceLabel === "straight" ? formatDistanceStraightLine(distance) : formatDistance(distance)}
                  </span>
                )}
              </div>
            </div>
            
            <p className="text-xs text-muted-foreground mb-1">
              {serviceLabels[serviceType] || "Serviço Público"}
            </p>

            {operationalStatus && (
              <div className="mb-2">
                <Badge
                  variant="outline"
                  className={cn("text-[11px]", operationalStatusStyles[operationalStatus])}
                >
                  {operationalStatusLabels[operationalStatus]}
                </Badge>
              </div>
            )}
            
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
            
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap min-w-0">
                <RatingStars rating={averageRating} readonly size="sm" />
                <span className="text-xs text-muted-foreground">
                  ({totalRatings})
                </span>
                <LowRatingVerificationBadge
                  averageRating={averageRating}
                  totalRatings={totalRatings}
                  compact
                />
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
