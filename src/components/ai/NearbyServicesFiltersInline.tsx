import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MapPin, Star, Search } from "lucide-react";

const RADIUS_OPTIONS = [
  { value: 500, label: "500m" },
  { value: 1000, label: "1km" },
  { value: 5000, label: "5km" },
  { value: 10000, label: "10km" },
] as const;

const RATING_OPTIONS = [
  { value: "all" as const, label: "Todas" },
  { value: 4 as const, label: "4+ estrelas" },
  { value: 3 as const, label: "3+ estrelas" },
  { value: 2 as const, label: "2+ estrelas" },
];

export type MinRatingFilter = "all" | 4 | 3 | 2;

export interface NearbyFiltersValues {
  radiusMeters: number;
  minRating: MinRatingFilter;
  searchQuery: string;
}

interface NearbyServicesFiltersInlineProps {
  /** Valores iniciais (ex.: vindos do backend ou padrão) */
  defaultRadius?: number;
  defaultMinRating?: MinRatingFilter;
  defaultSearchQuery?: string;
  onApply: (filters: NearbyFiltersValues) => void;
}

export const NearbyServicesFiltersInline = ({
  defaultRadius = 5000,
  defaultMinRating = "all",
  defaultSearchQuery = "",
  onApply,
}: NearbyServicesFiltersInlineProps) => {
  const [radiusMeters, setRadiusMeters] = useState(defaultRadius);
  const [minRating, setMinRating] = useState<MinRatingFilter>(defaultMinRating);
  const [searchQuery, setSearchQuery] = useState(defaultSearchQuery);

  const handleApply = () => {
    onApply({ radiusMeters, minRating, searchQuery: searchQuery.trim() });
  };

  return (
    <div className="mt-3 w-full max-w-md space-y-3 rounded-lg border border-border/60 bg-muted/20 p-3">
      <p className="text-xs font-medium text-foreground">Filtros (igual ao Perto de você)</p>

      <div>
        <div className="flex items-center gap-2 mb-1.5 text-xs text-muted-foreground">
          <MapPin className="h-3.5 w-3.5 shrink-0" />
          <span>Raio de busca</span>
        </div>
        <div className="flex gap-2 flex-wrap">
          {RADIUS_OPTIONS.map((opt) => (
            <Button
              key={opt.value}
              variant={radiusMeters === opt.value ? "default" : "outline"}
              size="sm"
              className="flex-1 min-w-0 text-xs"
              onClick={() => setRadiusMeters(opt.value)}
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-1.5 text-xs text-muted-foreground">
          <Star className="h-3.5 w-3.5 shrink-0 text-amber-500" />
          <span>Avaliação mínima</span>
        </div>
        <div className="flex gap-2 flex-wrap">
          {RATING_OPTIONS.map((opt) => (
            <Button
              key={String(opt.value)}
              variant={minRating === opt.value ? "default" : "outline"}
              size="sm"
              className="flex-1 min-w-0 text-xs"
              onClick={() => setMinRating(opt.value)}
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-1.5 text-xs text-muted-foreground">
          <Search className="h-3.5 w-3.5 shrink-0" />
          <span>Busca por nome, endereço ou bairro</span>
        </div>
        <Input
          placeholder="Ex.: Vila Dalva, Centro..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-8 text-sm"
          onKeyDown={(e) => e.key === "Enter" && handleApply()}
        />
      </div>

      <Button size="sm" className="w-full" onClick={handleApply}>
        Aplicar filtros
      </Button>
    </div>
  );
};

export default NearbyServicesFiltersInline;
