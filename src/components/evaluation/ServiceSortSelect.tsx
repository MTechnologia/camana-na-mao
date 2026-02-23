import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type ServiceSortOption = "distance" | "rating";

interface ServiceSortSelectProps {
  value: ServiceSortOption;
  onValueChange: (value: ServiceSortOption) => void;
}

const options: { value: ServiceSortOption; label: string }[] = [
  { value: "distance", label: "Mais perto primeiro" },
  { value: "rating", label: "Melhor avaliados primeiro" },
];

export const ServiceSortSelect = ({ value, onValueChange }: ServiceSortSelectProps) => {
  return (
    <div className="flex items-center gap-2">
      <Label htmlFor="service-sort" className="text-sm text-muted-foreground whitespace-nowrap">
        Ordenar:
      </Label>
      <Select value={value} onValueChange={(v) => onValueChange(v as ServiceSortOption)}>
        <SelectTrigger id="service-sort" className="w-[200px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
