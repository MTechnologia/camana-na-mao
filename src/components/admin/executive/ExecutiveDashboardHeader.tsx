import { Link } from 'react-router-dom';
import { ArrowUpRight, Bell } from 'lucide-react';
import { AdminLiveIndicator } from '@/components/admin/AdminLiveIndicator';
import { ParameterInfoListTrigger } from '@/components/admin/analytics/ParameterInfoTrigger';
import { Button } from '@/components/ui/button';
import { useGlobalFilters } from '@/contexts/AnalyticsFiltersContext';
import {
  EXECUTIVE_DASHBOARD_PAGE_LEGEND,
  EXECUTIVE_KPI_LEGENDS_LIST,
} from '@/lib/analyticsParameterLegends';

export function ExecutiveDashboardHeader() {
  const { lastRecalcAt } = useGlobalFilters();

  return (
    <header className="border-b border-border pb-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            Câmara na Mão · Gestão
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-[1.65rem]">
              Visão executiva
            </h1>
            <ParameterInfoListTrigger
              items={[EXECUTIVE_DASHBOARD_PAGE_LEGEND, ...EXECUTIVE_KPI_LEGENDS_LIST]}
              tooltipTitle="Sobre esta visão"
              ariaLabel="Ajuda sobre a visão executiva e indicadores"
              className="h-5 w-5 shrink-0 text-[11px]"
            />
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2 lg:pt-1">
          <AdminLiveIndicator lastUpdate={lastRecalcAt} />
          <Button asChild variant="outline" size="sm" className="gap-1.5 shadow-sm">
            <Link to="/admin/analytics">
              Análise detalhada
              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          </Button>
          <Button asChild variant="ghost" size="sm" className="gap-1.5 text-muted-foreground">
            <Link to="/admin/notifications">
              <Bell className="h-3.5 w-3.5" aria-hidden />
              <span className="hidden sm:inline">Alertas</span>
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
