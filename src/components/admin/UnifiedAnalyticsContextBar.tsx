import { RefreshCw, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { useGlobalFilters } from '@/contexts/AnalyticsFiltersContext';
import { ParameterInfoListTrigger } from '@/components/admin/analytics/ParameterInfoTrigger';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { FILTER_PARAMETER_LEGENDS } from '@/lib/analyticsParameterLegends';
import {
  CATEGORY_FILTER_OPTIONS,
  globalFilterChipLabels,
  PERIOD_FILTER_OPTIONS,
  REGION_FILTER_OPTIONS,
} from '@/lib/globalFilterOptions';
import { AdminDesktopSidebarToggle, AdminMobileMenuButton } from '@/components/admin/AdminSidebar';
import { cn } from '@/lib/utils';

const controlClass = cn(
  'h-8 min-w-0 rounded-md border-0 bg-analytics-bar-surface px-2 text-sm text-analytics-bar-control',
  'ring-1 ring-analytics-bar-border/50',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-analytics-bar-control/40',
);

const selectClass = controlClass;

export function UnifiedAnalyticsContextBar() {
  const {
    period,
    region,
    category,
    setPeriod,
    setRegion,
    setCategory,
    reset,
    lastRecalcAt,
    touchRecalc,
  } = useGlobalFilters();

  const recorteSummary = globalFilterChipLabels(period, region, category).join(' · ');
  const updatedAt = new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(lastRecalcAt);

  return (
    <div className="sticky top-0 z-20 border-b border-analytics-bar-border bg-analytics-bar px-4 py-2 shadow-sm md:px-6">
      <div className="flex flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <AdminMobileMenuButton className="text-analytics-bar-foreground hover:bg-analytics-bar-surface hover:text-analytics-bar-control" />
          <AdminDesktopSidebarToggle className="text-analytics-bar-foreground hover:bg-analytics-bar-surface hover:text-analytics-bar-control" />
          <ParameterInfoListTrigger
            items={FILTER_PARAMETER_LEGENDS}
            tooltipTitle="Recorte e parâmetros"
            ariaLabel="Ajuda sobre o recorte analítico"
            className="border-analytics-bar-control/30 bg-analytics-bar-surface text-analytics-bar-control hover:border-analytics-bar-control/50 hover:bg-analytics-bar-surface hover:text-analytics-bar-control"
          />

          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
            <select
              id="uaf-period"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className={cn(selectClass, 'max-w-[8.5rem]')}
              aria-label="Período"
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
              className={cn(selectClass, 'max-w-[9.5rem]')}
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
              className={cn(selectClass, 'max-w-[10rem]')}
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
          </div>

          <div className="flex shrink-0 items-center gap-1 border-l border-analytics-bar-border pl-2">
            <span className="hidden text-[11px] tabular-nums text-analytics-bar-muted sm:inline">
              {updatedAt}
            </span>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 bg-analytics-bar-surface text-analytics-bar-control hover:bg-analytics-bar-surface/90 hover:text-analytics-bar-control"
                  onClick={() => {
                    touchRecalc();
                    toast.success('Indicadores atualizados', {
                      description: 'Recorte recalculado.',
                    });
                  }}
                >
                  <RefreshCw className="h-4 w-4" aria-hidden />
                  <span className="sr-only">Atualizar indicadores</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" align="end" className="text-xs">
                Atualizar · última vez às {updatedAt}
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

        <p className="truncate text-[11px] text-analytics-bar-muted" title={recorteSummary}>
          {recorteSummary}
        </p>
      </div>
    </div>
  );
}
