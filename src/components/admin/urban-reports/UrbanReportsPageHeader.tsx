import type { ReactNode } from 'react';
import { AdminLiveIndicator } from '@/components/admin/AdminLiveIndicator';
import { ParameterInfoListTrigger } from '@/components/admin/analytics/ParameterInfoTrigger';
import type { ParameterLegendItem } from '@/lib/analyticsParameterLegends';
import { useGlobalFilters } from '@/contexts/AnalyticsFiltersContext';

type UrbanReportsPageHeaderProps = {
  title: string;
  legends: ParameterLegendItem[];
  ariaLabel: string;
  actions?: ReactNode;
};

export function UrbanReportsPageHeader({
  title,
  legends,
  ariaLabel,
  actions,
}: UrbanReportsPageHeaderProps) {
  const { lastRecalcAt } = useGlobalFilters();

  return (
    <header className="border-b border-border pb-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            Câmara na Mão · Gestão · Relatos urbanos
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-[1.65rem]">
              {title}
            </h1>
            <ParameterInfoListTrigger
              items={legends}
              tooltipTitle="Sobre esta tela"
              ariaLabel={ariaLabel}
              className="h-5 w-5 shrink-0 text-[11px]"
            />
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2 lg:pt-1">
          <AdminLiveIndicator lastUpdate={lastRecalcAt} />
          {actions}
        </div>
      </div>
    </header>
  );
}
