import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { transportProblems } from "@/data/transportProblems";
import { SEVERITY_CONFIG } from "@/components/citizen/CitizenSeverityBadge";

export type TransportReportFiltersState = {
  report_type: string | null;
  severity: string | null;
  status: string | null;
};

interface Props {
  filters: TransportReportFiltersState;
  onFilterChange: (filters: TransportReportFiltersState) => void;
}

/** Tipos além dos chips padrão (ex.: condução usada no fluxo IA). */
const EXTRA_REPORT_TYPES: { value: string; label: string }[] = [
  { value: "conducao", label: "Condução" },
];

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "pending", label: "Pendente" },
  { value: "in_progress", label: "Em andamento" },
  { value: "resolved", label: "Resolvido" },
  { value: "rejected", label: "Rejeitado" },
];

const TRANSPORT_SEVERITY_VALUES = ["critica", "alta", "media", "baixa"] as const;

export function TransportReportFilters({ filters, onFilterChange }: Props) {
  const hasActive =
    filters.report_type != null || filters.severity != null || filters.status != null;

  const clearFilters = () => {
    onFilterChange({ report_type: null, severity: null, status: null });
  };

  const toggleType = (value: string) => {
    onFilterChange({
      ...filters,
      report_type: filters.report_type === value ? null : value,
    });
  };

  const toggleSeverity = (value: string) => {
    onFilterChange({
      ...filters,
      severity: filters.severity === value ? null : value,
    });
  };

  const toggleStatus = (value: string) => {
    onFilterChange({
      ...filters,
      status: filters.status === value ? null : value,
    });
  };

  const problemChips = [
    ...transportProblems.map((p) => ({ value: p.id, label: p.label })),
    ...EXTRA_REPORT_TYPES.filter(
      (e) => !transportProblems.some((p) => p.id === e.value),
    ),
  ];

  return (
    <div className="space-y-4 pb-4 border-b border-border">
      {hasActive && (
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Filtros ativos</span>
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="w-4 h-4 mr-1" />
            Limpar
          </Button>
        </div>
      )}

      <div className="space-y-2">
        <span className="text-xs font-medium text-muted-foreground">Por tipo de problema</span>
        <div className="flex flex-wrap gap-2">
          {problemChips.map((c) => (
            <Badge
              key={c.value}
              variant={filters.report_type === c.value ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => toggleType(c.value)}
            >
              {c.label}
            </Badge>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <span className="text-xs font-medium text-muted-foreground">Por criticidade</span>
        <div className="flex flex-wrap gap-2">
          {TRANSPORT_SEVERITY_VALUES.map((sev) => {
            const config = SEVERITY_CONFIG[sev];
            const isActive = filters.severity === sev;
            const Icon = config?.icon;
            const colorClass = config?.color ?? "bg-muted text-muted-foreground border-border";
            return (
              <Badge
                key={sev}
                variant="outline"
                className={`cursor-pointer transition-all inline-flex items-center gap-1.5 ${
                  isActive ? colorClass : `${colorClass} opacity-60 hover:opacity-100`
                }`}
                onClick={() => toggleSeverity(sev)}
              >
                {Icon && <Icon className="h-3 w-3" aria-hidden />}
                {config?.label ?? sev}
              </Badge>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <span className="text-xs font-medium text-muted-foreground">Por status</span>
        <div className="flex flex-wrap gap-2">
          {STATUS_OPTIONS.map((s) => (
            <Badge
              key={s.value}
              variant={filters.status === s.value ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => toggleStatus(s.value)}
            >
              {s.label}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
}
