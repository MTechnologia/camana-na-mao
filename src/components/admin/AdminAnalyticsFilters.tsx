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
        <h2 className="text-sm font-semibold leading-none text-white">Recorte</h2>
        <ParameterInfoListTrigger
          items={FILTER_PARAMETER_LEGENDS}
          tooltipTitle="Recorte e parâmetros"
          ariaLabel="Ajuda sobre o recorte analítico"
          className="h-5 w-5 shrink-0 border-white/35 bg-white/15 text-[11px] text-white hover:border-white/55 hover:bg-white/25 hover:text-white"
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
          'h-9 w-full shrink-0 border border-white/25 bg-white/5 px-3 text-white sm:w-auto',
          'hover:border-white/40 hover:bg-white/12 hover:text-white',
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
