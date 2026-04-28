import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { EquipmentNatureFilterValue } from "@/hooks/useNearbyServices";

interface EquipmentNatureFilterChipsProps {
  value: EquipmentNatureFilterValue;
  onChange: (value: EquipmentNatureFilterValue) => void;
  label?: string;
}

const options: { value: EquipmentNatureFilterValue; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "publico", label: "Públicos" },
  { value: "privado", label: "Privados" },
];

export function EquipmentNatureFilterChips({
  value,
  onChange,
  label = "Natureza:",
}: EquipmentNatureFilterChipsProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm text-muted-foreground shrink-0">{label}</span>
      {options.map((option) => (
        <Badge
          key={option.value}
          variant={value === option.value ? "default" : "outline"}
          className={cn(
            "cursor-pointer whitespace-nowrap transition-all",
            value === option.value ? "bg-primary text-primary-foreground" : "hover:bg-secondary",
          )}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </Badge>
      ))}
    </div>
  );
}
