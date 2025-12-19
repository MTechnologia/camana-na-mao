import { Card, CardContent } from "@/components/ui/card";
import { MapPin, Phone } from "lucide-react";
import { RatingStars } from "./RatingStars";
import { cn } from "@/lib/utils";
import { formatDistance } from "@/lib/mapUtils";

interface ServiceCardProps {
  id: string;
  name: string;
  serviceType: string;
  address: string;
  district: string;
  distance?: number;
  averageRating: number;
  totalRatings: number;
  phone?: string | null;
  onClick?: () => void;
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

const serviceLabels: Record<string, string> = {
  ubs: "UBS",
  school: "Escola",
  ceu: "CEU",
  hospital: "Hospital",
  library: "Biblioteca",
  sports_center: "Centro Esportivo",
  other: "Outro"
};

export const ServiceCard = ({
  name,
  serviceType,
  address,
  district,
  distance,
  averageRating,
  totalRatings,
  phone,
  onClick
}: ServiceCardProps) => {
  return (
    <Card 
      className={cn(
        "transition-all hover:shadow-md",
        onClick && "cursor-pointer"
      )}
      onClick={onClick}
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
                <span className="text-xs font-medium text-primary whitespace-nowrap">
                  {formatDistance(distance)}
                </span>
              )}
            </div>
            
            <p className="text-xs text-muted-foreground mb-1">
              {serviceLabels[serviceType] || "Serviço Público"}
            </p>
            
            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
              <MapPin className="w-3 h-3" />
              <span className="line-clamp-1">{address}, {district}</span>
            </div>
            
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
