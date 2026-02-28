import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Filter, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type ServiceTypeFilterValue =
  | "ubs"
  | "school"
  | "ceu"
  | "hospital"
  | "library"
  | "sports_center"
  | "street_market"
  | "community_center"
  | "daycare"
  | "park"
  | "market"
  | "city_market"
  | "theater"
  | "museum"
  | "social_assistance"
  | "transit_station"
  | "police_station"
  | "cemetery"
  | "accessibility"
  | "recycling_point"
  | "fire_station";

interface ServiceTypeFilterProps {
  selectedTypes: ServiceTypeFilterValue[];
  onTypesChange: (types: ServiceTypeFilterValue[]) => void;
}

const SERVICE_TYPES: { value: ServiceTypeFilterValue; label: string; icon: string }[] = [
  { value: "ubs", label: "UBS", icon: "🏥" },
  { value: "school", label: "Escolas", icon: "🏫" },
  { value: "ceu", label: "CEUs", icon: "🎭" },
  { value: "hospital", label: "Hospitais", icon: "🏥" },
  { value: "library", label: "Bibliotecas", icon: "📚" },
  { value: "sports_center", label: "Esportes", icon: "⚽" },
  { value: "street_market", label: "Feiras", icon: "🛒" },
  { value: "community_center", label: "Centros Comunitários", icon: "🏘️" },
  { value: "daycare", label: "Creches", icon: "🍼" },
  { value: "park", label: "Parques", icon: "🌳" },
  { value: "market", label: "Mercados", icon: "🛒" },
  { value: "city_market", label: "Mercados Municipais", icon: "🏪" },
  { value: "theater", label: "Teatro/Cinema", icon: "🎬" },
  { value: "museum", label: "Museus", icon: "🏛️" },
  { value: "social_assistance", label: "Assistência Social", icon: "🤝" },
  { value: "transit_station", label: "Transporte", icon: "🚌" },
  { value: "police_station", label: "Delegacia/Polícia", icon: "🚔" },
  { value: "cemetery", label: "Cemitério", icon: "🪦" },
  { value: "accessibility", label: "Acessibilidade", icon: "♿" },
  { value: "recycling_point", label: "Reciclagem/Limpeza", icon: "♻️" },
  { value: "fire_station", label: "Bombeiros", icon: "🚒" },
];

export const ServiceTypeFilter = ({ selectedTypes, onTypesChange }: ServiceTypeFilterProps) => {
  const toggle = (value: ServiceTypeFilterValue, checked: boolean) => {
    if (checked) {
      onTypesChange([...selectedTypes, value]);
    } else {
      onTypesChange(selectedTypes.filter((t) => t !== value));
    }
  };

  const label =
    selectedTypes.length === 0
      ? "Tipos de serviço"
      : selectedTypes.length === 1
        ? SERVICE_TYPES.find((t) => t.value === selectedTypes[0])?.label ?? "1 tipo"
        : `${selectedTypes.length} tipos`;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Filter className="w-4 h-4" />
          {label}
          <ChevronDown className="w-4 h-4 opacity-70" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-[70vh] overflow-y-auto min-w-[380px]">
        <DropdownMenuLabel>Filtrar por tipo (multiseleção)</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="grid grid-cols-2 gap-0 p-1">
          {SERVICE_TYPES.map((type) => (
            <DropdownMenuCheckboxItem
              key={type.value}
              checked={selectedTypes.includes(type.value)}
              onCheckedChange={(checked) => toggle(type.value, !!checked)}
              onSelect={(e) => e.preventDefault()}
            >
              <span className="mr-2" aria-hidden="true">
                {type.icon}
              </span>
              {type.label}
            </DropdownMenuCheckboxItem>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
