import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { SEVERITY_CONFIG } from "@/components/citizen/CitizenSeverityBadge";

interface Filters {
  category: string | null;
  severity: string | null;
  district: string | null;
}

interface ReportFiltersProps {
  filters: Filters;
  onFilterChange: (filters: Filters) => void;
}

const categories = [
  { value: "iluminacao", label: "Iluminação" },
  { value: "calcada", label: "Calçada" },
  { value: "via", label: "Via Pública" },
  { value: "lixo", label: "Lixo e Limpeza" },
  { value: "verde", label: "Área Verde" },
  { value: "outro", label: "Outro" },
];

const severities = [
  { value: "low", label: "Baixa" },
  { value: "medium", label: "Média" },
  { value: "high", label: "Alta" },
  { value: "critical", label: "Crítica" },
];

export const ReportFilters = ({ filters, onFilterChange }: ReportFiltersProps) => {
  const hasActiveFilters = filters.category || filters.severity || filters.district;

  const clearFilters = () => {
    onFilterChange({ category: null, severity: null, district: null });
  };

  const toggleCategory = (category: string) => {
    onFilterChange({
      ...filters,
      category: filters.category === category ? null : category,
    });
  };

  const toggleSeverity = (severity: string) => {
    onFilterChange({
      ...filters,
      severity: filters.severity === severity ? null : severity,
    });
  };

  return (
    <div className="space-y-4 pb-4 border-b border-border">
      {hasActiveFilters && (
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Filtros ativos</span>
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="w-4 h-4 mr-1" />
            Limpar
          </Button>
        </div>
      )}

      {/* Categorias */}
      <div className="space-y-2">
        <span className="text-xs font-medium text-muted-foreground">Por tema</span>
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => (
            <Badge
              key={cat.value}
              variant={filters.category === cat.value ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => toggleCategory(cat.value)}
            >
              {cat.label}
            </Badge>
          ))}
        </div>
      </div>

      {/* Gravidade */}
      <div className="space-y-2">
        <span className="text-xs font-medium text-muted-foreground">Por criticidade</span>
        <div className="flex flex-wrap gap-2">
          {severities.map((sev) => {
            const config = SEVERITY_CONFIG[sev.value];
            const isActive = filters.severity === sev.value;
            const Icon = config?.icon;
            const colorClass = config?.color ?? "bg-muted text-muted-foreground border-border";
            return (
              <Badge
                key={sev.value}
                variant="outline"
                className={`cursor-pointer transition-all inline-flex items-center gap-1.5 ${
                  isActive ? colorClass : `${colorClass} opacity-60 hover:opacity-100`
                }`}
                onClick={() => toggleSeverity(sev.value)}
              >
                {Icon && <Icon className="h-3 w-3" aria-hidden />}
                {sev.label}
              </Badge>
            );
          })}
        </div>
      </div>
    </div>
  );
};
