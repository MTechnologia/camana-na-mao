import { useState } from "react";
import { RotateCcw, SlidersHorizontal } from "lucide-react";
import { DEFAULT_GLOBAL_FILTERS, useGlobalFilters } from "@/contexts/AnalyticsFiltersContext";
import { PeriodComparePicker } from "@/components/filters/PeriodComparePicker";
import { ParameterInfoListTrigger } from "@/components/admin/analytics/ParameterInfoTrigger";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { FILTER_PARAMETER_LEGENDS } from "@/lib/analyticsParameterLegends";
import {
  CATEGORY_FILTER_OPTIONS,
  globalFilterChipLabels,
  isPeriodCompareMode,
  PERIOD_FILTER_OPTIONS,
  REGION_FILTER_OPTIONS,
} from "@/lib/globalFilterOptions";
import { AdminDesktopSidebarToggle, AdminMobileMenuButton } from "@/components/admin/AdminSidebar";
import { DataExportTrigger } from "@/components/analytics/DataExportTrigger";
import { UnifiedAnalyticsLiveBadge } from "@/components/admin/UnifiedAnalyticsLiveBadge";
import { dataExportFiltersFromGlobal } from "@/lib/buildDataExportFilters";
import { cn } from "@/lib/utils";

const controlClass = cn(
  "h-8 min-w-0 rounded-md border-0 bg-analytics-bar-surface px-2 text-sm text-analytics-bar-control",
  "ring-1 ring-analytics-bar-border/50",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-analytics-bar-control/40",
);

const selectClass = controlClass;

/** Select full-width usado dentro da gaveta de filtros do mobile (tema claro). */
const sheetSelectClass = cn(
  "h-11 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
);

export function UnifiedAnalyticsContextBar() {
  const {
    period,
    region,
    category,
    setPeriod,
    setRegion,
    setCategory,
    reset,
    periodCompare,
    setPeriodCompare,
    compareActive,
  } = useGlobalFilters();
  const [filtersOpen, setFiltersOpen] = useState(false);

  const exportFilters = dataExportFiltersFromGlobal(period, region, category, periodCompare);
  const recorteSummary = globalFilterChipLabels(period, region, category).join(" · ");
  const compareMode = isPeriodCompareMode(period);
  const periodLabel = PERIOD_FILTER_OPTIONS.find((p) => p.value === period)?.label ?? "Período";

  const activeCount = [
    period !== DEFAULT_GLOBAL_FILTERS.period,
    region !== DEFAULT_GLOBAL_FILTERS.region,
    category !== DEFAULT_GLOBAL_FILTERS.category,
  ].filter(Boolean).length;

  return (
    <div className="sticky top-0 z-20 border-b border-analytics-bar-border bg-analytics-bar px-4 py-2 shadow-sm md:px-6">
      <div className="flex flex-col gap-1.5">
        <div className="flex flex-nowrap items-center gap-2 md:flex-wrap">
          <AdminMobileMenuButton className="text-analytics-bar-foreground hover:bg-analytics-bar-surface hover:text-analytics-bar-control" />
          <AdminDesktopSidebarToggle className="text-analytics-bar-foreground hover:bg-analytics-bar-surface hover:text-analytics-bar-control" />
          <ParameterInfoListTrigger
            items={FILTER_PARAMETER_LEGENDS}
            tooltipTitle="Recorte e parâmetros"
            ariaLabel="Ajuda sobre o recorte analítico"
            className="border-analytics-bar-control/30 bg-analytics-bar-surface text-analytics-bar-control hover:border-analytics-bar-control/50 hover:bg-analytics-bar-surface hover:text-analytics-bar-control"
          />

          {/* Desktop (≥ md): filtros inline na barra (layout inalterado) */}
          <div className="hidden min-w-0 flex-1 flex-wrap items-center gap-1.5 md:flex">
            <select
              id="uaf-period"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className={cn(
                selectClass,
                "shrink-0 pr-7",
                compareMode
                  ? "w-auto min-w-[13.5rem] max-w-[min(100%,17rem)]"
                  : "w-auto min-w-[8.25rem] max-w-[11.5rem]",
              )}
              aria-label="Período"
              title={periodLabel}
            >
              {PERIOD_FILTER_OPTIONS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
            <select
              id="uaf-region"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              className={cn(selectClass, "max-w-[9.5rem]")}
              aria-label="Região"
            >
              {REGION_FILTER_OPTIONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
            <select
              id="uaf-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className={cn(selectClass, "max-w-[10rem]")}
              aria-label="Categoria"
            >
              {CATEGORY_FILTER_OPTIONS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 bg-analytics-bar-surface px-2 text-analytics-bar-control hover:bg-analytics-bar-surface/90 hover:text-analytics-bar-control"
              onClick={reset}
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden />
              <span className="sr-only sm:not-sr-only sm:ml-1">Redefinir</span>
            </Button>

            <DataExportTrigger
              className="h-8 shrink-0 border-analytics-bar-border bg-analytics-bar-surface text-analytics-bar-control hover:bg-analytics-bar-surface/90"
              defaultFilters={exportFilters}
              label="Exportar"
            />
            <UnifiedAnalyticsLiveBadge className="shrink-0" />
          </div>

          {/* Mobile (< md): ações compactas — Filtros (gaveta) + Exportar + Ao vivo */}
          <div className="ml-auto flex items-center gap-1.5 md:hidden">
            <Drawer open={filtersOpen} onOpenChange={setFiltersOpen}>
              <DrawerTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-1.5 bg-analytics-bar-surface px-2.5 text-analytics-bar-control hover:bg-analytics-bar-surface/90 hover:text-analytics-bar-control"
                  aria-label="Abrir filtros do painel"
                >
                  <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden />
                  Filtros
                  {activeCount > 0 && (
                    <span
                      className="ml-0.5 inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-analytics-bar-control/20 px-1 text-[11px] font-semibold tabular-nums"
                      aria-label={`${activeCount} filtro(s) ativo(s)`}
                    >
                      {activeCount}
                    </span>
                  )}
                </Button>
              </DrawerTrigger>
              <DrawerContent>
                <DrawerHeader className="text-left">
                  <DrawerTitle>Filtros</DrawerTitle>
                  <DrawerDescription>
                    As alterações recalculam os indicadores na hora. Recorte atual: {recorteSummary}
                    {compareActive ? " · Comparação A vs B ativa" : ""}.
                  </DrawerDescription>
                </DrawerHeader>

                <div className="flex max-h-[60vh] flex-col gap-4 overflow-y-auto px-4">
                  <label
                    htmlFor="uaf-period-sheet"
                    className="flex flex-col gap-1.5 text-sm font-medium text-foreground"
                  >
                    <span>Período</span>
                    <select
                      id="uaf-period-sheet"
                      value={period}
                      onChange={(e) => setPeriod(e.target.value)}
                      className={sheetSelectClass}
                      aria-label="Período"
                    >
                      {PERIOD_FILTER_OPTIONS.map((p) => (
                        <option key={p.value} value={p.value}>
                          {p.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  {compareMode ? (
                    <div className="rounded-lg border border-border bg-muted/30 p-3">
                      <PeriodComparePicker value={periodCompare} onChange={setPeriodCompare} />
                    </div>
                  ) : null}

                  <label
                    htmlFor="uaf-region-sheet"
                    className="flex flex-col gap-1.5 text-sm font-medium text-foreground"
                  >
                    <span>Região</span>
                    <select
                      id="uaf-region-sheet"
                      value={region}
                      onChange={(e) => setRegion(e.target.value)}
                      className={sheetSelectClass}
                      aria-label="Região"
                    >
                      {REGION_FILTER_OPTIONS.map((r) => (
                        <option key={r.value} value={r.value}>
                          {r.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label
                    htmlFor="uaf-category-sheet"
                    className="flex flex-col gap-1.5 text-sm font-medium text-foreground"
                  >
                    <span>Categoria</span>
                    <select
                      id="uaf-category-sheet"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className={sheetSelectClass}
                      aria-label="Categoria"
                    >
                      {CATEGORY_FILTER_OPTIONS.map((c) => (
                        <option key={c.value} value={c.value}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <DrawerFooter className="flex-row gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 gap-1.5"
                    onClick={reset}
                    disabled={activeCount === 0}
                  >
                    <RotateCcw className="h-4 w-4" aria-hidden />
                    Redefinir
                  </Button>
                  <DrawerClose asChild>
                    <Button type="button" className="flex-1">
                      Concluído
                    </Button>
                  </DrawerClose>
                </DrawerFooter>
              </DrawerContent>
            </Drawer>

            <DataExportTrigger
              className="h-8 w-8 shrink-0 border-analytics-bar-border bg-analytics-bar-surface p-0 text-analytics-bar-control hover:bg-analytics-bar-surface/90 [&>span]:sr-only"
              defaultFilters={exportFilters}
              label="Exportar"
            />
            <UnifiedAnalyticsLiveBadge className="shrink-0" compact />
          </div>
        </div>

        <p className="truncate text-[11px] text-analytics-bar-muted" title={recorteSummary}>
          {recorteSummary}
          {compareActive ? " · Comparação A vs B ativa" : ""}
        </p>

        {/* Desktop: picker de comparação inline (no mobile ele vive dentro da gaveta) */}
        {compareMode ? (
          <div className="hidden rounded-lg border border-analytics-bar-border/60 bg-analytics-bar-surface/80 p-3 md:block">
            <PeriodComparePicker value={periodCompare} onChange={setPeriodCompare} compact />
          </div>
        ) : null}
      </div>
    </div>
  );
}
