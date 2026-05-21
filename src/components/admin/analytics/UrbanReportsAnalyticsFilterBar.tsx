import { RotateCcw } from 'lucide-react';
import { DataExportTrigger } from '@/components/analytics/DataExportTrigger';
import { AnalyticsLiveBadge } from '@/components/analytics/AnalyticsLiveBadge';
import { ParameterInfoListTrigger } from '@/components/admin/analytics/ParameterInfoTrigger';
import { Button } from '@/components/ui/button';
import { useUrbanReportsAnalyticsFilters } from '@/contexts/UrbanReportsAnalyticsFiltersContext';
import { URBAN_ANALYTICS_FILTER_LEGENDS } from '@/lib/analyticsParameterLegends';
import {
  URBAN_ANALYTICS_CATEGORY_OPTIONS,
  URBAN_ANALYTICS_PERIOD_OPTIONS,
  URBAN_ANALYTICS_STATUS_OPTIONS,
} from '@/lib/urbanReportsAnalyticsFilterOptions';
import { dataExportFiltersFromUrbanAnalytics } from '@/lib/buildDataExportFilters';
import { cn } from '@/lib/utils';

const selectClass = cn(
  'h-9 min-w-0 rounded-md border border-input bg-background px-2 text-sm text-foreground',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
);

export function UrbanReportsAnalyticsFilterBar() {
  const {
    period,
    category,
    status,
    chipLabels,
    setPeriod,
    setCategory,
    setStatus,
    reset,
    lastUpdate,
    refresh,
    isLoading,
  } = useUrbanReportsAnalyticsFilters();

  const periodLabel =
    URBAN_ANALYTICS_PERIOD_OPTIONS.find((p) => p.value === period)?.label ?? 'Período';
  const recorteSummary = chipLabels.join(' · ');
  const exportFilters = dataExportFiltersFromUrbanAnalytics(period, category, status);

  return (
    <div
      className="mb-4 rounded-xl border border-border bg-muted/30 px-3 py-2.5 md:px-4"
      role="region"
      aria-label="Recorte da análise de relatos urbanos"
    >
      <div className="flex flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <ParameterInfoListTrigger
            items={URBAN_ANALYTICS_FILTER_LEGENDS}
            tooltipTitle="Recorte desta página"
            ariaLabel="Ajuda sobre período, categoria e status"
          />
          <select
            id="urban-analytics-period"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className={cn(selectClass, 'min-w-[8.25rem] max-w-[11.5rem]')}
            aria-label="Período"
            title={periodLabel}
          >
            {URBAN_ANALYTICS_PERIOD_OPTIONS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
          <select
            id="urban-analytics-category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className={cn(selectClass, 'max-w-[10rem]')}
            aria-label="Categoria"
          >
            {URBAN_ANALYTICS_CATEGORY_OPTIONS.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
          <select
            id="urban-analytics-status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className={cn(selectClass, 'max-w-[10.5rem]')}
            aria-label="Status do relato"
          >
            {URBAN_ANALYTICS_STATUS_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
          <Button type="button" variant="outline" size="sm" className="h-9 gap-1.5" onClick={reset}>
            <RotateCcw className="h-3.5 w-3.5" aria-hidden />
            Redefinir
          </Button>
          <DataExportTrigger
            className="h-9 shrink-0"
            defaultFilters={exportFilters}
            defaultDataset="urban_reports"
            label="Exportar"
          />
          <AnalyticsLiveBadge
            className="shrink-0"
            lastUpdates={[lastUpdate]}
            onRefresh={refresh}
            refreshing={isLoading}
          />
        </div>
        <p className="truncate text-[11px] text-muted-foreground" title={recorteSummary}>
          {recorteSummary}
        </p>
      </div>
    </div>
  );
}
