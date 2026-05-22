import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Map } from 'lucide-react';
import { EquipmentRatingsDataTable } from '@/components/admin/equipment-ratings/EquipmentRatingsDataTable';
import { EquipmentRatingsExploreLinks } from '@/components/admin/equipment-ratings/EquipmentRatingsExploreLinks';
import { PageUsageGuideFooter } from '@/components/admin/guide/PageUsageGuideFooter';
import { EQUIPMENT_RATINGS_PAGE_LEGENDS } from '@/lib/analyticsParameterLegends';
import { EquipmentRatingsKpiStrip } from '@/components/admin/equipment-ratings/EquipmentRatingsKpiStrip';
import { EquipmentRatingsPageHeader } from '@/components/admin/equipment-ratings/EquipmentRatingsPageHeader';
import {
  EquipmentRatingsQueueToolbar,
  type EquipmentRatingsStatusTab,
} from '@/components/admin/equipment-ratings/EquipmentRatingsQueueToolbar';
import { EquipmentRatingsSubNav } from '@/components/admin/equipment-ratings/EquipmentRatingsSubNav';
import { Button } from '@/components/ui/button';
import { useEquipmentRatingsAdmin } from '@/hooks/useEquipmentRatingsAdmin';
import { toast } from 'sonner';

export function EquipmentRatingsPage() {
  const { rows, kpis, loading, search, setSearch, refresh, moderate } = useEquipmentRatingsAdmin();
  const [statusTab, setStatusTab] = useState<EquipmentRatingsStatusTab>('all');

  const filteredByStatus = useMemo(() => {
    if (statusTab === 'all') return rows;
    return rows.filter((r) => r.publication_status === statusTab);
  }, [rows, statusTab]);

  const onModerate = async (id: string, status: 'published' | 'rejected') => {
    try {
      await moderate(id, status);
      toast.success(status === 'published' ? 'Avaliação publicada.' : 'Avaliação rejeitada.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Não foi possível atualizar.');
    }
  };

  return (
    <div className="flex w-full min-w-0 flex-col gap-6 lg:gap-8">
      <EquipmentRatingsPageHeader
        title="Gestão de avaliações"
        actions={
          <Button variant="outline" size="sm" className="gap-1.5 shadow-sm" asChild>
            <Link to="/admin/reports-heatmap?metric=avaliacoes">
              <Map className="h-3.5 w-3.5" aria-hidden />
              Mapa de concentração
            </Link>
          </Button>
        }
      />

      <EquipmentRatingsSubNav />

      <EquipmentRatingsKpiStrip kpis={kpis} loading={loading} />

      <section
        aria-label="Fila de avaliações"
        className="overflow-hidden rounded-xl border border-border/80 bg-card shadow-sm"
      >
        <div className="px-4 pt-4 md:px-5">
          <EquipmentRatingsQueueToolbar
            statusTab={statusTab}
            onStatusTabChange={setStatusTab}
            search={search}
            onSearchChange={setSearch}
            resultCount={filteredByStatus.length}
            loading={loading}
            onRefresh={() => void refresh()}
          />
        </div>
        <EquipmentRatingsDataTable
          rows={filteredByStatus}
          loading={loading}
          embedded
          onModerate={(id, status) => void onModerate(id, status)}
        />
      </section>

      <PageUsageGuideFooter
        items={EQUIPMENT_RATINGS_PAGE_LEGENDS}
        pageName="Gestão de avaliações"
      >
        <EquipmentRatingsExploreLinks />
      </PageUsageGuideFooter>
    </div>
  );
}
