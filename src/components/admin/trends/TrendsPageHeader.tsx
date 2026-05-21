import { Link } from 'react-router-dom';
import { ArrowUpRight, LayoutDashboard, RefreshCw } from 'lucide-react';
import { AdminLiveIndicator } from '@/components/admin/AdminLiveIndicator';
import { Button } from '@/components/ui/button';
import { useGlobalFilters } from '@/contexts/AnalyticsFiltersContext';

type TrendsPageHeaderProps = {
  isLoading: boolean;
  onRefresh: () => void;
};

export function TrendsPageHeader({ isLoading, onRefresh }: TrendsPageHeaderProps) {
  const { lastRecalcAt } = useGlobalFilters();

  return (
    <header className="border-b border-border pb-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            Câmara na Mão · Gestão
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-[1.65rem]">
            Tendências temporais
          </h1>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2 lg:pt-1">
          <AdminLiveIndicator lastUpdate={lastRecalcAt} />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5 shadow-sm"
            onClick={() => void onRefresh()}
            disabled={isLoading}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} aria-hidden />
            Atualizar
          </Button>
          <Button asChild variant="outline" size="sm" className="gap-1.5 shadow-sm">
            <Link to="/admin">
              <LayoutDashboard className="h-3.5 w-3.5" aria-hidden />
              Visão executiva
            </Link>
          </Button>
          <Button asChild variant="ghost" size="sm" className="gap-1.5 text-muted-foreground">
            <Link to="/admin/analytics">
              Análise urbana
              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
