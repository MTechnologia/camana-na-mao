import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type ServiceType = "all" | "ubs" | "school" | "ceu" | "hospital" | "library" | "sports_center";

interface ServiceTypeFilterProps {
  selectedType: ServiceType;
  onTypeChange: (type: ServiceType) => void;
}

const serviceTypes: { value: ServiceType; label: string; icon: string }[] = [
  { value: "all", label: "Todos", icon: "🔍" },
  { value: "ubs", label: "UBS", icon: "🏥" },
  { value: "school", label: "Escolas", icon: "🏫" },
  { value: "ceu", label: "CEUs", icon: "🎭" },
  { value: "hospital", label: "Hospitais", icon: "🏥" },
  { value: "library", label: "Bibliotecas", icon: "📚" },
  { value: "sports_center", label: "Esportes", icon: "⚽" },
];

export const ServiceTypeFilter = ({ selectedType, onTypeChange }: ServiceTypeFilterProps) => {
  return (
    <div className="overflow-x-auto pb-2 -mx-4 px-4">
      <div className="flex gap-2 min-w-max">
        {serviceTypes.map((type) => (
          <Badge
            key={type.value}
            variant={selectedType === type.value ? "default" : "outline"}
            className={cn(
              "cursor-pointer whitespace-nowrap transition-all",
              selectedType === type.value 
                ? "bg-primary text-primary-foreground" 
                : "hover:bg-secondary"
            )}
            onClick={() => onTypeChange(type.value)}
          >
            <span className="mr-1" aria-hidden="true">{type.icon}</span>
            {type.label}
          </Badge>
        ))}
      </div>
    </div>
  );
};
