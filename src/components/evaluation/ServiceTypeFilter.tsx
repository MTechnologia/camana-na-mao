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
import { ServiceTypeIcon } from "@/components/icons";

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
  | "bicycle"
  | "subprefeitura"
  | "police_station"
  | "cemetery"
  | "accessibility"
  | "recycling_point"
  | "fire_station";

interface ServiceTypeFilterProps {
  selectedTypes: ServiceTypeFilterValue[];
  onTypesChange: (types: ServiceTypeFilterValue[]) => void;
}

const SERVICE_TYPES: { value: ServiceTypeFilterValue; label: string }[] = [
  { value: "ubs", label: "UBS" },
  { value: "school", label: "Escolas" },
  { value: "ceu", label: "CEUs" },
  { value: "hospital", label: "Hospitais" },
  { value: "library", label: "Bibliotecas" },
  { value: "sports_center", label: "Esportes" },
  { value: "street_market", label: "Feiras" },
  { value: "community_center", label: "Centros Comunitários" },
  { value: "daycare", label: "Creches" },
  { value: "park", label: "Parques" },
  { value: "market", label: "Mercados" },
  { value: "city_market", label: "Mercados Municipais" },
  { value: "theater", label: "Teatro/Cinema" },
  { value: "museum", label: "Museus" },
  { value: "social_assistance", label: "Assistência Social" },
  { value: "transit_station", label: "Transporte" },
  { value: "bicycle", label: "Bicicletários" },
  { value: "subprefeitura", label: "Subprefeituras" },
  { value: "police_station", label: "Delegacia/Polícia" },
  { value: "cemetery", label: "Cemitério" },
  { value: "accessibility", label: "Acessibilidade" },
  { value: "recycling_point", label: "Reciclagem/Limpeza" },
  { value: "fire_station", label: "Bombeiros" },
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
              <ServiceTypeIcon serviceType={type.value} className="mr-2 text-foreground" size={20} />
              {type.label}
            </DropdownMenuCheckboxItem>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
