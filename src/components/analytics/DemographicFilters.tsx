import { useMemo } from "react";
import { X, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface DemographicFilterState {
  gender?: string;
  race?: string;
  socialClass?: string;
  ageGroup?: string;
}

interface DemographicFiltersProps {
  filters: DemographicFilterState;
  onChange: (filters: DemographicFilterState) => void;
  loading?: boolean;
}

const GENDER_OPTIONS = [
  { value: "masculino", label: "Masculino" },
  { value: "feminino", label: "Feminino" },
  { value: "nao_binario", label: "Não-binário" },
  { value: "outro", label: "Outro" },
];

const RACE_OPTIONS = [
  { value: "branca", label: "Branca" },
  { value: "preta", label: "Preta" },
  { value: "parda", label: "Parda" },
  { value: "amarela", label: "Amarela" },
  { value: "indigena", label: "Indígena" },
];

const SOCIAL_CLASS_OPTIONS = [
  { value: "A", label: "Classe A" },
  { value: "B", label: "Classe B" },
  { value: "AB", label: "Classe AB" },
  { value: "C", label: "Classe C" },
  { value: "D", label: "Classe D" },
  { value: "E", label: "Classe E" },
];

const AGE_GROUP_OPTIONS = [
  { value: "< 18", label: "Menos de 18" },
  { value: "18-24", label: "18 a 24 anos" },
  { value: "25-34", label: "25 a 34 anos" },
  { value: "35-44", label: "35 a 44 anos" },
  { value: "45-54", label: "45 a 54 anos" },
  { value: "55-64", label: "55 a 64 anos" },
  { value: "65+", label: "65 anos ou mais" },
];

const getLabel = (options: typeof GENDER_OPTIONS, value: string | undefined): string => {
  if (!value) return "";
  return options.find((o) => o.value === value)?.label || value;
};

export function DemographicFilters({ filters, onChange, loading }: DemographicFiltersProps) {
  const activeCount = useMemo(() => {
    return [filters.gender, filters.race, filters.socialClass, filters.ageGroup].filter(Boolean)
      .length;
  }, [filters]);

  const activeFiltersText = useMemo(() => {
    const parts: string[] = [];
    if (filters.gender) parts.push(getLabel(GENDER_OPTIONS, filters.gender));
    if (filters.race) parts.push(getLabel(RACE_OPTIONS, filters.race));
    if (filters.socialClass) parts.push(getLabel(SOCIAL_CLASS_OPTIONS, filters.socialClass));
    if (filters.ageGroup) parts.push(getLabel(AGE_GROUP_OPTIONS, filters.ageGroup));
    return parts;
  }, [filters]);

  const handleChange = (key: keyof DemographicFilterState, value: string | undefined) => {
    onChange({ ...filters, [key]: value });
  };

  const clearFilter = (key: keyof DemographicFilterState) => {
    const newFilters = { ...filters };
    delete newFilters[key];
    onChange(newFilters);
  };

  const clearAll = () => {
    onChange({});
  };

  return (
    <div className="space-y-3">
      {/* Filters Row */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="h-4 w-4" />
          <span className="font-medium">Filtros Demográficos:</span>
        </div>

        <div className="flex flex-wrap gap-2">
          {/* Gender */}
          <Select
            value={filters.gender || ""}
            onValueChange={(v) => handleChange("gender", v || undefined)}
            disabled={loading}
          >
            <SelectTrigger className="w-[140px] h-9">
              <SelectValue placeholder="Gênero" />
            </SelectTrigger>
            <SelectContent>
              {GENDER_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Race */}
          <Select
            value={filters.race || ""}
            onValueChange={(v) => handleChange("race", v || undefined)}
            disabled={loading}
          >
            <SelectTrigger className="w-[130px] h-9">
              <SelectValue placeholder="Raça" />
            </SelectTrigger>
            <SelectContent>
              {RACE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Social Class */}
          <Select
            value={filters.socialClass || ""}
            onValueChange={(v) => handleChange("socialClass", v || undefined)}
            disabled={loading}
          >
            <SelectTrigger className="w-[130px] h-9">
              <SelectValue placeholder="Classe" />
            </SelectTrigger>
            <SelectContent>
              {SOCIAL_CLASS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Age Group */}
          <Select
            value={filters.ageGroup || ""}
            onValueChange={(v) => handleChange("ageGroup", v || undefined)}
            disabled={loading}
          >
            <SelectTrigger className="w-[150px] h-9">
              <SelectValue placeholder="Faixa Etária" />
            </SelectTrigger>
            <SelectContent>
              {AGE_GROUP_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Clear All Button */}
          {activeCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAll}
              className="h-9 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4 mr-1" />
              Limpar {activeCount > 1 ? `(${activeCount})` : ""}
            </Button>
          )}
        </div>
      </div>

      {/* Active Filters Chips */}
      {activeCount > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">Filtrando por:</span>
          {filters.gender && (
            <Badge variant="secondary" className="gap-1 pr-1">
              {getLabel(GENDER_OPTIONS, filters.gender)}
              <button
                onClick={() => clearFilter("gender")}
                className="ml-1 rounded-full hover:bg-muted p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {filters.race && (
            <Badge variant="secondary" className="gap-1 pr-1">
              {getLabel(RACE_OPTIONS, filters.race)}
              <button
                onClick={() => clearFilter("race")}
                className="ml-1 rounded-full hover:bg-muted p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {filters.socialClass && (
            <Badge variant="secondary" className="gap-1 pr-1">
              {getLabel(SOCIAL_CLASS_OPTIONS, filters.socialClass)}
              <button
                onClick={() => clearFilter("socialClass")}
                className="ml-1 rounded-full hover:bg-muted p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {filters.ageGroup && (
            <Badge variant="secondary" className="gap-1 pr-1">
              {getLabel(AGE_GROUP_OPTIONS, filters.ageGroup)}
              <button
                onClick={() => clearFilter("ageGroup")}
                className="ml-1 rounded-full hover:bg-muted p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
