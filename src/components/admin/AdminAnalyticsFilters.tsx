import { RotateCcw } from 'lucide-react';
import { useGlobalFilters } from '@/contexts/AnalyticsFiltersContext';
import { ParameterInfoListTrigger } from '@/components/admin/analytics/ParameterInfoTrigger';
import { Button } from '@/components/ui/button';
import { FILTER_PARAMETER_LEGENDS } from '@/lib/analyticsParameterLegends';
import {
  CATEGORY_FILTER_OPTIONS,
  PERIOD_FILTER_OPTIONS,
  REGION_FILTER_OPTIONS,
} from '@/lib/globalFilterOptions';
import { cn } from '@/lib/utils';
import { AdminAnalyticsFilterSelect } from './AdminAnalyticsFilterSelect';

export function AdminAnalyticsFilters() {
  const { period, region, category, setPeriod, setRegion, setCategory, reset } = useGlobalFilters();

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-2 md:flex-row md:items-center md:gap-3 lg:gap-4">
      <div className="flex shrink-0 items-center gap-1.5 md:pr-1">
        <h2 className="text-sm font-semibold leading-none text-sidebar-foreground">Recorte</h2>
        <ParameterInfoListTrigger
          items={FILTER_PARAMETER_LEGENDS}
          tooltipTitle="Recorte e parâmetros"
          ariaLabel="Informações sobre o recorte analítico"
          className="text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground"
        />
      </div>

      <div
        className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:gap-2 md:gap-3"
        role="group"
        aria-label="Parâmetros do recorte"
      >
        <AdminAnalyticsFilterSelect
          id="uaf-period"
          label="Período"
          value={period}
          onValueChange={setPeriod}
          options={PERIOD_FILTER_OPTIONS}
        />
        <AdminAnalyticsFilterSelect
          id="uaf-region"
          label="Região"
          value={region}
          onValueChange={setRegion}
          options={REGION_FILTER_OPTIONS}
        />
        <AdminAnalyticsFilterSelect
          id="uaf-category"
          label="Categoria"
          value={category}
          onValueChange={setCategory}
          options={CATEGORY_FILTER_OPTIONS}
        />
      </div>

      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={cn(
          'h-9 w-full shrink-0 border border-sidebar-border bg-sidebar-accent/50 px-3 text-sidebar-foreground sm:w-auto',
          'hover:bg-sidebar-accent hover:text-sidebar-foreground',
          'md:ml-auto',
        )}
        onClick={reset}
      >
        <RotateCcw className="h-3.5 w-3.5" aria-hidden />
        <span className="ml-1.5 text-xs font-medium">Limpar</span>
      </Button>
    </div>
  );
}
