import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';
import { PublicHearingsExploreLinks } from '@/components/admin/public-hearings/PublicHearingsExploreLinks';
import { PageUsageGuideFooter } from '@/components/admin/guide/PageUsageGuideFooter';
import { PUBLIC_HEARINGS_PAGE_LEGENDS } from '@/lib/analyticsParameterLegends';
import { PublicHearingsKpiStrip } from '@/components/admin/public-hearings/PublicHearingsKpiStrip';
import { PublicHearingsList } from '@/components/admin/public-hearings/PublicHearingsList';
import { PublicHearingsPageHeader } from '@/components/admin/public-hearings/PublicHearingsPageHeader';
import {
  PublicHearingsQueueToolbar,
  type PublicHearingsListTab,
} from '@/components/admin/public-hearings/PublicHearingsQueueToolbar';
import { PublicHearingsSubNav } from '@/components/admin/public-hearings/PublicHearingsSubNav';
import { Button } from '@/components/ui/button';
import { useGlobalFilters } from '@/contexts/AnalyticsFiltersContext';
import { globalFiltersToAudiencias } from '@/lib/globalFiltersToAudiencias';
import { useAudienciasAnalytics } from '@/hooks/useAudienciasAnalytics';

function filterBySearch<T extends { titulo: string; comissao: string | null; zona: string }>(
  items: T[],
  q: string,
): T[] {
  const needle = q.trim().toLowerCase();
  if (!needle) return items;
  return items.filter((a) => {
    const hay = `${a.titulo} ${a.comissao ?? ''} ${a.zona}`.toLowerCase();
    return hay.includes(needle);
  });
}

export function PublicHearingsPage() {
  const { period, region } = useGlobalFilters();
  const filters = useMemo(() => globalFiltersToAudiencias(period, region), [period, region]);
  const { stats, isLoading, isRefreshing, error, refresh } = useAudienciasAnalytics(filters);
  const busy = isLoading || isRefreshing;

  const [listTab, setListTab] = useState<PublicHearingsListTab>('top');
  const [search, setSearch] = useState('');

  const listForTab = useMemo(() => {
    if (listTab === 'zero') return stats.zeroInscritosProximas;
    if (listTab === 'low') return stats.baixaOcupacaoProximas;
    return stats.topAudiencias;
  }, [listTab, stats.topAudiencias, stats.zeroInscritosProximas, stats.baixaOcupacaoProximas]);

  const filteredList = useMemo(
    () => filterBySearch(listForTab, search),
    [listForTab, search],
  );

  return (
    <div className="flex w-full min-w-0 flex-col gap-6 lg:gap-8">
      <PublicHearingsPageHeader
        title="Gestão de audiências"
        actions={
          <Button variant="outline" size="sm" className="gap-1.5 shadow-sm" asChild>
            <Link to="/audiencias">
              <ExternalLink className="h-3.5 w-3.5" aria-hidden />
              App cidadão
            </Link>
          </Button>
        }
      />

      <PublicHearingsSubNav />

      <PublicHearingsKpiStrip stats={stats} loading={isLoading} />

      {error ? (
        <p
          className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive"
          role="alert"
        >
          {error}
        </p>
      ) : null}

      <section
        aria-label="Lista de audiências"
        className="overflow-hidden rounded-xl border border-border/80 bg-card shadow-sm"
      >
        <div className="border-b border-border/80 bg-muted/30 px-4 py-3 md:px-5">
          <p className="text-sm font-semibold text-foreground">Audiências no recorte</p>
          <p className="text-xs text-muted-foreground">
            Engajamento combinado: lembretes, videoconferência e manifestações escritas.
          </p>
        </div>

        <div className="px-4 pt-4 md:px-5">
          <PublicHearingsQueueToolbar
            listTab={listTab}
            onListTabChange={setListTab}
            search={search}
            onSearchChange={setSearch}
            resultCount={filteredList.length}
            loading={busy}
            onRefresh={() => void refresh()}
          />
        </div>

        <PublicHearingsList items={filteredList} loading={isLoading} embedded />
      </section>

      <PageUsageGuideFooter
        items={PUBLIC_HEARINGS_PAGE_LEGENDS}
        pageName="Gestão de audiências"
      >
        <PublicHearingsExploreLinks />
      </PageUsageGuideFooter>
    </div>
  );
}
