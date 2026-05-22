import type { ReactNode } from 'react';
import { AdminLiveIndicator } from '@/components/admin/AdminLiveIndicator';
import { useGlobalFilters } from '@/contexts/AnalyticsFiltersContext';

type EquipmentRatingsPageHeaderProps = {
  title: string;
  actions?: ReactNode;
};

export function EquipmentRatingsPageHeader({ title, actions }: EquipmentRatingsPageHeaderProps) {
  const { lastRecalcAt } = useGlobalFilters();

  return (
    <header className="border-b border-border pb-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            Câmara na Mão · Gestão · Avaliações de equipamentos
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-[1.65rem]">
            {title}
          </h1>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2 lg:pt-1">
          <AdminLiveIndicator lastUpdate={lastRecalcAt} />
          {actions}
        </div>
      </div>
    </header>
  );
}
