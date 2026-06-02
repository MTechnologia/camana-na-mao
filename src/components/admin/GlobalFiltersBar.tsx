import { Filter, RotateCcw } from "lucide-react";
import { useGlobalFilters } from "@/contexts/AnalyticsFiltersContext";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ParameterLegend } from "@/components/admin/analytics/ParameterLegend";
import { FILTER_PARAMETER_LEGENDS } from "@/lib/analyticsParameterLegends";
import {
  CATEGORY_FILTER_OPTIONS,
  PERIOD_FILTER_OPTIONS,
  REGION_FILTER_OPTIONS,
} from "@/lib/globalFilterOptions";
import { AdminMobileMenuButton } from "@/components/admin/AdminSidebar";
import { cn } from "@/lib/utils";

const selectClass = cn(
  "h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
);

/** @deprecated Barra legada — rollback via USE_UNIFIED_ANALYTICS_CONTEXT_BAR = false */
export function GlobalFiltersBar() {
  const { period, region, category, setPeriod, setRegion, setCategory, reset } = useGlobalFilters();

  return (
    <div className="border-b border-border bg-card px-4 py-3 shadow-sm md:px-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <AdminMobileMenuButton />
            <Filter className="h-4 w-4 text-primary" aria-hidden />
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="cursor-help border-b border-dotted border-muted-foreground">
                  Filtros globais
                </span>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                Período, região e categoria definem o recorte de todos os indicadores.
              </TooltipContent>
            </Tooltip>
          </div>
          <p className="text-xs text-muted-foreground">
            Recálculo automático ao alterar o recorte.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <Label htmlFor="gf-period" className="text-xs text-muted-foreground">
              Período
            </Label>
            <select
              id="gf-period"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className={selectClass}
              aria-label="Período"
            >
              {PERIOD_FILTER_OPTIONS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="gf-region" className="text-xs text-muted-foreground">
              Região
            </Label>
            <select
              id="gf-region"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              className={selectClass}
              aria-label="Região"
            >
              {REGION_FILTER_OPTIONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="gf-category" className="text-xs text-muted-foreground">
              Categoria
            </Label>
            <select
              id="gf-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className={selectClass}
              aria-label="Categoria"
            >
              {CATEGORY_FILTER_OPTIONS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <Button type="button" variant="outline" className="gap-1" onClick={reset}>
            <RotateCcw className="h-3.5 w-3.5" />
            Redefinir
          </Button>
        </div>
      </div>
      <ParameterLegend
        items={FILTER_PARAMETER_LEGENDS}
        className="mt-3 border-t border-border/70 bg-muted/15 pt-3"
      />
    </div>
  );
}
